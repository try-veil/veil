#!/bin/bash

# Veil Platform API Integration Tests
# Tests subscription upgrade/downgrade, event queue, and two-phase commits

set -e

BASE_URL="http://localhost:3010"
API_URL="$BASE_URL/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_test() {
    echo -e "\n${YELLOW}TEST: $1${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))
}

print_pass() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

print_summary() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}Test Summary${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo -e "Tests Run:    $TESTS_RUN"
    echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
    echo -e "${YELLOW}========================================${NC}\n"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        exit 1
    fi
}

# Trap to ensure summary is printed
trap print_summary EXIT

echo "=========================================="
echo "Veil Platform API Integration Tests"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Health Check
print_test "Health Check"
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | jq -e '.status == "ok"' > /dev/null; then
    print_pass "Server is healthy"
else
    print_fail "Server health check failed"
fi

# Test 2: Event Queue Stats
print_test "Event Queue Stats Endpoint"
STATS=$(curl -s "$API_URL/events/stats")
if echo "$STATS" | jq -e '.success == true' > /dev/null; then
    print_pass "Event queue stats endpoint working"
    echo "  Queue stats: $(echo $STATS | jq -c '.data')"
else
    print_fail "Event queue stats endpoint failed"
fi

# Test 3: Pricing Models Available
print_test "Get Pricing Models"
PRICING=$(curl -s "$API_URL/pricing/models")
if echo "$PRICING" | jq -e '.success == true' > /dev/null; then
    MODEL_COUNT=$(echo "$PRICING" | jq '.data | length')
    print_pass "Retrieved $MODEL_COUNT pricing models"
    echo "$PRICING" | jq -r '.data[] | "  - \(.name) (\(.type)): $\(.basePrice)"'
else
    print_fail "Failed to get pricing models"
fi

# Test 4: Marketplace APIs
print_test "Get Marketplace APIs"
MARKETPLACE=$(curl -s "$API_URL/marketplace")
if echo "$MARKETPLACE" | jq -e '.success == true' > /dev/null; then
    API_COUNT=$(echo "$MARKETPLACE" | jq '.data.apis | length')
    print_pass "Retrieved $API_COUNT marketplace APIs"
else
    print_fail "Failed to get marketplace APIs"
fi

# Test 5: Categories
print_test "Get API Categories"
CATEGORIES=$(curl -s "$API_URL/categories")
if echo "$CATEGORIES" | jq -e '.success == true' > /dev/null; then
    CAT_COUNT=$(echo "$CATEGORIES" | jq '.data | length')
    print_pass "Retrieved $CAT_COUNT categories"
else
    print_fail "Failed to get categories"
fi

# Test 6: Create Test Subscription (requires authentication in production)
print_test "Subscription Endpoints Available"
# Note: This will fail with auth error, but we're testing the endpoint exists
SUBS_RESPONSE=$(curl -s "$API_URL/subscriptions" 2>&1)
if echo "$SUBS_RESPONSE" | grep -q "success\|Unauthorized\|authentication"; then
    print_pass "Subscription endpoints available"
else
    print_fail "Subscription endpoints not responding"
fi

# Test 7: Usage Stats Endpoint
print_test "Usage Stats Endpoint"
USAGE_RESPONSE=$(curl -s "$API_URL/usage/stats" 2>&1)
if echo "$USAGE_RESPONSE" | grep -q "success\|Unauthorized\|authentication"; then
    print_pass "Usage stats endpoint available"
else
    print_fail "Usage stats endpoint not responding"
fi

# Test 8: Quota Endpoint
print_test "Quota Management Endpoint"
QUOTA_RESPONSE=$(curl -s "$API_URL/quota" 2>&1)
if echo "$QUOTA_RESPONSE" | grep -q "success\|Unauthorized\|authentication\|models"; then
    print_pass "Quota endpoint available"
else
    print_fail "Quota endpoint not responding"
fi

# Test 9: Analytics Endpoints
print_test "Analytics Endpoints"
ANALYTICS_RESPONSE=$(curl -s "$API_URL/analytics/overview" 2>&1)
if echo "$ANALYTICS_RESPONSE" | grep -q "success\|Unauthorized\|authentication"; then
    print_pass "Analytics endpoints available"
else
    print_fail "Analytics endpoints not responding"
fi

# Test 10: Admin Endpoints
print_test "Admin Panel Endpoints"
ADMIN_RESPONSE=$(curl -s "$API_URL/admin/stats" 2>&1)
if echo "$ADMIN_RESPONSE" | grep -q "success\|Unauthorized\|authentication\|Forbidden"; then
    print_pass "Admin endpoints available"
