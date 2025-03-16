#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting End-to-End Test for Veil API Gateway${NC}\n"

# Run the test with verbose output
go test -v api_onboarding_test.go 2>&1 | while read -r line; do
    if [[ $line == *"PASS"* ]]; then
        echo -e "${GREEN}$line${NC}"
    elif [[ $line == *"FAIL"* ]]; then
        echo -e "${RED}$line${NC}"
    else
        echo "$line"
    fi
done

echo -e "\n${BLUE}Test Execution Complete${NC}" 