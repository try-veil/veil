#!/bin/bash

BASE_URL="http://localhost:3000"


GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" 


EMAIL="test-$(date +%s)@example.com"
PASSWORD="password123"
FIRST_NAME="Test"
LAST_NAME="User"
ACCESS_TOKEN=""
FUSION_AUTH_TOKEN=""
USER_ID=""


section() {
  echo -e "\n${BLUE}=== $1 ===${NC}"
}


test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ $2${NC}"
  else
    echo -e "${RED}✗ $2${NC}"
    echo -e "${YELLOW}Response: $3${NC}"
  fi
}

# Introduction
echo -e "${BLUE}FusionAuth API Tests${NC}"
echo -e "${BLUE}====================${NC}"
echo "Testing API at: $BASE_URL"
echo "Test email: $EMAIL"

# Test 1: Sign Up a new user
section "Test 1: Sign Up a new user"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"$FIRST_NAME\",
    \"lastName\": \"$LAST_NAME\"
  }")

if [[ $SIGNUP_RESPONSE == *"access_token"* ]]; then
  test_result 0 "Signup successful!"
  # Extract tokens and user ID
  ACCESS_TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//g')
  FUSION_AUTH_TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"fusion_auth_token":"[^"]*' | sed 's/"fusion_auth_token":"//g')
  USER_ID=$(echo $SIGNUP_RESPONSE | grep -o '"id":"[^"]*' | sed 's/"id":"//g')
  echo "Access Token: ${ACCESS_TOKEN:0:20}..."
  echo "User ID: $USER_ID"
else
  test_result 1 "Signup failed!" "$SIGNUP_RESPONSE"
  exit 1
fi

# Test 2: Try to sign up with the same email (should fail)
section "Test 2: Try to sign up with the same email (should fail)"
DUPLICATE_SIGNUP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"$FIRST_NAME\",
    \"lastName\": \"$LAST_NAME\"
  }")

if [[ $DUPLICATE_SIGNUP -eq 409 ]]; then
  test_result 0 "Correctly rejected duplicate email (got 409)"
else
  test_result 1 "Test failed! Expected 409, got $DUPLICATE_SIGNUP"
fi

# Test 3: Try to sign up with invalid email (should fail)
section "Test 3: Try to sign up with invalid email (should fail)"
INVALID_EMAIL=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }')

if [[ $INVALID_EMAIL -eq 400 ]]; then
  test_result 0 "Correctly rejected invalid email (got 400)"
else
  test_result 1 "Test failed! Expected 400, got $INVALID_EMAIL"
fi

# Test 4: Login with correct credentials
section "Test 4: Login with correct credentials"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

if [[ $LOGIN_RESPONSE == *"access_token"* ]]; then
  test_result 0 "Login successful!"
  # Extract the token for later use (in case it's different from signup)
  ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//g')
  echo "Token received: ${ACCESS_TOKEN:0:20}..."
else
  test_result 1 "Login failed!" "$LOGIN_RESPONSE"
fi

# Test 5: Login with wrong password
section "Test 5: Login with wrong password"
WRONG_PASSWORD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"wrongpassword\"
  }")

if [[ $WRONG_PASSWORD -eq 401 ]]; then
  test_result 0 "Correctly rejected wrong password (got 401)"
else
  test_result 1 "Test failed! Expected 401, got $WRONG_PASSWORD"
fi

# Test 6: Validate token
section "Test 6: Validate token"
VALIDATE_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/validate" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $VALIDATE_RESPONSE == *"access_token"* ]]; then
  test_result 0 "Token validation successful!"
else
  test_result 1 "Token validation failed!" "$VALIDATE_RESPONSE"
fi

# Test 7: Get user profile with token
section "Test 7: Get user profile with token"
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $PROFILE_RESPONSE == *"$EMAIL"* ]]; then
  test_result 0 "Profile retrieval successful!"
else
  test_result 1 "Profile retrieval failed!" "$PROFILE_RESPONSE"
fi

# Test 8: Get user profile without token
section "Test 8: Get user profile without token"
NO_TOKEN=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/auth/me")

if [[ $NO_TOKEN -eq 401 ]]; then
  test_result 0 "Correctly rejected access without token (got 401)"
else
  test_result 1 "Test failed! Expected 401, got $NO_TOKEN"
fi

# Test 9: Create API key
section "Test 9: Create API key"
API_KEY_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/api-keys" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API Key"
  }')

if [[ $API_KEY_RESPONSE == *"key"* ]]; then
  test_result 0 "API key creation successful!"
  API_KEY=$(echo $API_KEY_RESPONSE | grep -o '"key":"[^"]*' | sed 's/"key":"//g')
  echo "API Key: ${API_KEY:0:10}..."
else
  test_result 1 "API key creation failed!" "$API_KEY_RESPONSE"
fi

# Summary
section "Test Summary"
echo "All tests completed."
echo "User created with email: $EMAIL"
echo "User ID: $USER_ID"
echo "Access Token: ${ACCESS_TOKEN:0:20}..."

exit 0