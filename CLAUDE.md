# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Caddy Module (packages/caddy)

```bash
# Build Veil with Caddy
cd packages/caddy
make build

# Run tests
make test

# Run end-to-end tests
make test-e2e

# Run Veil server
make run

# Clean build artifacts
make clean

# Clean database
make clean-db

# Watch mode for development
make watch
```

### Platform API (packages/platform-api)

```bash
cd packages/platform-api
# Development server
bun run dev

# Database commands
bun run db:push      # Push schema to database
bun run db:studio    # Open Drizzle Studio
bun run db:generate  # Generate migrations
```

### Node.js SDK (packages/sdks/nodejs)

```bash
cd packages/sdks/nodejs
# Build TypeScript
npm run build

# Run tests
npm test
npm run test:coverage

# Lint
npm run lint
npm run lint:fix
```

### Logging Service (packages/logging/webhook-service)

```bash
cd packages/logging/webhook-service
npm start
npm run dev
```

## Architecture Overview

### Project Structure

Veil is a monorepo containing multiple packages:

1. **packages/caddy** - Core Caddy module written in Go
   - Implements API gateway functionality as a Caddy plugin
   - Uses SQLite for persistence via GORM
   - Handles subscription-based access control and request validation
   - Configuration via Caddyfile at port 2020

2. **packages/platform-api** - BFF (Backend for Frontend) using Bun/Elysia
   - TypeScript-based API server
   - Uses Drizzle ORM with PostgreSQL
   - Provides authentication with JWT/Bearer tokens
   - Includes Swagger documentation

3. **packages/sdks/nodejs** - Node.js SDK for Veil API
   - TypeScript SDK for interacting with Veil
   - Uses Axios for HTTP requests
   - Comprehensive test coverage with Jest

4. **packages/logging** - Logging infrastructure
   - webhook-service: Express.js service for Grafana folder webhooks
   - Integration with FusionAuth for user management

### Key Technical Details

- **Caddy Integration**: Veil operates as a Caddy module with custom handler (`veil_handler`)
- **Database**: SQLite for Caddy module, PostgreSQL for platform API
- **Authentication**: Subscription key validation via `X-Subscription-Key` header
- **Build System**: Go modules with xcaddy for Caddy, Bun for TypeScript services
- **Testing**: Go tests for Caddy module, Jest for Node.js SDK

### API Management Flow

1. APIs are onboarded through the management endpoint at `/veil/api/*`
2. Veil validates requests based on subscription keys stored in SQLite
3. Valid requests are proxied to upstream services
4. Usage statistics are tracked and stored

### Prerequisites

- Go 1.21+ with CGO enabled
- xcaddy for building Caddy with custom modules
- Bun runtime for platform-api
- Node.js 14+ for SDKs and logging services
- SQLite and PostgreSQL databases