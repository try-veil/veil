.PHONY: setup run

setup:
	(cd packages/platform/api && \
	pnpm install && \
	cp --update=none .env.example .env)

	(cd packages/platform/web/apps/complete-application && \
	pnpm install && \
	cp --update=none .env.example .env)

migrate:
	@echo "🐘 Starting Postgres if not already running..."
	(cd packages/platform/api && docker-compose up -d)

	@echo "⏳ Waiting for Postgres on port 5433..."
	until nc -z localhost 5433; do sleep 1; done

	@echo "✅ Postgres is up. Running Prisma migration..."
	(cd packages/platform/api && \
		pnpm prisma migrate dev --name init && \
		pnpm prisma generate)

run:
	concurrently -n "CADDY,BACKEND,FRONTEND" -c "cyan,green,magenta" \
		"cd packages/caddy && make watch" \
		"sh -c 'cd packages/platform/api && docker-compose up -d && sleep 10 && pnpm run start:dev'" \
		"sh -c 'cd packages/platform/web/apps/complete-application && docker-compose up -d && sleep 20 && pnpm run dev'"
