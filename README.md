# Veil - Opinionated Caddy Module

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
2. Veil depends on [go](https://go.dev), [xcaddy](https://github.com/caddyserver/xcaddy), and whatever platform specific `C` compilation tools you'll need to compile with `CGO_ENABLED=1`.
  2.1 Setup scripts have been provided for some platforms - [macOS](./scripts/README.md)
3. The [Makefile](./Makefile) has the commands required for you to get around to working with Veil.

For a detailed setup guide please refer [setup docs](./docs/docs/contribution/setup.md)

## Configuration

### Caddyfile Syntax

Refer the base [Caddyfile](./Caddyfile) for the config around registering Veil at port 2020.

### Configuration Options

- `db_path`: Path to the SQLite database file (default: "veil.db")

## Reference

- [Veil Docs](https://try-veil.github.io/veil/)
- OpenAPI swagger reference
  - [Veil Core](https://try-veil.github.io/veil/docs/swagger/veil-api-management)


## License

[MIT License](./LICENSE)
