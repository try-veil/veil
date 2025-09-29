# Manual Testing Guide - Veil Platform API

This guide provides step-by-step instructions for manually testing the Veil Platform API functionality.

## Prerequisites

1. **Environment Setup**
   ```bash
   cd packages/platform-api
   bun install
   ```

2. **Database Setup**
   ```bash
   # Start PostgreSQL (if using Docker)
   docker run -d --name postgres-veil \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=veil_platform \
     -p 5432:5432 postgres:15

   # Run migrations
   bun run db:push
   ```

3. **Start the Server**
   ```bash
   bun run dev
   ```

4. **Start Caddy Gateway** (Optional - for full integration testing)
   ```bash
   cd packages/caddy
   make run
   ```

## Testing Tools

### Recommended Tools
- **Postman** or **Insomnia** - GUI-based API testing
- **curl** - Command-line HTTP client
- **HTTPie** - User-friendly command-line HTTP client

### Environment Variables
```bash
export API_BASE_URL=http://localhost:3000
export TEST_EMAIL=test@example.com
export TEST_PASSWORD=TestPassword123!
```

## Test Scenarios

### 1. Health Check & Basic Connectivity

**Test the server is running:**
```bash
curl $API_BASE_URL/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "environment": "development"
}
```

**Test API documentation:**
```bash
curl $API_BASE_URL/swagger
# Should redirect to Swagger UI
```

### 2. User Authentication Flow

#### 2.1 User Registration
```bash
curl -X POST $API_BASE_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "firstName": "John",
    "lastName": "Doe",
    "password": "'$TEST_PASSWORD'"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

#### 2.2 User Login
```bash
curl -X POST $API_BASE_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'"
  }'
```

**Save the access token for subsequent requests:**
```bash
export ACCESS_TOKEN="<token_from_response>"
```

#### 2.3 Protected Route Access
```bash
curl -X GET $API_BASE_URL/api/v1/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

### 3. Marketplace Discovery

#### 3.1 List API Categories
```bash
curl -X GET $API_BASE_URL/api/v1/categories
```

#### 3.2 Browse Marketplace
```bash
# List all APIs
curl -X GET $API_BASE_URL/api/v1/marketplace

# Search APIs
curl -X GET "$API_BASE_URL/api/v1/marketplace?search=weather"

# Filter by category
curl -X GET "$API_BASE_URL/api/v1/marketplace?category=1"

# Filter by pricing
curl -X GET "$API_BASE_URL/api/v1/marketplace?pricingModel=free"

# Pagination
curl -X GET "$API_BASE_URL/api/v1/marketplace?page=1&limit=10"
```

#### 3.3 Get API Details
```bash
curl -X GET $API_BASE_URL/api/v1/marketplace/weather-api-v1
```

### 4. API Provider Flow

#### 4.1 Submit API for Approval
```bash
curl -X POST $API_BASE_URL/api/v1/seller/apis \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weather API",
    "description": "Get current weather information for any location",
    "version": "1.0.0",
    "endpoint": "/weather",
    "baseUrl": "https://api.weatherservice.com",
    "price": 0.001,
    "pricingModel": "per_request",
    "categoryId": 1,
    "documentation": "https://docs.weatherservice.com",
    "testEndpoint": "https://api.weatherservice.com/test"
  }'
```

#### 4.2 View Seller Dashboard
```bash
# List seller's APIs
curl -X GET $API_BASE_URL/api/v1/seller/apis \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get seller statistics
curl -X GET $API_BASE_URL/api/v1/seller/stats \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get analytics
curl -X GET "$API_BASE_URL/api/v1/seller/analytics?timeframe=week" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 5. Admin Approval Workflow

#### 5.1 Create Admin User
First, create an admin user (requires database access or existing admin):
```sql
-- In your database
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

#### 5.2 Login as Admin
```bash
export ADMIN_TOKEN="<admin_access_token>"
```

#### 5.3 Review Pending APIs
```bash
curl -X GET $API_BASE_URL/api/v1/admin/apis/pending \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### 5.4 Approve API
```bash
curl -X POST $API_BASE_URL/api/v1/admin/apis/api-uid-123/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### 5.5 Reject API
```bash
curl -X POST $API_BASE_URL/api/v1/admin/apis/api-uid-123/reject \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Incomplete documentation"
  }'
```

### 6. Subscription Management

#### 6.1 View Subscription Tiers
```bash
curl -X GET $API_BASE_URL/api/v1/subscriptions/tiers
```

#### 6.2 Create Subscription
```bash
curl -X POST $API_BASE_URL/api/v1/subscriptions \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "starter",
    "paymentMethodId": "pm_test_card"
  }'
```

#### 6.3 View Current Subscription
```bash
curl -X GET $API_BASE_URL/api/v1/subscriptions/current \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 7. API Key Management

#### 7.1 Create API Key
```bash
curl -X POST $API_BASE_URL/api/v1/api-keys \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Key",
    "permissions": ["read", "write"]
  }'
```

#### 7.2 List API Keys
```bash
curl -X GET $API_BASE_URL/api/v1/api-keys \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 8. Usage Tracking and Analytics

#### 8.1 View Usage Statistics
```bash
curl -X GET "$API_BASE_URL/api/v1/usage/stats?period=day" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

#### 8.2 View Usage Trends
```bash
curl -X GET "$API_BASE_URL/api/v1/usage/trends?timeframe=week&granularity=hour" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

