.PHONY: build clean test

# Build the Caddy binary with Veil module
build:
	make clean
	CGO_ENABLED=1 xcaddy build --with github.com/techsavvyash/veil/packages/caddy=./packages/caddy

# Clean build artifacts
clean:
	rm -f caddy

clean-db:
	rm -f ./*.db
# Run tests with coverage
test:
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -func=coverage.out

# Default target
all: build

# Help command
help:
	@echo "Available targets:"
	@echo "  build  - Build Caddy with Veil module"
	@echo "  clean  - Remove build artifacts"
	@echo "  test   - Run tests"
	@echo "  all    - Build everything (default)"
	@echo "  help   - Show this help message"
