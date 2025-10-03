# Event Streaming in Veil

## Overview

Veil's event streaming feature allows you to capture usage events from the proxy in a non-blocking, fire-and-forget manner. This implementation follows the RFC pattern documented in [docs/references/RFC:proxy-event-streaming.md](../../docs/references/RFC:proxy-event-streaming.md).

## Configuration

Event streaming is **disabled by default** and must be explicitly enabled via environment variable:

```bash
export ENABLE_EVENT_STREAMING=true
./veil run --config Caddyfile
```

## Event Queue Implementations

### 1. Structured Logging (slog) - **Recommended**

When `ENABLE_EVENT_STREAMING=true` and **no events endpoint is configured**, Veil uses the structured logging pattern:

- Events are written as JSON logs to stdout using Go's `log/slog`
- Zero blocking, zero external dependencies
- Perfect for piping to Vector, Fluentd, or any log shipper
- Follows the RFC recommendation for maximum decoupling

**Example output:**
```json
{
  "time": "2025-10-02T19:28:33.001895+05:30",
  "level": "INFO",
  "msg": "usage_event",
  "event_type": "api_usage",
  "id": "5566d10c-5c8b-4575-88fb-ca8cf4ad0a69",
  "api_path": "/test-api",
  "subscription_key": "test-key-123",
  "method": "GET",
  "response_time_ms": 419,
  "status_code": 404,
  "success": false,
  "timestamp": "2025-10-02T19:28:33.001748+05:30",
  "request_size": 0,
  "response_size": 2
}
```

### 2. HTTP Event Queue (Optional)

When `ENABLE_EVENT_STREAMING=true` and an **events endpoint is configured** in the Caddyfile:

```caddyfile
veil_handler ./veil.db X-Subscription-Key http://localhost:3000/api/v1/usage/events
```

- Events are batched and sent via HTTP POST
- Includes buffering, retries, and backpressure
- Useful for direct integration with a specific API endpoint

## Key Features

### Non-Blocking & Fire-and-Forget

- The proxy **never blocks** waiting for event processing
- If the event queue is full, events are silently dropped
- Connection failures to event endpoints **do not** impact proxy requests
- All event errors are logged but never propagated

### Graceful Degradation

1. If `ENABLE_EVENT_STREAMING` is not set or `false`: No event queue is initialized, proxy runs normally
2. If event queue fails to start: Proxy continues without event streaming
3. If events cannot be delivered: Events are dropped, proxy continues normally

## Usage Examples

### Basic Usage (Structured Logging)

```bash
# Enable event streaming with slog
export ENABLE_EVENT_STREAMING=true
./veil run --config Caddyfile

# Events are written to stdout, pipe to Vector
./veil run --config Caddyfile | vector --config vector.toml
```

### With HTTP Endpoint (Platform API)

1. Configure endpoint in Caddyfile:
```caddyfile
veil_handler ./veil.db X-Subscription-Key http://localhost:3000/api/v1/usage/events
```

2. Enable event streaming:
```bash
export ENABLE_EVENT_STREAMING=true
./veil run --config Caddyfile
```

### Disabled (Default)

```bash
# Event streaming is off by default
./veil run --config Caddyfile
# Logs: "event streaming disabled (set ENABLE_EVENT_STREAMING=true to enable)"
```

## Event Schema

Each usage event contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique event ID (UUID) |
| `api_path` | string | The API path that was accessed |
| `subscription_key` | string | The API key used for authentication |
| `method` | string | HTTP method (GET, POST, etc.) |
| `response_time_ms` | int64 | Response time in milliseconds |
| `status_code` | int | HTTP status code |
| `success` | bool | Whether the request was successful (2xx) |
| `timestamp` | time | When the event occurred |
| `request_size` | int64 | Size of request body in bytes |
| `response_size` | int64 | Size of response body in bytes |

## Vector Integration Example

Create a `vector.toml` configuration:

```toml
# Read events from Veil's stdout
[sources.veil_events]
  type = "stdin"

# Parse JSON events
[transforms.parse_events]
  type = "remap"
  inputs = ["veil_events"]
  source = '''
  . = parse_json!(.message)
  '''

# Send to your analytics service
[sinks.analytics]
  type = "http"
  inputs = ["parse_events"]
  uri = "https://analytics.example.com/events"
  batch.max_events = 100
  batch.timeout_secs = 5
```

Run with:
```bash
export ENABLE_EVENT_STREAMING=true
./veil run --config Caddyfile | vector --config vector.toml
```

## Troubleshooting

### Events not appearing?

1. Check if event streaming is enabled:
   ```bash
   grep "event streaming" /path/to/veil.log
   ```

2. Ensure you're checking stdout (not stderr) for slog events

3. Verify the API is being called through port 2021 (proxied APIs), not 2020 (management API)

### Connection refused errors?

These are **normal and safe** when:
- Event streaming is enabled
- HTTP endpoint is configured
- The endpoint is unavailable

The proxy will continue to work normally. Events that cannot be delivered are dropped.

## Architecture Notes

This implementation follows the "Structured Logging to stdout with Vector" pattern from the RFC, providing:

- ✅ Maximum decoupling between proxy and event consumers
- ✅ Zero impact on proxy performance
- ✅ Flexibility to change event consumers without code changes
- ✅ Battle-tested, production-ready pattern
- ✅ Optional feature that can be easily disabled
