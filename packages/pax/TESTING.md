# PAX Service Testing Guide

## Prerequisites

1. Service running on port 3002
2. PostgreSQL database with schema migrated
3. Test data seeded (user, credit account, API configs)

## Quick Test Commands

### Health Check
```bash
curl http://localhost:3002/health | jq
```

## 1. Credit System Testing

### 1.1 Create Credit Package (Admin)
```bash
curl -X POST http://localhost:3002/api/v1/admin/credits/packages \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Starter Pack",
    "credits": "50.00",
    "price": "10.00",
    "currency": "INR"
  }' | jq
```

### 1.2 Get User Credit Account
```bash
curl http://localhost:3002/api/v1/credits/accounts/1 | jq
```

### 1.3 Add Credits (Internal/Test)
```bash
curl -X POST http://localhost:3002/api/v1/internal/credits/add \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "amount": "100.00",
    "description": "Test credit addition"
  }' | jq
```

### 1.4 Get Transaction History
```bash
curl http://localhost:3002/api/v1/credits/transactions/account/1 | jq
```

### 1.5 Get Credit Summary
```bash
curl http://localhost:3002/api/v1/credits/accounts/1/summary | jq
```

## 2. Proxy API Management Testing

### 2.1 Create Proxy API (Admin)
```bash
curl -X POST http://localhost:3002/api/v1/admin/proxy/apis \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "httpbin",
    "name": "HTTPBin Test API",
    "description": "Public HTTP testing service",
    "upstreamUrl": "https://httpbin.org",
    "timeoutSeconds": 30
  }' | jq
```

### 2.2 List Proxy APIs
```bash
curl http://localhost:3002/api/v1/admin/proxy/apis | jq
```

### 2.3 Get Specific API
```bash
# Replace with actual UID from list response
curl http://localhost:3002/api/v1/admin/proxy/apis/{api-uid} | jq
```

### 2.4 Update Proxy API
```bash
curl -X PUT http://localhost:3002/api/v1/admin/proxy/apis/{api-uid} \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "timeoutSeconds": 60
  }' | jq
```

## 3. Route Management Testing

### 3.1 Create Route
```bash
curl -X POST http://localhost:3002/api/v1/admin/proxy/routes \
  -H "Content-Type: application/json" \
  -d '{
    "apiUid": "{api-uid}",
    "pathPattern": "/get",
    "method": "GET"
  }' | jq
```

### 3.2 List Routes for API
```bash
curl "http://localhost:3002/api/v1/admin/proxy/routes?apiUid={api-uid}" | jq
```

### 3.3 Update Route
```bash
curl -X PUT http://localhost:3002/api/v1/admin/proxy/routes/{route-uid} \
  -H "Content-Type: application/json" \
  -d '{
    "timeoutSeconds": 45
  }' | jq
```

## 4. Pricing Model Testing

### 4.1 Create Per-Request Pricing
```bash
curl -X POST http://localhost:3002/api/v1/admin/pricing/models \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Standard Per Request",
    "type": "per_request",
    "baseCost": "0.01",
    "isActive": true
  }' | jq
```

### 4.2 Create Per-KB Pricing
```bash
curl -X POST http://localhost:3002/api/v1/admin/pricing/models \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Data Transfer Pricing",
    "type": "per_kb",
    "costPerKbRequest": "0.001",
    "costPerKbResponse": "0.002",
    "isActive": true
  }' | jq
```

### 4.3 List Pricing Models
```bash
curl http://localhost:3002/api/v1/admin/pricing/models | jq
```

## 5. Proxy Request Testing

### 5.1 Health Check (No Auth)
```bash
curl http://localhost:3002/proxy/jsonplaceholder/health | jq
```

### 5.2 Simple GET Request
```bash
curl http://localhost:3002/proxy/jsonplaceholder/posts/1 \
  -H "X-API-Key: sk_test_1_abc123" | jq
```

### 5.3 POST Request
```bash
curl -X POST http://localhost:3002/proxy/jsonplaceholder/posts \
  -H "X-API-Key: sk_test_1_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Post",
    "body": "This is a test",
    "userId": 1
  }' | jq
```

### 5.4 Check Response Headers (Cost & Duration)
```bash
curl -i http://localhost:3002/proxy/jsonplaceholder/posts/1 \
  -H "X-API-Key: sk_test_1_abc123" | grep -i "x-pax"
```

## 6. Rate Limiting Testing

### 6.1 Test Rate Limit (100 req/min)
```bash
# Send 5 rapid requests
for i in {1..5}; do
  echo "Request $i:"
  curl -s http://localhost:3002/proxy/jsonplaceholder/posts/1 \
    -H "X-API-Key: sk_test_1_abc123" \
    -I | grep -i "ratelimit"
  echo ""
done
```

### 6.2 Trigger Rate Limit (requires 100+ requests)
```bash
# WARNING: This will consume credits
for i in {1..105}; do
  curl -s http://localhost:3002/proxy/jsonplaceholder/posts/1 \
    -H "X-API-Key: sk_test_1_abc123" > /dev/null
  echo "Request $i sent"
done

# Next request should be rate limited
curl http://localhost:3002/proxy/jsonplaceholder/posts/1 \
  -H "X-API-Key: sk_test_1_abc123" | jq
```

## 7. Usage Analytics Testing

