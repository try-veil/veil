# Upstream Server

Upstream server to test the gateway with. Replace this long term with httpbin. Simple Go server to test reverse proxy functionality. The server runs on port 8080 and provides several test endpoints.

## Endpoints

### 1. Echo Handler (`/echo/`)

- Returns request details including path, method, headers, and query parameters
- Supports custom status codes via query parameter: `/echo/?status=401`
- Useful for basic request verification

### 2. Delay Handler (`/delay/`)

- Adds a 2-second delay before responding
- Useful for testing timeout configurations

### 3. Status Code Handler (`/status/`)

- Returns a 400 Bad Request status code
- Useful for testing error handling

### 4. Headers Handler (`/headers/`)

- Echoes back all request headers
- Also sets received headers in the response
- Useful for testing header propagation

### 5. Status Code Handler with Path Parameter (`/status-code/{code}`)

- Returns the specified status code
- Examples:
  - `/status-code/200` - Returns 200 OK
  - `/status-code/401` - Returns 401 Unauthorized
  - `/status-code/404` - Returns 404 Not Found
- Useful for testing specific status code handling

## Response Format

All endpoints return JSON responses with the following structure:

```json
{
  "message": "string",
  "path": "string",
  "method": "string",
  "headers": {
    "header-name": "header-value"
  },
  "timestamp": "ISO-8601 timestamp",
  "queryParams": {
    "param-name": "param-value"
  }
}
```

## Running the Server

```bash
go run main.go
```

The server will start on port 8080. The test for these endpoints are in the `tests/e2e` folder.

## Examples

Test different status codes:

```bash
# Test 200 OK
curl "http://localhost:8080/status-code/200"

# Test 401 Unauthorized
curl "http://localhost:8080/status-code/401"

# Test 404 Not Found
curl "http://localhost:8080/status-code/404"

# Test echo with custom status
curl "http://localhost:8080/echo/?status=401"
```
