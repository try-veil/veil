# API Documentation

## Overview

The API Marketplace exposes several REST APIs for managing APIs, users, and analytics.

## Available APIs

### Provider APIs

- [API Onboarding](./provider/onboarding.md) - Register and configure new APIs
- [API Validation](./provider/validate.md) - Test and validate API configurations
- [API Updates](./provider/update.md) - Modify existing API configurations
- [API Deletion](./provider/delete.md) - Remove APIs from the marketplace

### Consumer APIs

- [User Registration](./consumer/register.md) - Register new API consumers
- [API Key Management](./consumer/api-keys.md) - Generate and manage API keys
- [Subscription Management](./consumer/subscriptions.md) - Manage API subscriptions

### Analytics APIs

- [Usage Analytics](./analytics/usage.md) - Query API usage metrics
- [Rate Limits](./analytics/rate-limits.md) - View and configure rate limits


## Common Patterns

All APIs follow these common patterns:

- Base URL: `https://api.marketplace.com/v1`
- Authentication: Bearer token in Authorization header
- Rate Limiting: Documented per endpoint
- Error Responses: Consistent error format

### Standard Error Response

```json
{
  "status": "success|error",
  "code": "string",
  "message": "string",
  "data|errors": {}
}
```

## API Versioning

APIs are versioned using URL path versioning:

- Current version: `v1`
- Beta features: `v1-beta`
- Legacy support: Maintained for 12 months

## Related Resources

## Error Codes

| Code | Description         |
| ---- | ------------------- |
| 4001 | Invalid parameters  |
| 4002 | Resource not found  |
| 4003 | Rate limit exceeded |

## SDK Examples

```typescript
// TypeScript
const api = new Veil(apiKey);
const result = await api.validate({
  apiId: "api_123",
  endpoint: "/users",
});
```
