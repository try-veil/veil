#!/bin/bash

# Exit on error
set -e

echo "Running Veil module tests..."

# Ensure CGO is enabled for SQLite
export CGO_ENABLED=1

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/.."

# Run tests with coverage
go test -v -race -coverprofile=coverage.out ./...

# Display coverage report
go tool cover -func=coverage.out

echo "Tests completed successfully!" 