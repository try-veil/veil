# Usage Analytics API Specification

## Overview

The usage analytics endpoints provide detailed API consumption metrics and usage patterns.

## Endpoints

### Get Usage Summary

```
GET /v1/analytics/usage/summary
```

#### Query Parameters

```
apiId: string      // Filter by API (optional)
period: string     // Time period (day, week, month, year)
from: string       // Start date (ISO 8601)
to: string        // End date (ISO 8601)
```

#### Success Response (200 OK)

```json
{
  "status": "success",
  "period": {
    "from": "string", // ISO 8601 datetime
    "to": "string", // ISO 8601 datetime
    "duration": "string" // e.g., "30 days"
  },
  "summary": {
    "totalRequests": number,
    "successfulRequests": number,
    "failedRequests": number,
    "averageLatency": number, // in milliseconds
    "p95Latency": number, // 95th percentile latency
    "dataTransferred": number, // in bytes
    "uniqueIPs": number
  },
  "byEndpoint": [
    {
      "path": "string",
      "method": "string",
      "requests": number,
      "errors": number,
      "averageLatency": number
    }
  ],
  "byStatus": {
    "2xx": number,
    "3xx": number,
    "4xx": number,
    "5xx": number
  }
}
```

### Get Detailed Usage

```
GET /v1/analytics/usage/details
```

#### Query Parameters

```
apiId: string      // Filter by API (required)
endpoint: string   // Filter by endpoint (optional)
status: string     // Filter by status code (optional)
limit: number      // Number of records (default: 100)
offset: number     // Pagination offset
```

#### Success Response (200 OK)

```json
{
  "status": "success",
  "requests": [
    {
      "timestamp": "string", // ISO 8601 datetime
      "endpoint": "string",
      "method": "string",
      "statusCode": number,
      "latency": number,
      "ipAddress": "string",
      "userAgent": "string",
      "errorDetails": {
        "code": "string",
        "message": "string"
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

### Get Usage Trends

```
GET /v1/analytics/usage/trends
```

#### Query Parameters

```
apiId: string      // Filter by API (optional)
metric: string     // Metric to analyze (requests, latency, errors)
interval: string   // Time interval (hour, day, week, month)
from: string       // Start date (ISO 8601)
to: string        // End date (ISO 8601)
```

#### Success Response (200 OK)

```json
{
  "status": "success",
  "metric": "string",
  "interval": "string",
  "trends": [
    {
      "timestamp": "string", // ISO 8601 datetime
      "value": number,
      "change": number, // Percentage change from previous interval
      "trend": "up" | "down" | "stable"
    }
  ],
  "analysis": {
    "peak": {
      "timestamp": "string",
      "value": number
    },
    "average": number,
    "trend": "string", // Overall trend description
    "predictions": {
      "nextInterval": number,
      "confidence": number
    }
  }
}
```

## Notes

1. All timestamps are in UTC
2. Maximum date range is 1 year
3. Real-time data has 60-second delay
4. Historical data retained for 1 year
5. Rate limits apply to analytics APIs
6. Trend analysis requires minimum 7 days data
7. Export functionality available for large datasets
