# Veil - API Management Module for Caddy

Veil is a Caddy module that provides API management capabilities, including subscription-based access control and request validation. It acts as a middleware that validates API requests based on subscription levels and required headers.

## Demo

Below is a small recording of the terminal we onboard the [Dummy JSON](https://dummyjson.com/todos) API and put it behind veil.

![Veil Demo](./demo.gif)

## Features

- Subscription-based access control
- Request header validation
- API usage statistics tracking
- Dynamic API onboarding
- SQLite database storage


## Local Setup

1. Clone the project
2. Install the necessary dependencies, for macOS the script is present in [./scrips/setup/mac.sh](./scrips/setup/mac.sh)
3. The [Makefile](./Makefile) has the commands required for you to get around to working with Veil.


## Configuration

### Caddyfile Syntax

Refer the base [Caddyfile](./Caddyfile) for the config around registering Veil at port 2020.

### Configuration Options

- `db_path`: Path to the SQLite database file (default: "veil.db")

## API Onboarding

To onboard a new API, send a POST request to the management endpoint:

```bash
curl -X POST http://localhost:2020/veil/api/onboard \
-H "Content-Type: application/json" \
-d '{
  "path": "/weather/*",
  "upstream": "http://localhost:8082/weather",
  "required_subscription": "weather-subscription",
  "methods": ["GET"],
  "required_headers": ["X-Test-Header"],
  "api_keys": [{"key": "weather-test-key-2", "name": "Weather Test Key 2"}]
}' | jq
```

## License

MIT License
