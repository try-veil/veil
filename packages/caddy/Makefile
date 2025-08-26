PACKAGE_NAME := github.com/try-veil/veil
GOLANG_CROSS_VERSION ?= v1.21.5

.PHONY: build clean test setup release-dry-run release watch

setup:
	go mod tidy

# Build the Caddy binary with Veil module
build:
	make clean
	make setup
	CGO_ENABLED=1 xcaddy build --with github.com/try-veil/veil/packages/caddy=. --output veil
	@echo "Build complete. Testing binary..."
	@if [ -f "./veil" ]; then \
		./veil version; \
	elif [ -f "./veil.exe" ]; then \
		./veil.exe version; \
	else \
		echo "Binary not found"; \
		exit 1; \
	fi

# Clean build artifacts
clean:
	@if [ -f "./veil" ]; then rm -f veil; fi
	@if [ -f "./veil.exe" ]; then rm -f veil.exe; fi

clean-db:
	rm -f ./*.db

clean-config:
	@echo "Cleaning autosaved Caddy config..."
	@if [ -f "$(HOME)/.config/caddy/autosave.json" ]; then rm -f "$(HOME)/.config/caddy/autosave.json"; fi
	@if [ -f "$(APPDATA)/Caddy/autosave.json" ]; then rm -f "$(APPDATA)/Caddy/autosave.json"; fi
	@echo "Autosaved config cleaned"

# Run tests with coverage
test:
	go test -v -race -coverprofile=coverage.out ./... && go tool cover -func=coverage.out

# Windows-specific build target
build-windows:
	make clean
	make setup
	CGO_ENABLED=1 xcaddy build --with github.com/try-veil/veil/packages/caddy=. --output veil.exe
	@echo "Build complete. Testing binary..."
	@if [ -f "./veil.exe" ]; then \
		./veil.exe version; \
	else \
		echo "Binary not found"; \
		exit 1; \
	fi

test-e2e:
	./run_e2e_test.sh

run:
	@if [ ! -f "veil-live.json" ]; then \
		echo "Creating veil-live.json from template..."; \
		cp veil-live.json.template veil-live.json; \
	fi
	@echo "Validating configuration..."
	./veil validate --config veil-live.json
	@echo "Starting Caddy with file-based configuration..."
	CADDY_CONFIG=veil-live.json ./veil run --config veil-live.json

fresh-start: clean-config build run
	@echo "Starting Caddy with fresh configuration..."

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

# Watch for changes and rebuild
watch:
	@echo "Watching for changes..."
	@while true; do \
		find . -type f -name "*.go" | while read file; do \
			modified_time=$$(stat -f %m "$$file"); \
			if [ ! -f "$$file.timestamp" ] || [ "$$(cat "$$file.timestamp")" != "$$modified_time" ]; then \
				echo "$$modified_time" > "$$file.timestamp"; \
				echo "\nChange detected in: $$file"; \
				make clean-db && make build && ./veil run --config veil-live.json; \
			fi; \
		done; \
		sleep 1; \
	done

# Default target
all: build

# Help command
help:
	@echo "Available targets:"
	@echo "  build         - Build Caddy with Veil module (Unix/Linux)"
	@echo "  build-windows - Build Caddy with Veil module (Windows)"
	@echo "  clean         - Remove build artifacts"
	@echo "  clean-db      - Remove database files"
	@echo "  clean-config  - Remove autosaved Caddy config"
	@echo "  run           - Run Caddy with veil-live.json config"
	@echo "  fresh-start   - Clean config and start fresh"
	@echo "  test          - Run tests"
	@echo "  release       - Create a new release using goreleaser"
	@echo "  release-dry-run - Test release process without publishing"
	@echo "  all           - Build everything (default)"
	@echo "  help          - Show this help message"
