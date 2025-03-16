# API Validation Endpoint

## Base URL

```
POST /v1/apis/validate
```

## Request Body

```json
{
  "apiId": "string", // API ID received from onboarding
  "endpointPath": "string", // Specific endpoint to test (optional)
  "testParameters": {
    "path": {
      // Path parameters if required
      "paramName": "value"
    },
    "query": {
      // Query parameters if required
      "paramName": "value"
    },
    "body": {
      // Request body if required
      "key": "value"
    },
    "headers": {
      // Additional headers if required
      "headerName": "value"
    }
  }
}
```

## Response

### Success Response (200 OK)

```json
{
  "status": "success",
  "validation": {
    "isValid": true,
    "testedEndpoints": [
      {
        "path": "string",
        "method": "string",
        "statusCode": number,
        "responseTime": number,         // Response time in ms
        "success": boolean,
        "response": {                   // Sample response received
          "body": "object",
          "headers": "object"
        }
      }
    ],
    "curlCommands": {
      "withGateway": "string",         // Curl command using gateway endpoint
      "direct": "string"               // Curl command using direct endpoint (for testing)
    }
  },
  "gateway": {
    "endpoint": "string",              // Generated gateway endpoint
    "sampleApiKey": "string"           // Temporary API key for testing
  }
}
```

### Error Response (400 Bad Request)

```json
{
  "status": "error",
  "code": "string",
  "validation": {
    "isValid": false,
    "errors": [
      {
        "endpoint": "string",
        "statusCode": number,
        "error": "string",
        "details": "string",
        "troubleshooting": [
          {
            "issue": "string",
            "suggestion": "string"
          }
        ]
      }
    ],
    "curlCommands": {
      "failedRequest": "string",       // Curl command that failed
      "suggestedFix": "string"         // Curl command with potential fix
    }
  }
}
```

## Example Validation Scenarios

### 1. Successful Validation

```json
{
  "status": "success",
  "validation": {
    "isValid": true,
    "testedEndpoints": [
      {
        "path": "/weather/current",
        "method": "GET",
        "statusCode": 200,
        "responseTime": 234,
        "success": true,
        "response": {
          "body": {
            "temperature": 22.5,
            "humidity": 65
          },
          "headers": {
            "content-type": "application/json"
          }
        }
      }
    ],
    "curlCommands": {
      "withGateway": "curl -X GET 'https://api.yourgateway.com/weather/v1/current' -H 'X-API-Key: temp_key_123'",
      "direct": "curl -X GET 'https://api.provider.com/weather/current' -H 'Authorization: Bearer static_token'"
    }
  },
  "gateway": {
    "endpoint": "https://api.yourgateway.com/weather/v1/current",
    "sampleApiKey": "temp_key_123"
  }
}
```

### 2. Failed Validation

```json
{
  "status": "error",
  "code": "AUTH_FAILED",
  "validation": {
    "isValid": false,
    "errors": [
      {
        "endpoint": "/weather/current",
        "statusCode": 401,
        "error": "Authentication failed",
        "details": "The provided static token was rejected by the API provider",
        "troubleshooting": [
          {
            "issue": "Invalid token format",
            "suggestion": "Ensure the token is provided with the correct prefix (e.g., 'Bearer')"
          },
          {
            "issue": "Token expired or revoked",
            "suggestion": "Generate a new static token from your API provider dashboard"
          }
        ]
      }
    ],
    "curlCommands": {
      "failedRequest": "curl -X GET 'https://api.provider.com/weather/current' -H 'Authorization: Bearer invalid_token'",
      "suggestedFix": "curl -X GET 'https://api.provider.com/weather/current' -H 'Authorization: Bearer your_new_token'"
    }
  }
}
```

## Notes

1. The validation endpoint performs real API calls to verify integration
2. A temporary API key is generated for testing the gateway endpoint
3. Curl commands are provided for both gateway and direct testing
4. Response includes timing and performance metrics
5. Detailed troubleshooting suggestions for common errors
6. The temporary API key expires after 24 hours

## Response Codes

| Code | Description                  |
| ---- | ---------------------------- |
| 200  | Validation successful        |
| 400  | Invalid request parameters   |
| 401  | Authentication failed        |
| 429  | Too many validation requests |

## Authentication

All validation endpoints require the following header:

```
Authorization: Bearer <api_token>
```

The API token must have the `validate:api` scope.
