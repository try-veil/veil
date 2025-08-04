.PHONY: help setup run dev prod down logs migrate clean-locks

help:
	@echo "Available commands:"
	@echo "  setup       - Install dependencies and setup .env files"
	@echo "  dev         - Start development stack (live editing, hot reload)"
	@echo "  prod        - Start production stack (built images)"
	@echo "  down        - Stop and remove containers"
	@echo "  logs        - View aggregated logs"
	@echo "  migrate     - Run database migrations"
	@echo "  clean-locks - Remove old yarn.lock files and regenerate pnpm-lock.yaml"
	@echo "  run         - Legacy run command (use 'dev' instead)"

setup:
	@echo "🔧 Setting up project dependencies and configuration"
	@echo "📦 Setting up pnpm lock files"
	@echo "  → Backend: Setting up pnpm-lock.yaml"
	@cd packages/platform/api && \
		if [ ! -f pnpm-lock.yaml ]; then \
			echo "    Generating pnpm-lock.yaml from package.json"; \
			pnpm install --lockfile-only; \
		else \
			echo "    pnpm-lock.yaml already exists"; \
		fi
	@echo "  → Frontend: Setting up pnpm-lock.yaml"
	@cd packages/platform/web/apps/complete-application && \
		if [ ! -f pnpm-lock.yaml ]; then \
			echo "    Generating pnpm-lock.yaml from package.json"; \
			pnpm install --lockfile-only; \
		else \
			echo "    pnpm-lock.yaml already exists"; \
		fi
	@echo "📦 Installing dependencies"
	@cd packages/platform/api && pnpm install
	@cd packages/platform/web/apps/complete-application && pnpm install
	@echo "📄 Setting up .env files"
	@cp -n packages/platform/api/.env.example packages/platform/api/.env || true
	@cp -n packages/platform/web/apps/complete-application/.env.example packages/platform/web/apps/complete-application/.env || true
	@echo "✅ Setup complete!"

# DEVELOPMENT: live editing, hot reload
dev:
	@echo "⏳ Preparing .env files for dev (if missing)"
	@cp -n packages/platform/api/.env.example packages/platform/api/.env || true
	@cp -n packages/platform/web/apps/complete-application/.env.example packages/platform/web/apps/complete-application/.env || true
	@echo "📦 Setting up pnpm lock files"
	@$(MAKE) setup-pnpm-locks
	@echo "🚀 Starting development stack"
	docker compose -f docker-compose.dev.yml up --build

# PRODUCTION: built images, no source mounts
prod:
	@echo "📦 Setting up pnpm lock files"
	@$(MAKE) setup-pnpm-locks
	@echo "🚧 Building production images"
	docker compose -f docker-compose.prod.yml build
	@echo "🚀 Starting production stack"
	docker compose -f docker-compose.prod.yml up



# Clean old yarn lock files and regenerate pnpm locks
clean-locks:
	@echo "🧹 Cleaning old lock files and regenerating pnpm locks"
	@echo "  → Removing yarn.lock files"
	@rm -f packages/platform/api/yarn.lock
	@rm -f packages/platform/web/apps/complete-application/yarn.lock
	@echo "  → Removing existing pnpm-lock.yaml files"
	@rm -f packages/platform/api/pnpm-lock.yaml
	@rm -f packages/platform/web/apps/complete-application/pnpm-lock.yaml
	@echo "  → Regenerating pnpm-lock.yaml files"
	@echo "    Backend: Generating pnpm-lock.yaml"
	@cd packages/platform/api && pnpm install --lockfile-only
	@echo "    Frontend: Generating pnpm-lock.yaml"
	@cd packages/platform/web/apps/complete-application && pnpm install --lockfile-only
	@echo "✅ Lock files cleaned and regenerated!"

# Tear down either stack (stops & removes containers)
down:
	docker compose -f docker-compose.dev.yml down || true
	docker compose -f docker-compose.prod.yml down || true

# Tail key service logs in dev
logs:
	docker compose -f docker-compose.dev.yml logs -f backend frontend caddy

migrate:
	@echo "🐘 Starting Postgres if not already running..."
	(cd packages/platform/api && docker-compose up -d my_postgres)

	@echo "⏳ Waiting for Postgres to be ready..."
	(cd packages/platform/api && docker-compose exec -T my_postgres pg_isready -U myuser -d mydb)

	@echo "✅ Postgres is up. Running Prisma migration..."
	(cd packages/platform/api && \
		pnpm prisma migrate dev --name init && \
		pnpm prisma generate)

# Legacy commands (kept for compatibility)
run:
	concurrently -n "CADDY,BACKEND,FRONTEND" -c "cyan,green,magenta" \
		"cd packages/caddy && make watch" \
		"cd packages/platform/api && docker-compose up -d && timeout /t 10 /nobreak >nul && pnpm run start:dev" \
		"cd packages/platform/web/apps/complete-application && docker-compose up -d && timeout /t 20 /nobreak >nul && pnpm run dev"

run-windows:
	concurrently -n "CADDY,BACKEND,FRONTEND" -c "cyan,green,magenta" \
		"cd packages/caddy && make watch-windows" \
		"cd packages/platform/api && docker-compose up -d && powershell -Command \"Start-Sleep 10\" && pnpm run start:dev" \
		"cd packages/platform/web/apps/complete-application && docker-compose up -d && powershell -Command \"Start-Sleep 20\" && pnpm run dev"

run-bash:
	concurrently -n "CADDY,BACKEND,FRONTEND" -c "cyan,green,magenta" \
		"cd packages/caddy && make watch-bash" \
		"cd packages/platform/api && docker-compose up -d && sleep 10 && pnpm run start:dev" \
		"cd packages/platform/web/apps/complete-application && docker-compose up -d && sleep 20 && pnpm run dev"
