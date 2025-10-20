# PAX-Platform API Integration Testing Guide

## Overview

This guide provides detailed steps to test the integration between the PAX module and Platform API's FusionAuth JWT authentication system. Both services now share the same authentication mechanism, allowing users to authenticate once and access both services seamlessly.

## Integration Architecture

```
User → Platform API Login → FusionAuth issues JWT
                                 ↓
                          Store in client
                                 ↓
User → PAX API Request with JWT in Authorization header
                                 ↓
                   PAX validates with FusionAuth
                                 ↓
                   PAX queries user from PostgreSQL
                                 ↓
                   Request processed with user context
```

## Prerequisites

- PostgreSQL running (localhost:5432)
- FusionAuth running (localhost:9011)
- Platform API (port 3001)
- PAX API (port 3002)
- Both services configured with same FusionAuth credentials
- Both services using the **same database** (critical!)

---

## Configuration Check

### Verify Database Configuration

**CRITICAL**: Both services MUST use the same database for user sharing.

```bash
# Check PAX database
grep DATABASE_URL /home/shady/Desktop/veil/packages/pax/.env

# Check Platform API database
grep DATABASE_URL /home/shady/Desktop/veil/packages/platform-api/.env

# They should match! If not, update one to match the other.
```

### Verify FusionAuth Configuration

```bash
# Check PAX FusionAuth config
grep FUSIONAUTH_ /home/shady/Desktop/veil/packages/pax/.env

# Check Platform API FusionAuth config
grep FUSIONAUTH_ /home/shady/Desktop/veil/packages/platform-api/.env

# Credentials must be IDENTICAL for tokens to work across services
```

---

## Step 1: Fix Database Configuration (If Needed)

**Option A: Use veil_platform (recommended per docs)**
```bash
cd /home/shady/Desktop/veil/packages/platform-api
# Update .env to use veil_platform
sed -i 's/DATABASE_URL=.*/DATABASE_URL=postgresql:\/\/postgres:postgres@localhost:5432\/veil_platform/' .env
```

**Option B: Use veil_saas (use existing DB)**
```bash
cd /home/shady/Desktop/veil/packages/pax
# Update .env to use veil_saas
sed -i 's/veil_platform/veil_saas/g' .env
```

**After changing database, push schema:**
```bash
# For whichever service you changed
cd /home/shady/Desktop/veil/packages/pax  # or platform-api
bun run db:push
```

---

## Step 2: Start Required Services

### Terminal 1 - Start FusionAuth

```bash
# If using Docker Compose
cd /home/shady/Desktop/veil
docker-compose up fusionauth -d

# Verify FusionAuth is running
curl http://localhost:9011/api/status
```

### Terminal 2 - Start Platform API

```bash
cd /home/shady/Desktop/veil/packages/platform-api
bun install  # If needed
bun run db:push  # Ensure schema is up-to-date
bun run dev  # Should start on port 3001
```

**Expected output:**
```
Server running at http://localhost:3001
Swagger docs available at http://localhost:3001/swagger
```

### Terminal 3 - Start PAX

```bash
cd /home/shady/Desktop/veil/packages/pax
bun install  # If needed
bun run dev  # Should start on port 3002
```

**Expected output:**
```
Server running at http://localhost:3002
Swagger docs available at http://localhost:3002/swagger
```

---

## Step 3: Test Authentication Flow

### 3.1 Register a New User via Platform API

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "uid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User",
      "role": "user"
    },
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  }
}
```

**Save the JWT token!** You'll need it for the next steps.

### 3.2 Login (If Already Registered)

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

---

## Step 4: Test PAX with Platform API Token

### 4.1 Set Your JWT Token

```bash
# Replace with your actual token from step 3
export JWT_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 4.2 Access PAX Credit Account Endpoint

