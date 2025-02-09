#!/bin/bash

# Exit on error
set -e

echo "Building Caddy with Veil module..."

# Ensure CGO is enabled
export CGO_ENABLED=1

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/.."

# Clean any existing build
rm -f caddy

# Build Caddy with xcaddy
xcaddy build \
    --with github.com/techsavvyash/veil/packages/caddy=.

echo "Build complete! Binary is available at: ./caddy" 