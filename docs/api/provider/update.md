# API Update Specification

## Overview

The API update endpoint allows providers to modify existing API configurations in the marketplace.

## Base URL

```
PUT /v1/apis/{apiId}
```

## Request Body

```json
{
  "api": {
    "name": "string",                    // Updated API name (optional)
    "version": "string",                 // Updated API version (optional)
    "description": "string",             // Updated description (optional)
    "baseUrl": "string",                 // Updated base URL (optional)
    "category": "string",                // Updated category (optional)
    "auth": {
      "staticToken": "string",           // New static token (optional)
      "tokenLocation": "string",         // Updated token location (optional)
      "tokenName": "string"              // Updated token name (optional)
    },
    "endpoints": [                       // Updated endpoints list (optional)
      {
        "path": "string",
        "method": "string",
        "name": "string",
        "description": "string",
        "parameters": [
          {
            "name": "string",
            "type": "string",
            "required": boolean,
            "location": "string",
            "description": "string"
          }
        ],
        "responses": {
          "200": {
            "description": "string",
            "schema": "object"
          }
        },
        "rateLimit": {
          "requests": number,
          "period": "string"
        }
      }
    ],
    "pricing": {                         // Updated pricing (optional)
      "type": "string",
      "plans": [
        {
          "name": "string",
          "price": number,
          "period": "string",
          "features": ["string"]
        }
      ]
    }
  }
}
```

## Response

### Success Response (200 OK)

```json
{
  "apiId": "string",
  "status": "success",
  "message": "API successfully updated",
  "updateDate": "string", // ISO 8601 datetime
  "changes": {
    // Summary of changes
    "modified": ["name", "version"], // Fields that were modified
    "added": ["newEndpoint"], // New items added
    "removed": ["oldEndpoint"] // Items removed
  },
  "gatewayConfig": {
    // Updated gateway configuration
    "endpoints": [
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
  "code": "string",
  "message": "string",
  "details": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

## Notes

1. Only include fields that need to be updated
2. Endpoint updates are merged with existing endpoints
3. Removed endpoints must be explicitly marked for deletion
4. Version updates trigger a validation check
5. Gateway routes are automatically updated
6. Active subscriptions are notified of changes
7. Update history is maintained for auditing

## Version Control

Updates to APIs are versioned using semantic versioning:

- Major version changes require re-validation
- Minor version changes are backward compatible
- Patch versions for bug fixes only
