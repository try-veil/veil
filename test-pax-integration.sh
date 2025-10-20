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