```bash
curl http://localhost:3002/api/v1/credits/account \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "balance": 0,
    "reservedBalance": 0,
    "currency": "USD",
    "createdAt": "2025-10-19T00:00:00.000Z",
    "updatedAt": "2025-10-19T00:00:00.000Z"
  }
}
```

**What happens behind the scenes:**
1. PAX extracts Bearer token from Authorization header
2. PAX validates token with FusionAuth API
3. PAX queries local user by email from FusionAuth response
4. If user doesn't exist, PAX auto-creates user record
5. PAX checks user is active
6. PAX returns credit account for the user

### 4.3 Test Credit Balance Endpoint

```bash
curl http://localhost:3002/api/v1/credits/balance \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "balance": 0,
    "reservedBalance": 0,
    "availableBalance": 0,
    "currency": "USD"
  }
}
```

### 4.4 Test Payment Creation

```bash
curl -X POST http://localhost:3002/api/v1/payments/create \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "INR",
    "notes": {
      "package": "STARTER_100"
    }
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "order_...",
    "amount": 1000,
    "currency": "INR",
    "status": "created"
  }
}
```

### 4.5 Test Credit Purchase Endpoint

```bash
curl -X POST http://localhost:3002/api/v1/credits/purchase \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": 1,
    "paymentMethod": "razorpay"
  }'
```

---

## Step 5: Verify User Auto-Creation

### 5.1 Check Users Table

```bash
psql postgresql://postgres:postgres@localhost:5432/veil_platform -c \
  "SELECT id, email, \"firstName\", \"lastName\", role, \"fusionAuthId\", \"isActive\" FROM users;"
```

**Expected output:**
```
 id |       email        | firstName | lastName | role  |     fusionAuthId      | isActive
----+--------------------+-----------+----------+-------+-----------------------+----------
  1 | test@example.com   | Test      | User     | user  | 550e8400-e29b-41d4... | t
```

**Note:** The user should have a `fusionAuthId` populated (from FusionAuth).

### 5.2 Check Credit Account Was Created

```bash
psql postgresql://postgres:postgres@localhost:5432/veil_platform -c \
  "SELECT * FROM credit_accounts WHERE \"userId\" = 1;"
```

**Expected:** A credit account exists for userId 1 with initial balance 0.

### 5.3 Verify User-Credit Account Relationship

```bash
psql postgresql://postgres:postgres@localhost:5432/veil_platform -c \
  "SELECT u.email, ca.balance, ca.currency
   FROM users u
   LEFT JOIN credit_accounts ca ON u.id = ca.\"userId\";"
```

---

## Step 6: Test Role-Based Access Control

### 6.1 Try Accessing Admin Endpoint (Should Fail)

```bash
curl http://localhost:3002/api/v1/admin/users \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected response (403 Forbidden):**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 6.2 Promote User to Admin

```bash
psql postgresql://postgres:postgres@localhost:5432/veil_platform -c \
  "UPDATE users SET role = 'admin' WHERE email = 'test@example.com';"
```

### 6.3 Test Admin Endpoint Again (Should Work)

```bash
# You may need a fresh token for the role change to take effect
# Login again to get new token with admin role
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# Use the new token
export JWT_TOKEN="new_token_here"

# Now test admin endpoint
curl http://localhost:3002/api/v1/admin/users \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected:** Success response with user list.

---

## Step 7: Test Token Expiry & Refresh

### 7.1 Verify Token (Platform API)

```bash
curl -X POST http://localhost:3001/api/v1/auth/verify-token \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$JWT_TOKEN\"}"
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "email": "test@example.com",
      "role": "user"
    }
  }
}
```

### 7.2 Refresh Token

```bash
# Get refresh token from login response
export REFRESH_TOKEN="your_refresh_token_from_login"

curl -X POST http://localhost:3001/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token...",
    "refreshToken": "new_refresh_token..."
  }
}
```

---

## Step 8: Test Error Scenarios

### 8.1 Invalid Token

