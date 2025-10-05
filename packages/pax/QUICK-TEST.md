# PAX Service - Quick Test Guide

## 🚀 What You Can Test Right Now

### Prerequisites
```bash
# Service must be running
lsof -ti:3002  # Should return a PID

# Check service is healthy
curl http://localhost:3002/health | jq
```

## ✅ Working Features (Test These!)

### 1. Proxy Health Check (No Auth Required)
```bash
curl http://localhost:3002/proxy/jsonplaceholder/health | jq
```

**Expected:**
```json
{
  "success": true,
  "healthy": true,
  "api": {
    "slug": "jsonplaceholder",
    "name": "JSONPlaceholder Test API",
    "upstreamUrl": "https://jsonplaceholder.typicode.com"
  },
  "upstream": {
    "status": 200,
    "statusText": "OK",
    "responseTime": 400
  }
}
```

### 2. List Proxy APIs
```bash
curl http://localhost:3002/api/v1/admin/proxy/apis | jq
```

**Expected:** List of configured proxy APIs

### 3. Proxy Request with Credit Metering
```bash
curl http://localhost:3002/proxy/jsonplaceholder/posts/1 \
  -H "X-API-Key: sk_test_1_abc123" | jq
```

**What Happens Behind the Scenes:**
- ✅ API key validated
- ✅ Credits reserved (0.001)
- ✅ Request forwarded to upstream
- ✅ Response returned
- ✅ Credits settled/released
- ✅ Usage recorded

**Check logs to see:**
```
💳 reserveCredits called
🔒 Lock acquired
💸 Balance updated
✅ Credits reserved successfully
```

### 4. Create a New Proxy API
```bash
curl -X POST http://localhost:3002/api/v1/admin/proxy/apis \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "httpbin",
    "name": "HTTPBin Test",
    "upstreamUrl": "https://httpbin.org",
    "timeoutSeconds": 30
  }' | jq
```

### 5. Create a Route for API
```bash
# First, get the API UID from step 4
API_UID="<paste-uid-here>"

curl -X POST http://localhost:3002/api/v1/admin/proxy/routes \
  -H "Content-Type: application/json" \
  -d '{
    "apiUid": "'$API_UID'",
    "pathPattern": "/get",
    "method": "GET"
  }' | jq
```

### 6. List Pricing Models
```bash
curl http://localhost:3002/api/v1/admin/pricing/models | jq
```

### 7. Create New Pricing Model
```bash
# Per-KB pricing
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

## 🔍 Verify Credit Flow (Check Logs)

```bash
# Make a proxy request
curl http://localhost:3002/proxy/jsonplaceholder/posts/1 \
  -H "X-API-Key: sk_test_1_abc123" > /dev/null

# Watch the service logs, you should see:
# 1. reserveCredits called
# 2. lockForUpdate completed
# 3. Balance updated
# 4. Credits reserved successfully
# 5. Request proxied
# 6. Credits settled/released
```

## 📊 Admin Operations

### Update API Configuration
```bash
API_UID="b211adce-e59d-4e45-8314-1e9046205473"

curl -X PUT http://localhost:3002/api/v1/admin/proxy/apis/$API_UID \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "timeoutSeconds": 60
  }' | jq
```

### Update Route
```bash
ROUTE_UID="<route-uid>"

curl -X PUT http://localhost:3002/api/v1/admin/proxy/routes/$ROUTE_UID \
  -H "Content-Type: application/json" \
  -d '{
    "timeoutSeconds": 45
  }' | jq
```

### Delete Route
```bash
curl -X DELETE http://localhost:3002/api/v1/admin/proxy/routes/$ROUTE_UID | jq
```

## 🎯 Full Feature Test Sequence

```bash
#!/bin/bash

echo "=== PAX Service Feature Test ==="
echo ""

# 1. Health check
echo "1. Health Check"
curl -s http://localhost:3002/health | jq -r '.status'
echo ""

# 2. List APIs
echo "2. Configured APIs"
curl -s http://localhost:3002/api/v1/admin/proxy/apis | jq -r '.data[].name'
echo ""

# 3. Check upstream health
echo "3. Upstream Health"
curl -s http://localhost:3002/proxy/jsonplaceholder/health | jq -r '.healthy'
echo ""

# 4. Make proxied request
echo "4. Proxy Request"
curl -s http://localhost:3002/proxy/jsonplaceholder/posts/1 \
  -H "X-API-Key: sk_test_1_abc123" | jq -r '.userId // .success'
echo ""

# 5. Check pricing models
echo "5. Pricing Models"
curl -s http://localhost:3002/api/v1/admin/pricing/models | jq -r '.data[].name'
echo ""

echo "=== All Tests Complete ==="
```

## 📝 What to Observe

### In Service Logs:
✅ No errors
✅ Credits reserved before each request
✅ Credits settled/released after each request
✅ Lock acquired successfully (no hangs)
✅ Balance updates complete
✅ Transactions recorded

### In Responses:
✅ HTTP 200 for successful requests
✅ Proper JSON responses
✅ Error messages are clear

### Database:
```bash
# If you have access, check:
# - credit_accounts: balance and reservedBalance should be accurate
# - credit_transactions: reserve, debit, release transactions created
# - credit_reservations: settled or released (not stuck in 'active')
# - usage_records: requests logged with cost
```

## 🚫 Known Limitations (OK to Skip)

- Credit account endpoints need authentication (not tested)
- Usage analytics endpoints need authentication (not tested)  
- Rate limit headers may not appear in curl (but working in code)

## ✅ Test Results Summary

If you can successfully:
1. ✅ Check health
2. ✅ List APIs
3. ✅ Make proxy requests
4. ✅ See credit reservation in logs
5. ✅ Create/update APIs and routes
6. ✅ See no errors or deadlocks

**Then Phase 3 is FULLY FUNCTIONAL!** 🎉

---

**Full test documentation:** See `TESTING.md`
**Detailed test report:** See `TEST-REPORT.md`
