.PHONY: setup build-caddy start-services run stop clean logs migrate

# Setup all dependencies and environment files
setup:
	@echo "🔧 Setting up Veil development environment..."
	
	# Setup API environment
	@if [ ! -f packages/platform/api/.env ]; then \
		echo "📝 Creating API .env file..."; \
		cd packages/platform/api && cp .env.example .env; \
	fi
	
	# Setup frontend environment  
	@if [ ! -f packages/platform/web/apps/complete-application/.env ]; then \
		echo "📝 Creating frontend .env file..."; \
		cd packages/platform/web/apps/complete-application && cp .env.example .env; \
	fi
	
	# Install dependencies
	@echo "📦 Installing API dependencies..."
	cd packages/platform/api && pnpm install
	
	@echo "📦 Installing frontend dependencies..."
	cd packages/platform/web/apps/complete-application && pnpm install
	
	@echo "✅ Setup complete!"

# Build the Caddy module with Veil
build-caddy:
	@echo "🏗️ Building Caddy with Veil module..."
	cd packages/caddy && make build
	@echo "✅ Caddy build complete!"

# Start all Docker services
start-services:
	@echo "🐳 Starting all services with Docker Compose..."
	docker-compose up -d
	@echo "⏳ Waiting for services to be ready..."
	sleep 15
	@echo "✅ All services started!"

# Run database migrations
migrate:
	@echo "🗄️ Running database migrations..."
	@echo "⏳ Waiting for database to be ready..."
	until docker-compose exec -T app_postgres pg_isready -U myuser -d mydb; do sleep 2; done
	
	@echo "🔄 Running Prisma migrations..."
	cd packages/platform/api && \
		pnpm prisma migrate deploy && \
		pnpm prisma generate
	@echo "✅ Migrations complete!"

# Full development startup
run: setup build-caddy start-services migrate
	@echo "🚀 Starting Caddy with Veil module..."
	@echo "📊 Services status:"
	@echo "  - Platform API: http://localhost:3000"
	@echo "  - Platform Frontend: http://localhost:3001" 
	@echo "  - Veil Management API: http://localhost:2020"
	@echo "  - Veil Gateway: http://localhost:2021"
	@echo "  - FusionAuth: http://localhost:9011"
	@echo "  - MinIO Console: http://localhost:9001"
	@echo "  - Grafana: http://localhost:4000"
	@echo ""
	@echo "🎯 Starting Caddy in watch mode..."
	cd packages/caddy && make watch

# Stop all services
stop:
	@echo "🛑 Stopping all services..."
	docker-compose down
	@echo "✅ All services stopped!"

# Clean up everything
clean: stop
	@echo "🧹 Cleaning up..."
	docker-compose down -v --remove-orphans
	cd packages/caddy && make clean
	@echo "✅ Cleanup complete!"

# Show logs
logs:
	@echo "📋 Showing service logs..."
	docker-compose logs -f

# Quick start for development (without full rebuild)
dev:
	@echo "🚀 Quick development start..."
	docker-compose up -d
	sleep 10
	cd packages/caddy && unset GOROOT && make watch

# Local development with Zellij (runs services locally, not in Docker)
local: setup-local
	@echo "🔧 Starting local development with Zellij..."
	@echo "This will open a Zellij session with multiple panes:"
	@echo "  - Docker services (infrastructure only)"
	@echo "  - Caddy with Veil module"
	@echo "  - Platform API (Node.js locally)"
	@echo "  - Platform Frontend (Next.js locally)"
	@echo ""
	@echo "Make sure you have Zellij installed: https://zellij.dev/"
	@echo "Press Enter to continue or Ctrl+C to cancel..."
	@read
	zellij --layout ./zellij-layout.kdl

# Setup local development environment files
setup-local:
	@echo "🔧 Setting up local development environment..."
	@echo "📝 Creating local environment files..."
	@if [ ! -f packages/platform/api/.env.local ]; then \
		echo "API .env.local already exists"; \
	fi
	@if [ ! -f packages/platform/web/apps/complete-application/.env.local ]; then \
		echo "Frontend .env.local already exists"; \
	fi
	@echo "✅ Local setup complete!"
	@echo ""
	@echo "To run locally: make local"
	@echo "To run in Docker: make dev"

# Start only infrastructure services (for local development)
infra:
	@echo "🐳 Starting infrastructure services only..."
	docker-compose up -d app_postgres fusionauth_db fusionauth search minio createbuckets
	@echo "✅ Infrastructure services started!"
	@echo "Services available:"
	@echo "  - PostgreSQL: localhost:5433"
	@echo "  - FusionAuth: localhost:9011"
	@echo "  - MinIO: localhost:9000-9001"
