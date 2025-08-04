#!/bin/sh
set -e

# Copy .env if missing (fallback)
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "Copied .env.example to .env"
fi

# Wait for Postgres to be ready
echo "Waiting for Postgres at ${PGHOST:-my_postgres}:${PGPORT:-5432}..."
until pg_isready -h "${PGHOST:-my_postgres}" -p "${PGPORT:-5432}" -U "${POSTGRES_USER:-myuser}" -d "${POSTGRES_DB:-mydb}" >/dev/null 2>&1; do
  echo "  still waiting..."
  sleep 2
done
echo "Postgres is up."

# Run migrations (dev vs prod)
if [ "$NODE_ENV" = "production" ]; then
  echo "Running production migrations (prisma migrate deploy)..."
  pnpm prisma migrate deploy
else
  echo "Running dev migrations (prisma migrate dev)..."
  pnpm prisma migrate dev --name init || true
fi

# Generate Prisma client (safe to run multiple times)
pnpm prisma generate

# Start app: choose appropriate script
if [ "$NODE_ENV" = "production" ]; then
  echo "Starting backend in production mode..."
  pnpm run start:prod
else
  echo "Starting backend in development mode..."
  pnpm run start:dev
fi