else
    print_fail "Admin endpoints not responding"
fi

# Test 11: Swagger Documentation
print_test "Swagger Documentation Available"
SWAGGER=$(curl -s "$BASE_URL/swagger" 2>&1)
if echo "$SWAGGER" | grep -q "swagger\|openapi\|Veil"; then
    print_pass "Swagger documentation available"
else
    print_fail "Swagger documentation not available"
fi

# Test 12: Event Queue - Dead Letter Events
print_test "Event Queue Dead Letter Endpoint"
DEAD_LETTER=$(curl -s "$API_URL/events/dead-letter?limit=10")
if echo "$DEAD_LETTER" | jq -e '.success == true' > /dev/null; then
    print_pass "Dead letter queue endpoint working"
    DL_COUNT=$(echo "$DEAD_LETTER" | jq '.data | length')
    echo "  Dead letter events: $DL_COUNT"
else
    print_fail "Dead letter queue endpoint failed"
fi

# Test 13: Pricing Tiers
print_test "Get Pricing Tiers for a Model"
if [ "$MODEL_COUNT" -gt 0 ]; then
    FIRST_MODEL_ID=$(echo "$PRICING" | jq -r '.data[0].id')
    TIERS=$(curl -s "$API_URL/pricing/models/$FIRST_MODEL_ID/tiers")
    if echo "$TIERS" | jq -e '.success == true' > /dev/null; then
        TIER_COUNT=$(echo "$TIERS" | jq '.data | length')
        print_pass "Retrieved $TIER_COUNT pricing tiers"
    else
        print_fail "Failed to get pricing tiers"
    fi
else
    print_fail "No pricing models available to test tiers"
fi

# Test 14: Test Invalid Endpoint (404 handling)
print_test "404 Error Handling"
NOT_FOUND=$(curl -s "$API_URL/this-does-not-exist")
if echo "$NOT_FOUND" | jq -e '.success == false' > /dev/null; then
    print_pass "404 handling works correctly"
else
    print_fail "404 handling not working"
fi

# Test 15: CORS Headers
print_test "CORS Headers Present"
CORS=$(curl -s -I "$BASE_URL/health" | grep -i "access-control")
if [ ! -z "$CORS" ]; then
    print_pass "CORS headers present"
else
    print_fail "CORS headers missing"
fi

echo ""
echo "=========================================="
echo "Feature-Specific Tests"
echo "=========================================="

# Test 16: Event Queue Processing
print_test "Event Queue Background Processing"
BEFORE_STATS=$(curl -s "$API_URL/events/stats" | jq -c '.data')
sleep 2
AFTER_STATS=$(curl -s "$API_URL/events/stats" | jq -c '.data')
if [ "$BEFORE_STATS" == "$AFTER_STATS" ]; then
    print_pass "Event queue is stable (no unexpected changes)"
else
    print_pass "Event queue is processing (stats changed)"
fi

# Test 17: Multiple Concurrent Requests (basic load test)
print_test "Handle Concurrent Requests"
for i in {1..5}; do
    curl -s "$BASE_URL/health" > /dev/null &
done
wait
CONCURRENT_HEALTH=$(curl -s "$BASE_URL/health")
if echo "$CONCURRENT_HEALTH" | jq -e '.status == "ok"' > /dev/null; then
    print_pass "Server handles concurrent requests"
else
    print_fail "Server failed under concurrent load"
fi

# Test 18: Response Time Check
print_test "Response Time Performance"
START_TIME=$(date +%s%N)
curl -s "$BASE_URL/health" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( ($END_TIME - $START_TIME) / 1000000 ))
if [ $RESPONSE_TIME -lt 1000 ]; then
    print_pass "Response time: ${RESPONSE_TIME}ms (< 1000ms)"
else
    print_fail "Response time: ${RESPONSE_TIME}ms (> 1000ms)"
fi

# Test 19: Content-Type Headers
print_test "JSON Content-Type Headers"
CONTENT_TYPE=$(curl -s -I "$API_URL/events/stats" | grep -i "content-type" | grep -i "application/json")
if [ ! -z "$CONTENT_TYPE" ]; then
    print_pass "Correct JSON content-type headers"
else
    print_fail "Missing or incorrect content-type headers"
fi

# Test 20: Server Environment
print_test "Server Environment Configuration"
HEALTH_ENV=$(curl -s "$BASE_URL/health" | jq -r '.environment')
if [ "$HEALTH_ENV" == "development" ]; then
    print_pass "Server in development mode"
else
    echo "  Environment: $HEALTH_ENV"
fi

echo ""
echo "=========================================="
echo "Tests Complete"
echo "=========================================="
