FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package*.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:20-alpine

WORKDIR /app
RUN npm install -g pnpm

COPY --from=builder /app ./

# Make entrypoint executable (already copied with the app)
RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3001

ENTRYPOINT ["/app/entrypoint.sh"]