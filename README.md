# Veil - API Management Module for Caddy

Veil is a Caddy module that provides API management capabilities, including subscription-based access control and request validation. It acts as a middleware that validates API requests based on subscription levels and required headers.

## Features

- Subscription-based access control
- Request header validation
- API usage statistics tracking
- Dynamic API onboarding
- SQLite database storage

## Installation

1. Build Caddy with the Veil module:

```bash
xcaddy build --with github.com/techsavvyash/veil/packages/caddy
```

## Configuration

### Caddyfile Syntax

```caddy
{
    order veil_handler before reverse_proxy
}

:2020 {
    veil_handler {
        db_path "path/to/database.db"
    }

    handle /api/* {
        reverse_proxy backend:8080
    }
}
```

### Configuration Options

- `db_path`: Path to the SQLite database file (default: "veil.db")

## API Onboarding

To onboard a new API, send a POST request to the management endpoint:

```bash
curl -X POST http://localhost:2020/veil/api/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/api/v1/products/*",
    "upstream": "http://localhost:8081",
    "required_subscription": "premium",
    "methods": ["GET", "POST"],
    "required_headers": ["X-API-Key", "X-Request-ID"],
    "parameters": [
      {
        "name": "category",
        "type": "query",
        "required": true
      }
    ]
  }'
```

## Making API Requests

When making requests to protected APIs, include the required headers:

```bash
curl http://localhost:2020/api/v1/products \
  -H "X-Subscription-Key: premium" \
  -H "X-API-Key: your-api-key" \
  -H "X-Request-ID: request-123"
```

## Development

### Project Structure

```
packages/caddy/
├── internal/
│   ├── config/     # Configuration types and parsing
│   ├── handlers/   # HTTP handlers and middleware
│   ├── models/     # Data models and types
│   └── store/      # Database operations
├── test/
│   └── Caddyfile  # Test configuration
├── module.go      # Main module registration
└── README.md
```

### Building and Testing

1. Clone the repository:

```bash
git clone https://github.com/techsavvyash/veil.git
```

2. Build the module:

```bash
cd veil/packages/caddy
go build
```

3. Run tests:

```bash
go test ./...
```

## License

MIT License
