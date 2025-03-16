# Caddy Gateway Configuration

## Overview

This directory contains example Caddy configurations for the API Gateway implementation.

## Configuration Files

### HTTP Methods

- `GET.json5` - GET request handling
- `POST.json5` - POST request handling
- `PUT.json5` - PUT request handling
- `DELETE.json5` - DELETE request handling
- `PATCH.json5` - PATCH request handling
- `OPTIONS.json5` - OPTIONS request handling
- `HEAD.json5` - HEAD request handling

### Additional Configurations

- `logging.json5` - Logging configuration

## Usage

All configuration files use JSON5 format for improved readability and comment support.

### Loading Configuration

```bash
# Load a configuration
curl localhost:2019/load \
  -H "Content-Type: application/json" \
  -d @<config-file>.json5

# View current configuration
curl localhost:2019/config/
```

## Related Documentation

- [Architecture](../../arch.mmd)
- [Usage Flow](../seq-dig/usage.sequence.mmd)
