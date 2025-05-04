# Billing Reports API Specification

## Overview

The billing reports endpoints provide access to billing information, invoices, and usage-based charges.

## Endpoints

### Get Billing Summary

```
GET /v1/analytics/billing/summary
```

#### Query Parameters

```
period: string     // Billing period (current, previous, all)
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
    "billingCycle": "string" // monthly, yearly
  },
  "summary": {
    "totalCharges": number, // Total amount in cents
    "paidCharges": number,
    "pendingCharges": number,
    "credits": number,
    "balance": number,
    "currency": "string"
  },
  "byAPI": [
    {
      "apiId": "string",
      "name": "string",
      "plan": "string",
      "usage": {
        "included": number,
        "actual": number,
        "overage": number
      },
      "charges": {
        "base": number,
        "overage": number,
        "total": number
      }
    }
  ],
  "nextBilling": {
    "date": "string", // ISO 8601 datetime
    "estimatedCharges": number
  }
}
```

### Get Invoice List

```
GET /v1/analytics/billing/invoices
```

#### Query Parameters

```
status: string     // Filter by status (paid, pending, overdue)
limit: number      // Number of invoices (default: 10)
offset: number     // Pagination offset
```

#### Success Response (200 OK)

```json
{
  "status": "success",
  "invoices": [
    {
      "id": "string",
      "number": "string",
      "status": "string",
      "issuedAt": "string", // ISO 8601 datetime
      "dueAt": "string", // ISO 8601 datetime
      "paidAt": "string", // ISO 8601 datetime if paid
      "amount": number,
      "currency": "string",
      "lineItems": [
        {
          "description": "string",
          "quantity": number,
          "unitPrice": number,
          "amount": number
        }
      ],
      "downloadUrl": "string" // URL to PDF invoice
    }
  ],
  "pagination": {
    "total": number,
    "limit": number,
    "offset": number
  }
}
```

### Get Usage Charges

```
GET /v1/analytics/billing/charges
```

#### Query Parameters

```
apiId: string      // Filter by API (optional)
type: string       // Type of charges (all, overage, subscription)
period: string     // Billing period
```

#### Success Response (200 OK)

```json
{
  "status": "success",
  "charges": {
    "subscription": [
      {
        "apiId": "string",
        "planId": "string",
        "date": "string", // ISO 8601 datetime
        "amount": number,
        "status": "string", // charged, pending, waived
        "details": {
          "billingPeriod": "string",
          "planName": "string",
          "features": ["string"]
        }
      }
    ],
    "overage": [
      {
        "apiId": "string",
        "date": "string", // ISO 8601 datetime
        "usage": {
          "included": number,
          "actual": number,
          "excess": number
        },
        "rate": number, // Per unit charge
        "amount": number,
        "status": "string" // charged, pending, waived
      }
    ]
  },
  "summary": {
    "totalSubscription": number,
    "totalOverage": number,
    "totalCharges": number
  }
}
```

## Notes

1. All monetary amounts are in indian rupees.
2. Supported currencies defined in user preferences
3. Invoices are generated monthly
4. Payment terms are net 30 days
5. Usage charges are calculated daily
6. Overage charges appear on next invoice
7. Auto-payment available for verified accounts