```bash
curl http://localhost:3002/api/v1/credits/account \
  -H "Authorization: Bearer invalid_token_here"
```

**Expected response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### 8.2 Missing Token

```bash
curl http://localhost:3002/api/v1/credits/account
```

**Expected response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Missing or invalid authorization header"
}
```

### 8.3 Deactivated User

```bash
# Deactivate user
psql postgresql://postgres:postgres@localhost:5432/veil_platform -c \
  "UPDATE users SET \"isActive\" = false WHERE email = 'test@example.com';"

# Try accessing endpoint
curl http://localhost:3002/api/v1/credits/account \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Account is deactivated"
}
```

**Reactivate user:**
```bash
psql postgresql://postgres:postgres@localhost:5432/veil_platform -c \
  "UPDATE users SET \"isActive\" = true WHERE email = 'test@example.com';"
```

---

## Step 9: Monitor Service Logs

While testing, watch the logs in each terminal to verify the integration is working:

### Platform API Logs Should Show:
- User registration/login events
- JWT token generation
- FusionAuth API calls
- Database queries for user creation

### PAX Logs Should Show:
- Token validation with FusionAuth
- User lookup queries
- User auto-creation (on first request)
- Credit account creation
- Successful authenticated requests

**Example PAX log output:**
```
[INFO] Validating token with FusionAuth
[INFO] User test@example.com not found locally, creating...
[INFO] Created user id=1 email=test@example.com
[INFO] Created credit account for userId=1
[INFO] Request authorized for user test@example.com
```

---

## Step 10: Database Verification

### Check All Shared Tables

```bash
psql postgresql://postgres:postgres@localhost:5432/veil_platform
```

**SQL Queries:**

```sql
-- Check users table (shared)
SELECT COUNT(*) as user_count FROM users;

-- Check credit accounts (PAX-specific)
SELECT COUNT(*) as account_count FROM credit_accounts;

-- Check payment transactions (PAX-specific)
SELECT COUNT(*) as transaction_count FROM payment_transactions;

-- View user with credit account
SELECT
  u.id,
  u.email,
  u.role,
  u."fusionAuthId",
  ca.balance,
  ca.currency
FROM users u
LEFT JOIN credit_accounts ca ON u.id = ca."userId";

-- Check recent payment transactions
SELECT
  pt.id,
  pt.amount,
  pt.currency,
  pt.status,
  u.email
FROM payment_transactions pt
JOIN users u ON pt."userId" = u.id
ORDER BY pt."createdAt" DESC
LIMIT 5;
```

---

## Success Criteria

Your integration is working correctly if:

- [x] Both services start without errors
- [x] FusionAuth is accessible at http://localhost:9011
- [x] Both services use the **same database**
- [x] Both services have **identical FusionAuth credentials**
- [x] Platform API can register/login users
- [x] JWT token from Platform API works in PAX endpoints
- [x] User is auto-created in PAX on first authenticated request
- [x] Credit account is created automatically for new user
- [x] Role-based access control works (admin vs user)
- [x] Token validation errors are handled properly
- [x] Invalid/expired tokens are rejected
- [x] Inactive users cannot access endpoints
- [x] Both services share the same `users` table
- [x] Logs show FusionAuth validation calls
- [x] Refresh token flow works

---

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Or if running locally
systemctl status postgresql

# Check database exists
psql postgresql://postgres:postgres@localhost:5432/postgres -c "\l" | grep veil
```

### Issue: "FusionAuth validation error"

**Solution:**
```bash
# Check FusionAuth is accessible
curl http://localhost:9011/api/status

# Verify credentials match in both .env files
cd /home/shady/Desktop/veil
diff <(grep FUSIONAUTH packages/pax/.env | sort) \
     <(grep FUSIONAUTH packages/platform-api/.env | sort)

# Check FusionAuth logs
docker logs fusionauth
```

### Issue: "User not found" in PAX

