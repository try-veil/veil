# Rate Limits API Specification

## Overview

The rate limits endpoints allow users to view and configure API usage limits and throttling settings.

## Endpoints

### Get Rate Limit Status

```
GET /v1/analytics/rate-limits/status
```

#### Query Parameters

```
apiId: string      // Filter by API (optional)
window: string     // Time window (minute, hour, day, month)
```

#### Success Response (200 OK)

```json
{
  "status": "success",
  "timestamp": "string", // ISO 8601 datetime
  "limits": [
    {
      "apiId": "string",
      "endpoint": "string",
      "window": "string",
      "limit": number,
      "current": {
        "used": number,
        "remaining": number,
        "resetAt": "string" // ISO 8601 datetime
      },
      "throttling": {
        "status": "normal" | "warning" | "critical",
        "currentRate": number, // Requests per second
        "maxRate": number
      }
    }
  ],
  "quotaStatus": {
    "monthly": {
      "limit": number,
      "used": number,
      "remaining": number,
      "resetDate": "string" // ISO 8601 datetime
    },
    "daily": {
      "limit": number,
      "used": number,
      "remaining": number,
      "resetTime": "string" // ISO 8601 datetime
    }
  }
}
```

### Update Rate Limits

```
PATCH /v1/analytics/rate-limits/config
```

#### Request Body

```json
{
  "apiId": "string",
  "limits": {
    "perSecond": number, // Requests per second
    "perMinute": number,
    "perHour": number,
    "perDay": number,
    "perMonth": number
  },
  "throttling": {
    "enabled": boolean,
    "softLimit": number, // Percentage of limit for warnings
    "hardLimit": number, // Percentage for blocking
    "burstSize": number // Maximum burst size
  },
  "quotas": {
    "monthly": {
      "limit": number,
      "notifyAt": number[] // Percentage thresholds for notifications
    },
    "daily": {
      "limit": number,
      "notifyAt": number[]
    }
  }
}
```

#### Success Response (200 OK)

```json
{
  "status": "success",
  "message": "Rate limits updated",
  "config": {
    "apiId": "string",
    "effectiveFrom": "string", // ISO 8601 datetime
    "limits": {
      "perSecond": number,
      "perMinute": number,
      "perHour": number,
      "perDay": number,
      "perMonth": number
    },
    "throttling": {
      "enabled": boolean,
      "softLimit": number,
      "hardLimit": number,
      "burstSize": number
    }
  }
}
```

### Get Rate Limit History

```
GET /v1/analytics/rate-limits/history
```

#### Query Parameters

```
apiId: string      // Filter by API (required)
from: string       // Start date (ISO 8601)
to: string        // End date (ISO 8601)
window: string     // Aggregation window (hour, day)
```

#### Success Response (200 OK)

```json
{
  "status": "success",
  "history": [
    {
      "timestamp": "string", // ISO 8601 datetime
      "requestRate": number,
      "limitUtilization": number, // Percentage
      "throttledRequests": number,
      "blockedRequests": number,
      "quotaUtilization": {
        "daily": number,
        "monthly": number
      }
    }
  ],
  "summary": {
    "averageUtilization": number,
    "peakUtilization": number,
    "throttlingEvents": number,
    "blockingEvents": number
  }
}
```

## Notes

1. Rate limits are enforced in real-time
2. Burst allowance provides flexibility for traffic spikes
3. Soft limits trigger warnings but allow requests
4. Hard limits result in request blocking
5. Historical data retained for 90 days
6. Rate limit changes take effect immediately
7. Default limits based on subscription plan
