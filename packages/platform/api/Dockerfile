FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

# Install postgresql-client for pg_isready
RUN apk add --no-cache postgresql-client python3 make g++

COPY package*.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate
RUN pnpm run build

FROM node:20-alpine

WORKDIR /app
RUN npm install -g pnpm

# Install postgresql-client for entrypoint.sh
RUN apk add --no-cache postgresql-client

COPY --from=builder /app ./

# Make entrypoint executable (already copied with the app)
RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]