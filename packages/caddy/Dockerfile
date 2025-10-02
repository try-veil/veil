# Build stage
FROM golang:1.23-alpine AS builder

# Install build dependencies for CGO
RUN apk add --no-cache \
    git \
    make \
    gcc \
    g++ \
    musl-dev \
    pkgconfig \
    sqlite-dev \
    build-base \
    libc-dev

# Install xcaddy
RUN go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest

# Set the working directory
WORKDIR /build

# Copy only the necessary files for building
COPY packages/caddy/ ./packages/caddy/

# Build the custom Caddy binary with Veil module
RUN CGO_ENABLED=1 xcaddy build \
    --with github.com/try-veil/veil/packages/caddy=./packages/caddy \
    --output veil

# Final stage
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    sqlite-libs \
    tzdata

# Create a non-root user
RUN adduser -D -u 1000 caddy

# Create necessary directories
RUN mkdir -p /data/caddy /config \
    && chown -R caddy:caddy /data /config

# Copy the binary from builder
COPY --from=builder /build/veil /usr/bin/veil

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Set working directory
WORKDIR /data

# Switch to non-root user
USER caddy

# Expose necessary ports
EXPOSE 2019 2020 2021

# Set environment variables
ENV XDG_CONFIG_HOME=/config \
    XDG_DATA_HOME=/data

# Define volumes
VOLUME ["/data", "/config"]

# Command to run the server
ENTRYPOINT ["/usr/bin/veil"]
CMD ["run", "--config", "/etc/caddy/Caddyfile"]