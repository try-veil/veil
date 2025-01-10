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

1. Review the [API Documentation](./api/readme.md)
2. Set up your first API using the [Provider Guide](./api/provider/onboarding.md)
3. Explore [Consumer APIs](./api/consumer/readme.md)

## Related Documentation

- [Architecture Overview](./contribution/architecture/arch.mmd)
- [API Documentation](./api/readme.md)
