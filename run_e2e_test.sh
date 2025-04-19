#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set the binary name and paths
BINARY_NAME="caddy"
BUILD_DIR="."
TEST_DIR="./tests/e2e"

# Compile the Go code into a binary
echo -e "${BLUE}Building the binary...${NC}"
make build

# Check if the build was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

# Copy the binary to the test directory
cp $BUILD_DIR/$BINARY_NAME $TEST_DIR/

# Navigate to the test directory
cd $TEST_DIR

# clean up any existing .db files
rm -f ./*.db

# Run the test with verbose output
echo -e "${BLUE}Starting End-to-End Test for Veil API Gateway${NC}\n"

# echo -e "${BLUE}Running API Onboarding Test${NC}"
go test ./... -v 2>&1 | while read -r line; do
    if [[ $line == *"PASS"* ]]; then
        echo -e "${GREEN}$line${NC}"
    elif [[ $line == *"FAIL"* ]]; then
        echo -e "${RED}$line${NC}"
    else
        echo "$line"
    fi
done

# Capture the exit status of the go test command
TEST_EXIT_STATUS=$?

# Return the exit status to indicate success or failure
if [ $TEST_EXIT_STATUS -ne 0 ]; then
    echo -e "${RED}One or more tests failed!${NC}"
    exit $TEST_EXIT_STATUS
else
    echo -e "${GREEN}All tests passed!${NC}"
fi