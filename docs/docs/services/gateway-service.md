# GatewayService (Caddy)

The GatewayService is built on Caddy and serves as the API gateway for the Veil platform. It handles API request routing, subscription key validation, request transformation, and proxying to provider services.

## Responsibilities

- Validate API subscription keys
- Route API requests to appropriate provider endpoints
- Transform requests by adding required headers
- Log requests and responses for observability
- Apply rate limiting and quota enforcement
- Provide basic metrics for API usage

## Configuration Endpoints

The Gateway exposes administrative endpoints for configuration:

### Register API Route

**Endpoint:** `PUT /api/routes`

**Purpose:** Register a new API route configuration

**Authentication:** Service authentication

**Request Body:**

```json
{
  "api_id": "string",
  "base_path": "string",
  "target_url": "string",
  "methods": ["string"],
  "required_headers": [
    {
      "name": "string",
      "value": "string",
      "is_static": "boolean"
    }
  ],
  "strip_path_prefix": "boolean",
  "log_level": "string"
}
```

**Response:**

```json
{
  "status": "string",
  "message": "string",
  "route_id": "string"
}
```

### Register API Key

**Endpoint:** `PUT /api/keys`

**Purpose:** Register a new API key for subscription validation

**Authentication:** Service authentication

**Request Body:**

```json
{
  "api_key": "string",
  "user_id": "string",
  "api_id": "string",
  "allowed_paths": ["string"],
  "rate_limit": {
    "requests_per_minute": "number"
  },
  "metadata": {}
}
```

**Response:**

```json
{
  "status": "string",
  "message": "string"
}
```

### Delete API Key

**Endpoint:** `DELETE /api/keys/{api_key}`

**Purpose:** Remove an API key from the gateway

**Authentication:** Service authentication

**Response:**

```json
{
  "status": "string",
  "message": "string"
}
```

### Update Route Configuration

**Endpoint:** `PATCH /api/routes/{route_id}`

**Purpose:** Update an existing route configuration

**Authentication:** Service authentication

**Request Body:** Same as registration with fields to update

**Response:**

```json
{
  "status": "string",
  "message": "string"
}
```

## Request Processing Flow

1. Gateway receives an API request with `X-Subscription-Key` header
2. Gateway validates the subscription key against registered keys
3. If valid, the Gateway transforms the request:
   - Adds required headers for the provider service
   - May modify the request path
4. Gateway calls the CreditService to check credit availability
5. If sufficient credits, Gateway forwards the request to the provider service
6. After receiving the response, Gateway logs the request/response details
7. Gateway calls the CreditService to log usage
8. Gateway returns the response to the client

## Implementation Notes

### Caddy Configuration

The Gateway is implemented as a Caddy server with custom middleware:

```
{
  "apps": {
    "http": {
      "servers": {
        "api": {
          "listen": [":443"],
          "routes": [
            {
              "match": [{
                "path": ["/api/v1/*"]
              }],
              "handle": [
                {
                  "handler": "subscription-key-validator"
                },
                {
                  "handler": "credit-checker"
                },
                {
                  "handler": "request-transformer"
                },
                {
                  "handler": "reverse_proxy",
                  "upstreams": [{
                    "dial": "{{placeholder}}"
                  }]
                },
                {
                  "handler": "usage-logger"
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

### Custom Middleware

The Gateway implements several custom Caddy plugins:

1. **Subscription Key Validator**: Validates the `X-Subscription-Key` header
2. **Credit Checker**: Checks for sufficient credits before processing
3. **Request Transformer**: Adds required headers for the provider service
4. **Usage Logger**: Logs request details and calls Credit Service

### Environment Variables

- `CREDIT_SERVICE_URL`: URL of the Credit Service
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `API_KEY_CACHE_TTL`: TTL for API key cache in seconds
- `MAX_REQUEST_SIZE`: Maximum allowed request size
- `TIMEOUT_SECONDS`: Request timeout in seconds

## Deployment Considerations

- Deploy the Gateway with high availability configuration
- Use a distributed cache for API key storage in multi-instance deployments
- Configure proper TLS certificates for HTTPS
- Implement request throttling for resource protection
- Configure proper access logs for diagnostic purposes
- Consider geographic distribution for latency reduction
- Monitor Gateway performance metrics