**Causes:**
- Services using different databases
- `users` table doesn't exist in PAX database
- `fusionAuthId` not being set correctly

**Solution:**
```bash
# Verify same database
grep DATABASE_URL packages/pax/.env
grep DATABASE_URL packages/platform-api/.env

# Check users table exists
psql postgresql://postgres:postgres@localhost:5432/veil_platform -c "\d users"

# Check user exists
psql postgresql://postgres:postgres@localhost:5432/veil_platform -c \
  "SELECT * FROM users WHERE email = 'test@example.com';"
```

### Issue: "Token expired"

**Solution:**
```bash
# Tokens expire after 7 days (default)
# Login again to get a fresh token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### Issue: "Port already in use"

**Solution:**
```bash
# Check what's using the port
lsof -i :3001  # Platform API
lsof -i :3002  # PAX

# Kill the process
kill -9 <PID>
```

### Issue: Database migration errors

**Solution:**
```bash
# Reset database (DANGER: deletes all data!)
psql postgresql://postgres:postgres@localhost:5432/postgres -c \
  "DROP DATABASE veil_platform;"
psql postgresql://postgres:postgres@localhost:5432/postgres -c \
  "CREATE DATABASE veil_platform;"

# Re-run migrations
cd packages/platform-api
bun run db:push

cd ../pax
bun run db:push
```

---

## Quick Test Script

Save this as `test-integration.sh` in `/home/shady/Desktop/veil/`:

```bash
#!/bin/bash
set -e

echo "🚀 Testing PAX-Platform API Integration"
echo "========================================"
echo ""

# Generate unique email for testing
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="Test123!@#"

# Register user
echo "1️⃣ Registering user: $TEST_EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"firstName\": \"Integration\",
    \"lastName\": \"Test\"
  }")

echo "$REGISTER_RESPONSE" | jq .

# Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token from registration"
  echo "Response: $REGISTER_RESPONSE"
  exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:50}..."
echo ""

# Test PAX credit account endpoint
echo "2️⃣ Testing PAX credits/account endpoint..."
CREDITS_RESPONSE=$(curl -s http://localhost:3002/api/v1/credits/account \
  -H "Authorization: Bearer $TOKEN")

echo "$CREDITS_RESPONSE" | jq .

if echo "$CREDITS_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "✅ Credit account endpoint works"
else
  echo "❌ Credit account endpoint failed"
  exit 1
fi
echo ""

# Test balance endpoint
echo "3️⃣ Testing PAX credits/balance endpoint..."
BALANCE_RESPONSE=$(curl -s http://localhost:3002/api/v1/credits/balance \
  -H "Authorization: Bearer $TOKEN")

echo "$BALANCE_RESPONSE" | jq .

if echo "$BALANCE_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "✅ Balance endpoint works"
else
  echo "❌ Balance endpoint failed"
  exit 1
fi
echo ""

# Test invalid token
echo "4️⃣ Testing invalid token handling..."
INVALID_RESPONSE=$(curl -s http://localhost:3002/api/v1/credits/account \
  -H "Authorization: Bearer invalid_token")

echo "$INVALID_RESPONSE" | jq .

if echo "$INVALID_RESPONSE" | jq -e '.success == false' > /dev/null; then
  echo "✅ Invalid token properly rejected"
else
  echo "❌ Invalid token not properly rejected"
  exit 1
fi
echo ""

