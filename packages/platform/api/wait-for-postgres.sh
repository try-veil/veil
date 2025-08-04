#!/bin/sh
# wait-for-postgres.sh - wait until Postgres is ready
set -e

host="${PGHOST:-my_postgres}"
user="${POSTGRES_USER:-myuser}"
db="${POSTGRES_DB:-mydb}"
port="${PGPORT:-5432}"

until pg_isready -h "$host" -p "$port" -U "$user" -d "$db" >/dev/null 2>&1; do
  echo "Waiting for Postgres at $host:$port..."
  sleep 2
done

echo "Postgres is up."
exec "$@"