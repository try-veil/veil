# OnboardingService

The OnboardingService is responsible for handling the provider onboarding process. It manages API registration, configuration of routes in the Gateway, and overall provider management.

## Responsibilities

- Verify JWT tokens for provider authentication
- Process API onboarding requests
- Generate API IDs for registered APIs
- Configure routes in the Gateway
- Store and manage API metadata

## API Endpoints

### Provider API Onboarding

**Endpoint:** `PUT /routes`

**Purpose:** Register a new API in the platform

**Authentication:** JWT token (Provider role)

**Request Body:**

```json
{
  "name": "string", // API name
  "path": "string", // Base path for the API
  "required_headers": [
    // Headers required by the provider API
    {
      "name": "string",
      "value": "string",
      "is_variable": "boolean" // Whether value is static or dynamic
    }
  ],
  "method": "string", // HTTP methods supported (comma separated)
  "description": "string", // API description
  "documentation_url": "string" // URL to API documentation
}
```

**Response:**

```json
{
  "api_id": "string", // Unique ID for the API
  "status": "string", // Status of registration
  "created_at": "timestamp"
}
```

**Status Codes:**

- 201: API successfully registered
- 400: Invalid request
- 401: Unauthorized (invalid token)
- 403: Forbidden (insufficient permissions)
- 409: API with same path already exists

### Get API Details

**Endpoint:** `GET /api/{api_id}`

**Purpose:** Retrieve details about a registered API

**Authentication:** JWT token (Provider role)

**Response:**

```json
{
  "api_id": "string",
  "name": "string",
  "path": "string",
  "required_headers": [
    {
      "name": "string",
      "value": "string",
      "is_variable": "boolean"
    }
  ],
  "method": "string",
  "description": "string",
  "documentation_url": "string",
  "status": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Update API Details

**Endpoint:** `PATCH /api/{api_id}`

**Purpose:** Update an existing API's details

**Authentication:** JWT token (Provider role)

**Request Body:** Same as onboarding, with only fields to update

**Response:** Updated API details

### Delete API

**Endpoint:** `DELETE /api/{api_id}`

**Purpose:** Remove an API from the platform

**Authentication:** JWT token (Provider role)

## Implementation Notes

- The service must verify JWT tokens using the JWKS URL from the AuthService
- All API registrations should be stored in a database
- When registering an API, the service should call the Gateway to configure the routes
- The service should validate that the provider owns the API they're trying to update or delete
