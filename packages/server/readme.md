# API Server

## Development Setup

### Prerequisites

- Go 1.21 or higher
- [Air](https://github.com/cosmtrek/air) for hot reloading

### Installing Air

```bash
go install github.com/air-verse/air@latest
```

### Project Setup

```bash
go mod init server
go mod tidy

# Run with hot reloading
air

# Run without hot reloading
go run cmd/api/main.go

# Build the binary
go build -o bin/api cmd/api/main.go
```

### Environment

The server can be configured using environment variables:

- `PORT`: Server port (default: 8080)

### Tooling

```bash
cd packages/server
go install golang.org/x/tools/gopls@latest
go install github.com/go-delve/delve/cmd/dlv@latest
go install honnef.co/go/tools/cmd/staticcheck@latest
```

### Testing

```bash
cd packages/server
go test $(go list ./... | grep -v -f .testignore) -coverprofile .testCoverage.txt
```
