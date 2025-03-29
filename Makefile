.PHONY: build clean test

setup:
	cd packages/caddy && go mod tidy && cd ../..

# Build the Caddy binary with Veil module
build:
	make clean
	make setup
	CGO_ENABLED=1 xcaddy build --with github.com/try-veil/veil/packages/caddy=./packages/caddy

# Clean build artifacts
clean:
	rm -f caddy

clean-db:
	rm -f ./*.db
# Run tests with coverage
test:
	cd ./packages/caddy && go test -v -race -coverprofile=coverage.out ./... && go tool cover -func=coverage.out

test-e2e:
	./run_e2e_test.sh

run:
	./caddy run --config Caddyfile

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
