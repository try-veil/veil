#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status messages
print_status() {
    echo "→ $1"
}

# Check and install Homebrew if not present
if ! command_exists brew; then
    print_status "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install Homebrew. Please install it manually."
        exit 1
    fi
    print_status "Homebrew installed successfully"
else
    print_status "Homebrew is already installed"
fi

# Check and install Go if not present
if ! command_exists go; then
    print_status "Go not found. Installing Go using Homebrew..."
    brew install go
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install Go. Please install it manually."
        exit 1
    fi
    print_status "Go installed successfully"
else
    print_status "Go is already installed"
fi

# Check and install Caddy if not present
if ! command_exists caddy; then
    print_status "Installing Caddy using Homebrew..."
    brew update && brew install caddy
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install Caddy. Please try installing it manually."
        exit 1
    fi
    print_status "Caddy installed successfully"
else
    print_status "Caddy is already installed"
fi

# Check and install xcaddy if not present
if ! command_exists xcaddy; then
    print_status "Installing xcaddy using Go..."
    go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install xcaddy. Please try installing it manually."
        exit 1
    fi
    print_status "xcaddy installed successfully"
else
    print_status "xcaddy is already installed"
fi

# Verify installations
print_status "Verifying installations..."
brew --version
go version
caddy version
xcaddy version

print_status "Installation complete! All components are now installed."