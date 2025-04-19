PACKAGE_NAME := github.com/try-veil/veil
GOLANG_CROSS_VERSION ?= v1.21.5

.PHONY: build clean test setup release-dry-run release

setup:
	cd packages/caddy && go mod tidy && cd ../..

# Build the Caddy binary with Veil module
build:
	make clean
	make setup
	CGO_ENABLED=1 xcaddy build --with github.com/try-veil/veil/packages/caddy=./packages/caddy --output veil

# Clean build artifacts
clean:
	rm -f veil

clean-db:
	rm -f ./*.db

# Run tests with coverage
test:
	cd ./packages/caddy && go test -v -race -coverprofile=coverage.out ./... && go tool cover -func=coverage.out

test-e2e:
	./run_e2e_test.sh

run:
	./veil run --config Caddyfile

release-dry-run:
	@docker run \
		--rm \
		-e CGO_ENABLED=1 \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v `pwd`:/go/src/$(PACKAGE_NAME) \
		-w /go/src/$(PACKAGE_NAME) \
		ghcr.io/goreleaser/goreleaser-cross:${GOLANG_CROSS_VERSION} \
		--clean --skip=validate --skip=publish

release:
	@if [ ! -f ".release-env" ]; then \
		echo "\033[91m.release-env is required for release\033[0m";\
		exit 1;\
	fi
	docker run \
		--rm \
		-e CGO_ENABLED=1 \
		--env-file .release-env \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v `pwd`:/go/src/$(PACKAGE_NAME) \
		-w /go/src/$(PACKAGE_NAME) \
		ghcr.io/goreleaser/goreleaser-cross:${GOLANG_CROSS_VERSION} \
		release --clean

# Default target
all: build

# Help command
help:
	@echo "Available targets:"
	@echo "  build         - Build Caddy with Veil module"
	@echo "  clean         - Remove build artifacts"
	@echo "  test          - Run tests"
	@echo "  release       - Create a new release using goreleaser"
	@echo "  release-dry-run - Test release process without publishing"
	@echo "  all           - Build everything (default)"
	@echo "  help          - Show this help message"