#### 8.3 Check Rate Limits
```bash
curl -X GET $API_BASE_URL/api/v1/usage/rate-limits \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 9. Approval System

#### 9.1 Submit Approval Request
```bash
curl -X POST $API_BASE_URL/api/v1/approvals \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "api_submission",
    "entityId": "api-123",
    "entityType": "api",
    "priority": "medium",
    "reason": "Submitting new Weather API for marketplace inclusion",
    "data": {
      "documentation": "https://docs.weatherservice.com",
      "testEndpoints": ["https://api.weatherservice.com/test"]
    }
  }'
```

#### 9.2 View Approval Status
```bash
curl -X GET $API_BASE_URL/api/v1/approvals/approval_123_abc \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 10. Payment Processing

#### 10.1 Create Payment Intent
```bash
curl -X POST $API_BASE_URL/api/v1/payments/create-intent \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "currency": "usd",
    "subscriptionTier": "professional",
    "paymentMethodId": "pm_test_card"
  }'
```

#### 10.2 View Payment History
```bash
curl -X GET $API_BASE_URL/api/v1/payments/history \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Error Testing

### Test Rate Limiting
```bash
# Make rapid requests to trigger rate limiting
for i in {1..50}; do
  curl -X GET $API_BASE_URL/api/v1/marketplace &
done
wait
```

### Test Authentication Errors
```bash
# No token
curl -X GET $API_BASE_URL/api/v1/profile

# Invalid token
curl -X GET $API_BASE_URL/api/v1/profile \
  -H "Authorization: Bearer invalid-token"
```

### Test Validation Errors
```bash
# Invalid email
curl -X POST $API_BASE_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "firstName": "John",
    "lastName": "Doe",
    "password": "TestPassword123!"
  }'
```

## Testing Checklist

### Authentication & Authorization
- [ ] User registration with valid data
- [ ] User registration with invalid data (email, password)
- [ ] User login with valid credentials
- [ ] User login with invalid credentials
- [ ] Access protected routes with valid token
- [ ] Access protected routes with invalid/expired token
- [ ] Role-based access control (admin vs user)

### Marketplace Discovery
- [ ] List all APIs
- [ ] Search APIs by name/description
- [ ] Filter APIs by category
- [ ] Filter APIs by pricing model
- [ ] Sort APIs by price/popularity
- [ ] Pagination works correctly
- [ ] API details retrieval

### Provider Workflow
- [ ] Submit API for approval
- [ ] View seller dashboard
- [ ] Update API information
- [ ] View API analytics
- [ ] Delete/deactivate API

### Admin Workflow
- [ ] View pending APIs
- [ ] Approve API (successful Caddy integration)
- [ ] Reject API with reason
- [ ] View admin statistics
- [ ] Manage categories

### Subscriptions & Payments
- [ ] View subscription tiers
- [ ] Create subscription
- [ ] Upgrade subscription
- [ ] Cancel subscription
- [ ] Payment processing
- [ ] View payment history
- [ ] Handle payment failures

### API Key Management
- [ ] Create API key
- [ ] List API keys
- [ ] Deactivate API key
- [ ] API key permissions

### Usage & Analytics
- [ ] View usage statistics
- [ ] Track API requests
- [ ] Rate limiting enforcement
- [ ] Quota management
- [ ] Usage-based billing

### Error Handling
- [ ] Rate limiting responses
- [ ] Validation error messages
- [ ] Authentication error responses
- [ ] Server error handling
- [ ] Database error handling

## Performance Testing

### Load Testing with Apache Bench
```bash
# Test authentication endpoint
ab -n 100 -c 10 -p login_data.json -T application/json \
  http://localhost:3000/api/v1/auth/login

# Test marketplace endpoint
ab -n 1000 -c 50 \
  http://localhost:3000/api/v1/marketplace
```

### Memory and Resource Usage
```bash
# Monitor server resources during testing
htop
# or
docker stats (if running in containers)
```

## Integration Testing

### Test with Caddy Gateway
1. Start Caddy gateway server
2. Submit API through admin approval
3. Verify API is accessible through gateway
4. Test API key validation
5. Test rate limiting through gateway

### Test with External Services
- Payment provider integration (Stripe test mode)
- Email service integration
- External API onboarding

## Troubleshooting

### Common Issues
1. **Database Connection Errors**
   - Check PostgreSQL is running
   - Verify DATABASE_URL environment variable

2. **Token Issues**
   - Check JWT_SECRET is set
   - Verify token hasn't expired

3. **CORS Issues**
   - Check CORS_ORIGIN environment variable
   - Verify request headers

4. **Rate Limiting Issues**
   - Check Redis connection (if using Redis for rate limiting)
   - Verify rate limiting configuration

### Debug Mode
```bash
# Run with debug logging
LOG_LEVEL=debug bun run dev

# Check request/response details
curl -v $API_BASE_URL/api/v1/marketplace
```

## Automated Testing

Run the complete E2E test suite:
```bash
# Run all tests
bun run test:e2e

# Run with verbose output
bun run test:e2e:verbose

# Run specific test file
bun test tests/e2e/auth-flow.test.ts

# Run with coverage
bun run test:e2e:coverage
```