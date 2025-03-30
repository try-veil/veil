# Subscription Management Specification

## Overview

The subscription management endpoints allow users to subscribe to APIs and manage their subscriptions.

## Endpoints

### Create Subscription

```
POST /v1/users/subscriptions
```

#### Request Body

```json
{
  "apiId": "string",           // API to subscribe to
  "planId": "string",          // Selected pricing plan
  "settings": {
    "billingCycle": "string",  // monthly, yearly
    "autoRenew": boolean,      // Enable auto-renewal
    "usageAlerts": [
      {
        "threshold": number,    // Usage threshold percentage
        "channels": ["string"]  // Notification channels
      }
    ]
  }
}
```

#### Success Response (201 Created)

```json
{
  "status": "success",
  "message": "Subscription created",
  "subscription": {
    "id": "string",
    "apiId": "string",
    "planId": "string",
    "status": "active",
    "created": "string",       // ISO 8601 datetime
    "currentPeriod": {
      "start": "string",       // ISO 8601 datetime
      "end": "string"         // ISO 8601 datetime
    },
    "usage": {
      "allowed": number,
      "used": number,
      "remaining": number
    }
  }
}
```

### List Subscriptions

```
GET /v1/users/subscriptions
```

#### Query Parameters

```
status: string     // Filter by status (active, cancelled, expired)
apiId: string     // Filter by API
limit: number     // Number of subscriptions to return
offset: number    // Pagination offset
```

#### Success Response (200 OK)

```json
{
  "status": "success",
  "subscriptions": [
    {
      "id": "string",
      "apiId": "string",
      "planId": "string",
      "status": "string",
      "created": "string",
      "currentPeriod": {
        "start": "string",
        "end": "string"
      },
      "usage": {
        "allowed": number,
        "used": number,
        "remaining": number
      }
    }
  ],
  "pagination": {
    "total": number,
    "limit": number,
    "offset": number
  }
}
```

### Update Subscription

```
PATCH /v1/users/subscriptions/{subscriptionId}
```

#### Request Body

```json
{
  "planId": "string",          // New plan ID (optional)
  "settings": {
    "billingCycle": "string",  // New billing cycle (optional)
    "autoRenew": boolean,      // Update auto-renewal (optional)
    "usageAlerts": [           // Update usage alerts (optional)
      {
        "threshold": number,
        "channels": ["string"]
      }
    ]
  }
}
```

#### Success Response (200 OK)

```json
{
  "status": "success",
  "message": "Subscription updated",
  "subscription": {
    "id": "string",
    "changes": {
      "planId": {
        "from": "string",
        "to": "string"
      },
      "effectiveDate": "string" // ISO 8601 datetime
    }
  }
}
```

## Notes

1. Subscriptions are required for API access
2. Plan changes take effect next billing cycle
3. Usage limits are enforced in real-time
4. Automatic notifications for usage thresholds
5. Grace period for payment issues
6. Historical usage data is retained
7. Cancellation requires notice period
