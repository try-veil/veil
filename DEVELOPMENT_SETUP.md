# Veil Development Setup

This guide will help you set up Veil for development with all services running seamlessly.

## Prerequisites

1. **Docker Desktop** - Must be running
   - Install from: https://www.docker.com/products/docker-desktop/
   - Start Docker Desktop before running Veil

2. **Go 1.22+** - For Caddy module development
   - Install via Homebrew: `brew install go`
   - Ensure only one Go installation exists

3. **Node.js 22+** - For platform services
   - Install via Homebrew: `brew install node@22`

4. **pnpm** - Package manager
   - Install globally: `npm install -g pnpm`

5. **xcaddy** - For building Caddy with custom modules
   - Install: `go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest`

## Environment Setup

Make sure your Go environment is clean:

```bash
# Remove GOROOT if set to old installation
unset GOROOT

# Verify correct Go version
which go  # Should show /opt/homebrew/bin/go
go version  # Should show go1.24.3 or later
```

## Quick Start

1. **Start Docker Desktop** - This must be running first!

2. **Run the complete setup:**
   ```bash
   make run
   ```

This single command will:
- Set up environment files
- Install all dependencies
- Build the Caddy module with Veil
- Start all Docker services
- Run database migrations
- Start Caddy in watch mode

## Service URLs

Once running, access these services:

- **Platform API**: http://localhost:3000
- **Platform Frontend**: http://localhost:3001
- **Veil Management API**: http://localhost:2020
- **Veil Gateway**: http://localhost:2021
- **FusionAuth**: http://localhost:9011
- **MinIO Console**: http://localhost:9001
- **Grafana**: http://localhost:4000

## Development Commands

```bash
# Quick development start (after initial setup)
make dev

# Stop all services
make stop

# Clean up everything
make clean

# View service logs
make logs

# Build Caddy module only
make build-caddy

# Run database migrations only
make migrate
```

## Troubleshooting

### Docker Issues
- Ensure Docker Desktop is running
- Check Docker daemon: `docker info`

### Go Build Issues
- Ensure only one Go installation exists
- Remove old installations: `sudo rm -rf /usr/local/go`
- Unset GOROOT: `unset GOROOT`

### Database Issues
- Wait for PostgreSQL to be ready before running migrations
- Check database status: `docker-compose logs app_postgres`

### Port Conflicts
- Ensure ports 2020, 2021, 3000, 3001, 5433, 9011 are available
- Stop conflicting services or modify ports in docker-compose.yml