# API Deletion Specification

## Overview

The API deletion endpoint allows providers to remove their APIs from the marketplace.

## Base URL

```
DELETE /v1/apis/{apiId}
```

## Query Parameters

```
force: boolean    // Force deletion even with active subscriptions (default: false)
```

## Request Headers

```
Authorization: Bearer <token>
X-Confirmation: "I understand the consequences"  // Required for force deletion
```

## Response

### Success Response (200 OK)

```json
{
  "status": "success",
  "message": "API successfully deleted",
  "deletionDate": "string",           // ISO 8601 datetime
  "summary": {
    "subscriptionsTerminated": number, // Number of terminated subscriptions
    "apiKeysRevoked": number,         // Number of revoked API keys
    "gatewayRoutesRemoved": number    // Number of gateway routes removed
  }
}
```

### Error Response (400 Bad Request)

```json
{
  "status": "error",
  "code": "ACTIVE_SUBSCRIPTIONS",
  "message": "Cannot delete API with active subscriptions",
  "details": {
    "activeSubscriptions": number,
    "activeApiKeys": number,
    "lastUsage": "string"             // ISO 8601 datetime
  }
}
```

## Notes

1. Deletion with active subscriptions requires force flag
2. All API keys are immediately revoked
3. Gateway routes are immediately removed
4. Usage history is retained for billing purposes
5. Documentation is archived but not deleted
6. Webhook notifications are sent to subscribers
7. Deletion cannot be undone
