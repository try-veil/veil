# Development Setup Guide

## Prerequisites

- Caddy Server (v2.0 or higher)
- cURL (for testing)

## Installation

### 1. Install Caddy Server

```bash
# macOS (using Homebrew)
brew install caddy

# Linux (Debian/Ubuntu)
sudo apt install caddy

# Windows for caddy
# Download the latest Caddy binary from: https://caddyserver.com/download
# Install and add its path to system variables

# Windows for xcaddy
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest


# How to use 'make' command on Windows
# Download & install MSYS2 from https://www.msys2.org/ (If you have c installed on your device then it might already present on your system)

# Open the MSYS2 Shell (not Git Bash) from Start Menu.

# Update the package database:
pacman -Sy

# Install make:
pacman -S make

# Close MSYS2, then reopen Git Bash, and test:
make --version

# Now make it available in Git bash

# Find the MSYS2 make binary path
# Usually it's here: C:\msys64\usr\bin\
# Edit your .bashrc or .bash_profile in Git Bash: 
nano ~/.bashrc
export PATH=$PATH:/c/msys64/usr/bin
# Save and exit (Ctrl + O, Enter, then Ctrl + X).

# Reload Git Bash config:
source ~/.bashrc

```

### 2. Start Caddy Server

```bash
caddy run
```

### 3. Configure Gateway

```bash
# Load gateway configuration
curl localhost:2019/load \
  -H "Content-Type: application/json" \
  -d @config/caddy.json

# Verify configuration
curl localhost:2019/config/
```

## Next Steps

## Related Documentation
