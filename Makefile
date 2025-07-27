.PHONY: setup run

setup:
	cd packages/platform/api && \
	pnpm install && \
	cp -n .env.example .env && \
	pnpm prisma migrate dev --name init && \
	pnpm prisma generate

	cd packages/platform/web/apps/complete-application && \
	pnpm install && \
	cp -n .env.example .env

run:
	concurrently -n "CADDY,BACKEND,FRONTEND" -c "cyan,green,magenta" \
		"cd packages/caddy && make watch" \
		"sh -c 'cd packages/platform/api && docker-compose up -d && sleep 10 && pnpm run start:dev'" \
		"sh -c 'cd packages/platform/web/apps/complete-application && docker-compose up -d && sleep 20 && pnpm run dev'"
