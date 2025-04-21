# SubscriptionService

The SubscriptionService manages consumer subscriptions to APIs, handles API key generation and management, and ensures proper access control to provider APIs.

## Responsibilities

- Verify JWT tokens for consumer authentication
- Process API subscription requests
- Generate and manage API keys
- Configure API key mappings in the Gateway
- Track subscription status and history

## API Endpoints

### Subscribe to API

**Endpoint:** `POST /subscribe`

**Purpose:** Create a subscription to an API and generate an API key

**Authentication:** JWT token (Consumer role)

**Request Body:**

```json
{
  "api_id": "string", // ID of the API to subscribe to
  "plan_id": "string", // Optional billing plan ID
  "notes": "string" // Optional subscription notes
}
```

**Response:**

```json
{
  "subscription_id": "string", // Unique subscription ID
  "api_key": "string", // Generated API key
  "status": "string", // Subscription status
  "created_at": "timestamp" // Subscription creation time
}
```

**Status Codes:**

- 201: Subscription created successfully
- 400: Invalid request
- 401: Unauthorized (invalid token)
- 403: Forbidden (insufficient permissions)
- 404: API ID not found
- 409: Already subscribed to this API

### Generate New API Key

**Endpoint:** `POST /subscription/{subscription_id}/regenerate-key`

**Purpose:** Generate a new API key for an existing subscription

**Authentication:** JWT token (Consumer role)

**Response:**

```json
{
  "subscription_id": "string",
  "api_key": "string", // Newly generated API key
  "previous_key_invalidated": true // Whether old key was invalidated
}
```

### Get Subscriptions

**Endpoint:** `GET /subscriptions`

**Purpose:** List all subscriptions for the authenticated consumer

**Authentication:** JWT token (Consumer role)

**Query Parameters:**

- `status`: Filter by subscription status
- `page`: Pagination page number
- `limit`: Results per page

**Response:**

```json
{
  "subscriptions": [
    {
      "subscription_id": "string",
      "api_id": "string",
      "api_name": "string",
      "status": "string",
      "created_at": "timestamp",
      "last_used": "timestamp"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

### Get Subscription Details

**Endpoint:** `GET /subscription/{subscription_id}`

**Purpose:** Get detailed information about a specific subscription

**Authentication:** JWT token (Consumer role)

**Response:**

```json
{
  "subscription_id": "string",
  "api_id": "string",
  "api_name": "string",
  "api_key": "string",
  "status": "string",
  "plan_id": "string",
  "plan_name": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "last_used": "timestamp",
  "usage_stats": {
    "total_calls": "number",
    "calls_this_period": "number"
  }
}
```

### Cancel Subscription

**Endpoint:** `DELETE /subscription/{subscription_id}`

**Purpose:** Cancel an active subscription

**Authentication:** JWT token (Consumer role)

**Response:**

```json
{
  "subscription_id": "string",
  "status": "string", // Should be "CANCELLED"
  "cancelled_at": "timestamp"
}
```

## Implementation Notes

- The service must verify JWT tokens using the JWKS URL from the AuthService
- API keys should be securely generated with sufficient entropy
- When generating API keys, the service must register them with the Gateway
- Subscription data should include usage tracking
- Consider implementing rate limiting based on subscription plans
- Implement proper error handling for subscription lifecycle events
