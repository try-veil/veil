# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Veil is a monorepo containing a Caddy module for API management with a platform for subscription-based access control. The repository has three main components:

- **packages/caddy/**: Go-based Caddy module that provides the core API gateway functionality
- **packages/platform/api/**: NestJS backend server for user management, billing, and API onboarding
- **packages/platform/web/**: Next.js frontend applications including the main dashboard and landing pages

## Common Development Commands

### Full Stack Development
```bash
# Complete setup and run all services (recommended first run)
make run

# Quick development start (services already set up)
make dev

# Local development with Zellij (best performance)
make local

# Setup dependencies and environment files only
make setup

# Setup local development environment files
make setup-local

# Start only infrastructure services (for local development)
make infra

# Build Caddy module only
make build-caddy

# Start Docker services only
make start-services

# Run database migrations only
make migrate

# Stop all services
make stop

# Clean up everything (removes containers and volumes)
make clean

# View service logs
make logs
```

### Caddy Module Development
```bash
cd packages/caddy/

# Build the Caddy binary with Veil module
make build

# Watch for changes and auto-rebuild/restart
make watch

# Run tests
make test

# Run e2e tests
make test-e2e

# Clean build artifacts and database
make clean
make clean-db
```

### Platform API Development
```bash
cd packages/platform/api/

# Install dependencies
pnpm install

# Start development server
pnpm run start:dev

# Run tests
pnpm run test
pnpm run test:e2e
pnpm run test:cov

# Lint code
pnpm run lint

# Database operations
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma studio
```

### Frontend Development
```bash
cd packages/platform/web/apps/complete-application/

# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Lint code
pnpm run lint
```

## Architecture Overview

### Core Components

1. **Veil Caddy Module** (`packages/caddy/`):
   - Custom Caddy middleware written in Go
   - Handles API request validation and subscription checking
   - Uses SQLite for local data storage
   - Integrates with the platform API for user management

2. **Platform API** (`packages/platform/api/`):
   - NestJS application with PostgreSQL database
   - Manages users, subscriptions, API onboarding, and billing
   - Uses Prisma ORM for database operations
   - Implements JWT-based authentication with FusionAuth

3. **Web Applications** (`packages/platform/web/`):
   - Multiple Next.js applications for different use cases
   - Main dashboard for API management and analytics
   - Landing pages and documentation sites
   - Uses Tailwind CSS and Radix UI components

### Data Flow

1. API requests hit the Caddy module first
2. Caddy validates requests against subscription rules stored in SQLite
3. For user management operations, Caddy communicates with the Platform API
4. Platform API manages user data, subscriptions, and billing in PostgreSQL
5. Frontend applications interact with Platform API for dashboard functionality

### Key Technologies

- **Go**: Caddy module development with CGO enabled for SQLite
- **TypeScript/NestJS**: Backend API development
- **Next.js/React**: Frontend applications
- **PostgreSQL**: Primary database for platform data
- **SQLite**: Local storage for Caddy module
- **Prisma**: ORM for database operations
- **Docker**: Containerization for development and deployment

## Development Notes

- The project uses a unified Docker Compose setup for all services
- All services are orchestrated through the root Makefile for seamless development
- The project requires `xcaddy` for building the Caddy module with CGO enabled
- Database migrations are handled through Prisma for the platform API
- The Caddy module uses file watching for development with automatic rebuilds
- All services communicate through a shared Docker network
- Environment files are automatically created from examples during setup

## Service URLs

When running `make run`, the following services will be available:

- **Platform API**: http://localhost:3000
- **Platform Frontend**: http://localhost:3001
- **Veil Management API**: http://localhost:2020
- **Veil Gateway**: http://localhost:2021
- **FusionAuth**: http://localhost:9011
- **MinIO Console**: http://localhost:9001
- **Grafana**: http://localhost:4000

## Testing

- Go tests for the Caddy module: `make test` in `packages/caddy/`
- NestJS tests for platform API: `pnpm run test` in `packages/platform/api/`
- E2E tests available for both Caddy module and platform API
- No specific test commands configured for frontend applications