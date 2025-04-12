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
if ! command_exists curl; then
    print_status "curl not found. Installing curl..."
    apt install curl
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install curl. Please install it manually."
        exit 1
    fi
    print_status "curl installed successfully"
else
    print_status "curl is already installed"
fi

# Check and install Go if not present
if ! command_exists go; then
    print_status "Go not found. Installing Go using Homebrew..."
    apt install golang
    
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
    print_status "Installing Caddy using apt..."
    apt update

    sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt update
    sudo apt install caddy
    
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
apt --version
go version
caddy version
xcaddy version

print_status "Installation complete! All components are now installed."