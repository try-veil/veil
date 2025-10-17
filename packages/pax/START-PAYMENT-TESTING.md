# Payment Order Testing - Complete Setup Guide

This guide shows you EXACTLY what needs to be running to test payment order creation.

## Prerequisites Checklist

### ✅ 1. PostgreSQL Database (REQUIRED)

**Status Check:**
```bash
docker ps | grep postgres
```

**If not running, start it:**
```bash
docker start postgres15-dev
# OR if container doesn't exist:
docker run -d \
  --name postgres15-dev \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15
```

### ✅ 2. Razorpay Credentials (REQUIRED for actual payments)

**Edit `.env` file:**
```bash
cd packages/pax
nano .env  # or use your editor
```

**Required values:**
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx        # Get from https://dashboard.razorpay.com/app/keys
RAZORPAY_KEY_SECRET=your_secret       # Get from dashboard
RAZORPAY_WEBHOOK_SECRET=whsec_xxx     # Optional, for webhooks
JWT_SECRET=your-secret-key-change-in-production
```

> **Note:** For testing payment **creation only**, you can use dummy values. For actual payment processing, you need real Razorpay test credentials.

### ✅ 3. Database Schema (REQUIRED)

**Push the schema:**
```bash
cd packages/pax
bun install
bun run db:push
```

### ✅ 4. Test Data (REQUIRED)

**Load initial test data:**
```bash
cd packages/pax
docker exec -i postgres15-dev psql -U postgres -d pax < setup-test-data.sql
```

This creates:
- User with ID=1 and 100 credits
- Test proxy API (JSONPlaceholder)
- Pricing model
- Test credit package

### ✅ 5. PAX Service (REQUIRED)

**Start the service:**
```bash
cd packages/pax
bun run dev
```

**Verify it's running:**
```bash
curl http://localhost:3002/health | jq
# Should return: {"status": "ok", "timestamp": "..."}
```

## Complete Startup Sequence

Run these commands in order:

```bash
# 1. Start PostgreSQL (if not running)
docker start postgres15-dev

# 2. Navigate to PAX package
cd /home/shady/Desktop/veil/packages/pax

# 3. Install dependencies (first time only)
bun install

# 4. Setup database schema (first time only)
bun run db:push

# 5. Load test data (first time only)
docker exec -i postgres15-dev psql -U postgres -d pax < setup-test-data.sql

# 6. Start PAX service
bun run dev
```

Keep this terminal open - the service will run in the foreground.

## Generate JWT Token for Authentication

**Open a NEW terminal** and run:

```bash
cd /home/shady/Desktop/veil/packages/pax

# Generate token for user ID 1
node generate-token.js 1 test@example.com
```

This will output:
- Your JWT token
- A ready-to-use curl command

**Copy the token** (it's the long string after "Token:")

## Test Payment Order Creation

### Method 1: Using the generated curl command

Just copy-paste the curl command from the token generator output.

### Method 2: Manual curl

```bash
# Replace YOUR_TOKEN_HERE with your JWT token
TOKEN="YOUR_TOKEN_HERE"

curl -X POST http://localhost:3002/api/v1/payments/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "INR",
    "description": "Test payment order"
  }' | jq
```

### Method 3: Using Swagger UI

1. Open http://localhost:3002/swagger
2. Click "Authorize" button (top right)
3. Enter: `Bearer YOUR_TOKEN_HERE`
4. Navigate to "Payments" section
5. Try "POST /api/v1/payments/create"

## Expected Response

**Success:**
```json
{
  "success": true,
  "data": {
    "uid": "pmt_xxxxx",
    "userId": 1,
    "amount": 100,
    "currency": "INR",
    "provider": "razorpay",
    "status": "pending",
    "providerOrderId": "order_xxxxx",
    "providerData": {
      "id": "order_xxxxx",
      "amount": 10000,
      "currency": "INR"
    },
    "createdAt": "2025-10-17T..."
  }
}
```

**Error - Service not running:**
```
curl: (7) Failed to connect to localhost port 3002
```
→ Start PAX service: `bun run dev`

**Error - Missing token:**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Missing authorization token"
}
```
→ Generate and add JWT token

**Error - Invalid Razorpay credentials:**
```json
{
  "success": false,
  "error": "Payment provider error",
  "message": "Invalid API key"
}
```
→ Update `.env` with valid Razorpay test credentials

## What's Required vs Optional

| Component | Status | Impact if Missing |
|-----------|--------|-------------------|
| PostgreSQL | **REQUIRED** | Service won't start |
| Database schema | **REQUIRED** | Database errors |
| Test data | **REQUIRED** | No user/credits |
| PAX service | **REQUIRED** | Can't make API calls |
| JWT token | **REQUIRED** | 401 Unauthorized |
| Valid Razorpay keys | **OPTIONAL** | Order creation may fail, but API works |

## Quick Status Check

Run this to check everything:

```bash
#!/bin/bash
echo "=== PAX Payment Testing Status ==="
echo ""

echo -n "PostgreSQL: "
docker ps | grep -q postgres && echo "✓ Running" || echo "✗ Not running"

echo -n "PAX Database: "
docker exec postgres15-dev psql -U postgres -d pax -c "SELECT 1" > /dev/null 2>&1 && echo "✓ Exists" || echo "✗ Missing"

echo -n "PAX Service: "
curl -s http://localhost:3002/health > /dev/null 2>&1 && echo "✓ Running on port 3002" || echo "✗ Not running"

echo -n "Test User: "
docker exec postgres15-dev psql -U postgres -d pax -c "SELECT user_id FROM credit_accounts WHERE user_id=1" 2>/dev/null | grep -q "1" && echo "✓ User ID 1 exists" || echo "✗ No test data"

echo ""
echo "If all show ✓, you're ready to test!"
```

## Full Test Example

```bash
# Terminal 1: Start PAX service
cd /home/shady/Desktop/veil/packages/pax
bun run dev

# Terminal 2: Test payment creation
cd /home/shady/Desktop/veil/packages/pax

# Generate token
TOKEN=$(node generate-token.js 1 test@example.com | grep "Token:" | awk '{print $2}')

# Create payment order
curl -X POST http://localhost:3002/api/v1/payments/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "INR",
    "description": "Test credit purchase"
  }' | jq

# List all payments
curl http://localhost:3002/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Summary: Minimum Required Setup

1. ✅ **PostgreSQL running** → `docker start postgres15-dev`
2. ✅ **Database schema created** → `bun run db:push`
3. ✅ **Test data loaded** → `docker exec -i postgres15-dev psql -U postgres -d pax < setup-test-data.sql`
4. ✅ **PAX service running** → `bun run dev`
5. ✅ **JWT token generated** → `node generate-token.js`

That's it! These 5 things are all you need.
