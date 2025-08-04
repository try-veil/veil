#!/bin/sh
set -e

# Copy .env if missing (fallback)
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "Copied .env.example to .env"
fi

# Start the application
if [ "$NODE_ENV" = "development" ]; then
  echo "Starting frontend in development mode..."
  pnpm run dev
else
  echo "Starting frontend in production mode..."
  pnpm start
fi