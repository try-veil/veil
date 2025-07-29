# Local Development Guide

This guide explains how to run Veil locally for development, both in Docker and natively with Zellij.

## ✅ FusionAuth Connection Issue - RESOLVED

**Problem**: Frontend container API routes were using `NEXT_PUBLIC_FUSIONAUTH_URL` (localhost:9011) for server-side requests, causing connection failures.

**Solution**: Updated all API routes to use `process.env.FUSIONAUTH_URL || process.env.NEXT_PUBLIC_FUSIONAUTH_URL` which correctly uses the Docker network hostname (`fusionauth:9011`) for server-side requests while keeping localhost URLs for client-side requests.

**Files Fixed**:
- `src/app/api/auth/signup/route.ts`
- `src/app/api/auth/login/route.ts` 
- `src/app/api/auth/callback/route.ts`
- `src/app/api/auth/[...nextauth]/route.ts`

**Status**: ✅ **RESOLVED** - Signup/login now working correctly

## Development Options

### Option 1: Docker Development (Recommended for Getting Started)

```bash
# Complete setup and run everything in Docker
make run

# Quick development start (services already set up)
make dev

# Stop all services
make stop
```

**Services URLs:**
- Platform API: http://localhost:3000
- Platform Frontend: http://localhost:3001
- Veil Management API: http://localhost:2020
- Veil Gateway: http://localhost:2021
- FusionAuth: http://localhost:9011
- MinIO Console: http://localhost:9001

### Option 2: Local Development with Zellij (Native Performance)

This runs the application services locally while keeping infrastructure services in Docker.

**Prerequisites:**
- Install Zellij: `cargo install zellij` or from https://zellij.dev/
- Ensure Node.js 22+, Go 1.22+, and pnpm are installed

**Setup:**
```bash
# Setup local environment files
make setup-local

# Start local development (opens Zellij with multiple panes)
make local
```

**What happens with `make local`:**
1. **Pane 1**: Docker infrastructure services (PostgreSQL, FusionAuth, MinIO)
2. **Pane 2**: Caddy with Veil module (native Go)
3. **Pane 3**: Platform API (native Node.js with pnpm)
4. **Pane 4**: Platform Frontend (native Next.js with pnpm)

**Benefits of local development:**
- ⚡ Faster build times and hot reloading
- 🔍 Better debugging capabilities
- 💾 Lower memory usage
- 🔧 Direct access to logs and processes

### Option 3: Infrastructure Only (For Custom Workflows)

Start only the infrastructure services and run your own processes:

```bash
# Start only PostgreSQL, FusionAuth, and MinIO
make infra

# Then in separate terminals:
cd packages/platform/api && cp .env.local .env && pnpm run start:dev
cd packages/platform/web/apps/complete-application && cp .env.local .env && pnpm run dev
cd packages/caddy && unset GOROOT && make watch
```

## Zellij Layout Details

The provided Zellij layout (`zellij-layout.kdl`) creates:

**Tab 1: "Veil Dev"** - Main development environment
- **Docker Services**: Infrastructure services
- **Caddy (Veil)**: API gateway with watch mode
- **Platform API**: NestJS backend
- **Platform Frontend**: Next.js application

**Tab 2: "Services Status"** - Monitoring
- **Docker Status**: Watch container status
- **Logs**: Follow Docker service logs

**Tab 3: "Terminal"** - General terminal for commands

## Environment Configuration

### Docker Environment
- Uses Docker network hostnames (e.g., `fusionauth:9011`)
- Configured in `docker-compose.yml`

### Local Environment
- Uses localhost URLs (e.g., `http://localhost:9011`)
- Configured in `.env.local` files

## Troubleshooting

### FusionAuth Connection Issues
- Ensure FusionAuth container is healthy: `docker-compose ps`
- Check FusionAuth logs: `docker-compose logs fusionauth`
- Verify environment variables in container: `docker-compose exec platform_frontend env | grep FUSION`

### Port Conflicts
- Stop conflicting services: `lsof -i :PORT_NUMBER`
- Modify ports in `docker-compose.yml` if needed

### Go Build Issues
- Ensure GOROOT is unset: `unset GOROOT`
- Check Go version: `go version` (should be 1.22+)
- Remove old Go installations: `sudo rm -rf /usr/local/go`

### Zellij Issues
- Install Zellij: https://zellij.dev/documentation/installation
- Modify layout paths in `zellij-layout.kdl` if needed
- Use `Ctrl+p + q` to quit Zellij session

## Development Workflow

1. **Initial Setup**: `make run` (first time)
2. **Daily Development**: `make local` (for best performance)
3. **Docker Testing**: `make dev` (to test containerized environment)
4. **Production Testing**: `make run` (full production-like setup)

## Performance Tips

- Use `make local` for fastest development experience
- Use `make dev` when you need to test Docker-specific issues
- Use `make infra` + manual processes for maximum control
- Monitor resource usage with `docker stats` and `htop`