### 7.1 Get Usage Records
```bash
curl "http://localhost:3002/api/v1/usage/records?userId=1&limit=10" | jq
```

### 7.2 Get Usage Summary
```bash
curl "http://localhost:3002/api/v1/usage/summary?userId=1" | jq
```

### 7.3 Get Usage Analytics
```bash
curl "http://localhost:3002/api/v1/usage/analytics?userId=1" | jq
```

### 7.4 Filter by Date Range
```bash
START_DATE="2025-10-01"
END_DATE="2025-10-31"

curl "http://localhost:3002/api/v1/usage/summary?userId=1&fromDate=$START_DATE&toDate=$END_DATE" | jq
```

## 8. Credit Reservation Flow Testing

### 8.1 Check Initial Balance
```bash
curl http://localhost:3002/api/v1/credits/accounts/1 | jq '.data.balance'
```

### 8.2 Make Proxy Request (reserves credits)
```bash
curl http://localhost:3002/proxy/jsonplaceholder/posts/1 \
  -H "X-API-Key: sk_test_1_abc123" | jq
```

### 8.3 Check Final Balance (should be deducted)
```bash
curl http://localhost:3002/api/v1/credits/accounts/1 | jq '.data.balance'
```

### 8.4 Check Transaction History
```bash
curl http://localhost:3002/api/v1/credits/transactions/account/1 | jq '.data[:3]'
```

## 9. Error Handling Testing

### 9.1 Missing API Key
```bash
curl http://localhost:3002/proxy/jsonplaceholder/posts/1 | jq
# Expected: 401 Unauthorized
```

### 9.2 Invalid API Key Format
```bash
curl http://localhost:3002/proxy/jsonplaceholder/posts/1 \
  -H "X-API-Key: invalid_key" | jq
# Expected: 401 Invalid API key format
```

### 9.3 Non-existent API
```bash
curl http://localhost:3002/proxy/nonexistent/test \
  -H "X-API-Key: sk_test_1_abc123" | jq
# Expected: 404 API not found
```

### 9.4 Insufficient Credits
```bash
# First, drain credits (if balance > 0)
curl -X POST http://localhost:3002/api/v1/internal/credits/deduct \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "amount": "100.00",
    "description": "Test deduction"
  }' | jq

# Try to make request
curl http://localhost:3002/proxy/jsonplaceholder/posts/1 \
  -H "X-API-Key: sk_test_1_abc123" | jq
# Expected: 402 Insufficient balance
```

## 10. Payment Integration Testing (Razorpay)

### 10.1 Create Payment Order
```bash
curl -X POST http://localhost:3002/api/v1/payments/orders \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "INR",
    "userId": 1,
    "packageId": 1
  }' | jq
```

### 10.2 Verify Payment (Webhook Simulation)
```bash
# This would normally come from Razorpay
curl -X POST http://localhost:3002/api/v1/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: test-signature" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test123",
          "amount": 1000,
          "status": "captured"
        }
      }
    }
  }'
```

## Expected Results Summary

### ✅ Success Criteria

1. **Credit System**
   - Account balance updates correctly
   - Transactions recorded with proper audit trail
   - Credits can be added/deducted

2. **Proxy Service**
   - Requests forwarded to upstream
   - Credits reserved before request
   - Credits settled/released after response
   - Usage records created

3. **Rate Limiting**
   - Rate limit headers present
   - 429 status after limit exceeded
   - Rate limits reset after window

4. **Analytics**
   - Usage records queryable
   - Aggregations accurate
   - Cost tracking correct

5. **Error Handling**
   - Proper status codes (401, 402, 404, 429, 500, 503, 504)
   - Error messages informative
   - No credit leaks on errors

## Troubleshooting

### Service Not Responding
```bash
# Check if service is running
lsof -ti:3002

# Check logs (if running in background)
# See terminal output for errors
```

### Database Connection Issues
```bash
# Test database connection
psql postgresql://postgres:postgres@localhost:5432/pax -c "SELECT 1"
```

### Credit Balance Issues
```bash
# Reset balance to 100
curl -X POST http://localhost:3002/api/v1/internal/credits/set-balance \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "balance": "100.00"
  }' | jq
```

## Automated Test Script

Create a file `test-pax.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3002"
API_KEY="sk_test_1_abc123"

echo "=== PAX Service Test Suite ==="
echo ""

echo "1. Health Check"
curl -s $BASE_URL/health | jq -r '.status'
echo ""

echo "2. Credit Account Status"
BALANCE=$(curl -s $BASE_URL/api/v1/credits/accounts/1 | jq -r '.data.balance')
echo "Balance: $BALANCE"
echo ""

echo "3. Proxy Health Check"
curl -s $BASE_URL/proxy/jsonplaceholder/health | jq -r '.healthy'
echo ""

echo "4. Proxy Request Test"
RESPONSE=$(curl -s $BASE_URL/proxy/jsonplaceholder/posts/1 -H "X-API-Key: $API_KEY")
echo "Response received: $(echo $RESPONSE | jq -r '.id // .success')"
echo ""

echo "5. Usage Records"
RECORDS=$(curl -s "$BASE_URL/api/v1/usage/records?userId=1&limit=1" | jq -r '.data[0].actualCost // "none"')
echo "Latest cost: $RECORDS"
echo ""

echo "=== Test Complete ==="
```

Run with: `chmod +x test-pax.sh && ./test-pax.sh`