# Test missing token
echo "5️⃣ Testing missing token handling..."
MISSING_RESPONSE=$(curl -s http://localhost:3002/api/v1/credits/account)

echo "$MISSING_RESPONSE" | jq .

if echo "$MISSING_RESPONSE" | jq -e '.success == false' > /dev/null; then
  echo "✅ Missing token properly rejected"
else
  echo "❌ Missing token not properly rejected"
  exit 1
fi
echo ""

# Verify user in database
echo "6️⃣ Verifying user in database..."
DB_CHECK=$(psql postgresql://postgres:postgres@localhost:5432/veil_platform \
  -t -c "SELECT email FROM users WHERE email = '$TEST_EMAIL';")

if echo "$DB_CHECK" | grep -q "$TEST_EMAIL"; then
  echo "✅ User exists in shared database"
else
  echo "❌ User not found in database"
  exit 1
fi
echo ""

echo "========================================"
echo "✅ All integration tests passed!"
echo "========================================"
echo ""
echo "Test user created: $TEST_EMAIL"
echo "Password: $TEST_PASSWORD"
echo "Token: ${TOKEN:0:50}..."
```

**Make it executable and run:**
```bash
cd /home/shady/Desktop/veil
chmod +x test-integration.sh
./test-integration.sh
```

---

## API Endpoints Reference

### Platform API (Port 3001)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login user | No |
| POST | `/api/v1/auth/refresh-token` | Refresh JWT token | No |
| POST | `/api/v1/auth/verify-token` | Verify JWT validity | No |
| GET | `/api/v1/auth/me` | Get current user | Yes |

### PAX API (Port 3002)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/v1/credits/account` | Get credit account | Yes | Any |
| GET | `/api/v1/credits/balance` | Get credit balance | Yes | Any |
| POST | `/api/v1/credits/purchase` | Purchase credits | Yes | Any |
| GET | `/api/v1/credits/transactions` | List transactions | Yes | Any |
| POST | `/api/v1/payments/create` | Create payment | Yes | Any |
| GET | `/api/v1/payments/:id` | Get payment details | Yes | Any |
| GET | `/api/v1/admin/users` | List all users | Yes | Admin |
| GET | `/swagger` | API documentation | No | - |

---

## Environment Variables Reference

### Required in Both Services

```bash
# Database (MUST BE SAME!)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/veil_platform

# FusionAuth (MUST BE IDENTICAL!)
FUSIONAUTH_SERVER_URL=http://localhost:9011
FUSIONAUTH_API_KEY=fusionauth-kickstart-api-key
FUSIONAUTH_APPLICATION_ID=4d329f78-fe1f-5b29-be59-f5f03904bf43
FUSIONAUTH_CLIENT_ID=4d329f78-fe1f-5b29-be59-f5f03904bf43
FUSIONAUTH_CLIENT_SECRET=veil-super-secret-client-secret-for-development
FUSIONAUTH_TENANT_ID=b811d4c7-632f-042e-96a8-8a6d08794098
```

### PAX-Specific

```bash
PORT=3002
FUSIONAUTH_REDIRECT_URI=http://localhost:3002/auth/callback
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Platform API-Specific

```bash
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

---

## Next Steps

After successful testing:

1. **Production Deployment**
   - Update FusionAuth credentials (remove kickstart defaults)
   - Set strong JWT secrets
   - Configure production database URLs
   - Set up SSL/TLS for FusionAuth communication
   - Configure CORS for production domains
   - Set up rate limiting
   - Configure logging and monitoring

2. **Security Enhancements**
   - Implement JWT token caching in PAX (reduce FusionAuth API calls)
   - Set up Redis for session management
   - Configure password policies
   - Set up 2FA (via FusionAuth)
   - Implement API rate limiting

3. **Monitoring**
   - Set up health checks for both services
   - Monitor FusionAuth API response times
   - Track failed authentication attempts
   - Monitor database connection pool usage
   - Set up alerting for service failures

---

## Related Documentation

- [PAX Integration Complete Report](../../../progress/pax-jwt-integration-complete.md)
- [PAX Integration Summary](../../../progress/pax-jwt-integration-summary.md)
- [Integration Plan](../../../progress/integrate-pax-jwt.md)
- [Razorpay Payment Testing](./START-PAYMENT-TESTING.md)
- [FusionAuth Documentation](https://fusionauth.io/docs/)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-19
**Status**: Ready for Testing
