# API Onboarding Specification

## Base URL

```
POST /v1/apis/onboard
```

## Request Body

```json
{
  "api": {
    "name": "string",                    // Name of the API
    "version": "string",                 // API version (e.g., "1.0.0")
    "description": "string",             // Detailed description of the API
    "baseUrl": "string",                 // Base URL of the API
    "category": "string",                // Category (e.g., "Weather", "Finance")
    "auth": {
      "staticToken": "string",           // Provider's static access token
      "tokenLocation": "string",          // Where to send token: "header" or "query"
      "tokenName": "string"              // Name of header/query parameter for token
    },
    "endpoints": [
      {
        "path": "string",                // Endpoint path (e.g., "/weather/current")
        "method": "string",              // HTTP method (GET, POST, etc.)
        "name": "string",                // Friendly name for the endpoint
        "description": "string",         // Endpoint description
        "parameters": [
          {
            "name": "string",            // Parameter name
            "type": "string",            // Data type
            "required": boolean,         // Is parameter required?
            "location": "string",        // "query", "path", or "body"
            "description": "string"      // Parameter description
          }
        ],
        "responses": {
          "200": {
            "description": "string",     // Success response description
            "schema": "object"           // Response schema
          }
        },
        "rateLimit": {
          "requests": number,           // Number of requests allowed
          "period": "string"            // Time period (e.g., "per_second", "per_day")
        }
      }
    ],
    "pricing": {
      "type": "string",                 // "free", "paid", "freemium"
      "plans": [
        {
          "name": "string",             // Plan name
          "price": number,              // Price per unit
          "period": "string",           // "monthly", "yearly"
          "features": ["string"]        // Array of features included
        }
      ]
    },
    "documentation": {
      "swagger": "string",              // URL to Swagger/OpenAPI spec if available
      "readme": "string"                // Markdown documentation
    }
  },
  "owner": {
    "name": "string",                   // API owner/company name
    "email": "string",                  // Contact email
    "website": "string"                 // Company website
  }
}
```

## Response

### Success Response (200 OK)

```json
{
  "apiId": "string", // Unique identifier for the API
  "status": "success",
  "message": "API successfully onboarded",
  "onboardingDate": "string", // ISO 8601 datetime
  "apiUrl": "string", // Marketplace URL for the API
  "gatewayConfig": {
    "clientApiKeyPrefix": "string", // Prefix for client API keys
    "endpoints": [
      // Generated gateway endpoints
      {
        "path": "string",
        "method": "string",
        "gatewayUrl": "string"
      }
    ]
  }
}
```

### Error Response (400 Bad Request)

```json
{
  "status": "error",
  "code": "string", // Error code
  "message": "string", // Error message
  "details": [
    // Array of validation errors
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

## Required Fields

- api.name
- api.version
- api.baseUrl
- api.auth.staticToken
- api.auth.tokenLocation
- api.auth.tokenName
- api.endpoints (at least one endpoint)
- owner.name
- owner.email

## Notes

1. All URLs must be valid HTTPS URLs
2. API version should follow semantic versioning
3. Rate limits are optional but recommended
4. The static token provided will be encrypted at rest
5. The gateway will generate unique API keys for each client
6. Provider's static token will never be exposed to clients
7. Gateway will handle all client-side authentication
