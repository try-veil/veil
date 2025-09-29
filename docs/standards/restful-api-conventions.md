# RESTful API Standards & Conventions

## Overview

This document defines the RESTful API standards and conventions for the Veil API marketplace platform. Following these guidelines ensures consistency, maintainability, and developer-friendly APIs across the entire platform.

## 1. URL Structure & Naming Conventions

### 1.1 Base URL Structure

```
https://api.veil.platform/api/v{version}/{resource}
```

**Examples:**
- `https://api.veil.platform/api/v1/marketplace/apis`
- `https://api.veil.platform/api/v1/provider/apis`
- `https://api.veil.platform/api/v1/consumer/subscriptions`

### 1.2 Resource Naming Rules

#### Use Nouns, Not Verbs
✅ **Good:**
- `/api/v1/users`
- `/api/v1/marketplace/apis`
- `/api/v1/subscriptions`

❌ **Bad:**
- `/api/v1/getUsers`
- `/api/v1/createAPI`
- `/api/v1/deleteSubscription`

#### Use Plural Nouns for Collections
✅ **Good:**
- `/api/v1/users` (collection)
- `/api/v1/users/123` (specific resource)

❌ **Bad:**
- `/api/v1/user`
- `/api/v1/user/123`

#### Use Lowercase and Hyphens
✅ **Good:**
- `/api/v1/api-keys`
- `/api/v1/user-profiles`
- `/api/v1/billing-records`

❌ **Bad:**
- `/api/v1/APIKeys`
- `/api/v1/api_keys`
- `/api/v1/UserProfiles`

### 1.3 Hierarchical Resource Structure

```
/api/v1/provider/apis/{apiUid}/analytics
/api/v1/consumer/subscriptions/{subscriptionUid}/api-keys
/api/v1/marketplace/apis/{apiUid}/reviews
```

### 1.4 Query Parameters for Filtering

```
GET /api/v1/marketplace/apis?category=weather&pricing_model=per_request&sort=popularity
GET /api/v1/consumer/subscriptions?status=active&page=2&limit=20
GET /api/v1/provider/apis?search=weather&from_date=2024-01-01
```

## 2. HTTP Methods & Status Codes

### 2.1 HTTP Method Usage

| Method | Usage | Idempotent | Safe |
|--------|-------|------------|------|
| `GET` | Retrieve resource(s) | ✅ | ✅ |
| `POST` | Create new resource | ❌ | ❌ |
| `PUT` | Update entire resource | ✅ | ❌ |
| `PATCH` | Partial update | ❌ | ❌ |
| `DELETE` | Remove resource | ✅ | ❌ |

#### Examples

```http
# Retrieve all marketplace APIs
GET /api/v1/marketplace/apis

# Retrieve specific API
GET /api/v1/marketplace/apis/123e4567-e89b-12d3-a456-426614174000

# Create new API
POST /api/v1/provider/apis

# Update entire API
PUT /api/v1/provider/apis/123e4567-e89b-12d3-a456-426614174000

# Partially update API
PATCH /api/v1/provider/apis/123e4567-e89b-12d3-a456-426614174000

# Delete API
DELETE /api/v1/provider/apis/123e4567-e89b-12d3-a456-426614174000
```

### 2.2 HTTP Status Codes

#### Success Codes (2xx)
- `200 OK` - Successful GET, PUT, PATCH requests
- `201 Created` - Successful POST requests
- `204 No Content` - Successful DELETE requests

#### Client Error Codes (4xx)
- `400 Bad Request` - Invalid request syntax or parameters
- `401 Unauthorized` - Authentication required or invalid
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate email)
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded

#### Server Error Codes (5xx)
- `500 Internal Server Error` - General server error
- `502 Bad Gateway` - Upstream service error
- `503 Service Unavailable` - Service temporarily unavailable
- `504 Gateway Timeout` - Upstream service timeout

### 2.3 Status Code Usage Examples

```typescript
// Success responses
return res.status(200).json({ data: apis, pagination });        // GET
return res.status(201).json({ data: createdAPI });              // POST
return res.status(204).send();                                  // DELETE

// Error responses
return res.status(400).json({ error: 'Invalid request' });      // Bad request
return res.status(401).json({ error: 'Authentication required' }); // Unauthorized
return res.status(404).json({ error: 'API not found' });        // Not found
return res.status(409).json({ error: 'Email already exists' }); // Conflict
```

## 3. Request & Response Format Standards

### 3.1 Content Type

**Always use JSON for request and response bodies:**
```http
Content-Type: application/json
Accept: application/json
```

### 3.2 Request Body Format

#### Single Resource Creation
```json
{
  "name": "Weather API",
  "description": "Get current weather data",
  "endpoint": "/weather",
  "baseUrl": "https://api.weather.com",
  "methods": ["GET"],
  "pricingModel": "per_request",
  "price": "0.01"
}
```

#### Bulk Operations
```json
{
  "apis": [
    {
      "name": "Weather API",
      "description": "Get current weather data"
    },
    {
      "name": "Currency API", 
      "description": "Get exchange rates"
    }
  ]
}
```

### 3.3 Response Body Format

#### Success Response Structure
```json
{
  "data": {
    "uid": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Weather API",
    "description": "Get current weather data",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "requestId": "req_123456789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Collection Response Structure
```json
{
  "data": [
    {
      "uid": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Weather API"
    },
    {
      "uid": "456e7890-e89b-12d3-a456-426614174000", 
      "name": "Currency API"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "requestId": "req_123456789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Error Response Structure
```json
{
  "error": {
    "type": "ValidationError",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "price",
        "message": "Price must be a positive number"
      }
    ]
  },
  "meta": {
    "requestId": "req_123456789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 4. Authentication & Authorization

### 4.1 Authentication Header
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.2 Service-to-Service Authentication
```http
X-Service-Token: service_token_here
```

### 4.3 API Key Authentication (for proxied APIs)
```http
X-Subscription-Key: veil_sk_1234567890abcdef
```

## 5. Versioning Strategy

### 5.1 URL Path Versioning
```
/api/v1/marketplace/apis    (Current)
/api/v2/marketplace/apis    (Future)
```

### 5.2 Version Header Support
```http
Accept: application/vnd.veil.v1+json
Accept: application/vnd.veil.v2+json
```

### 5.3 Deprecation Headers
```http
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Deprecation: true
Link: </api/v2/marketplace/apis>; rel="successor-version"
```

## 6. Pagination Standards

### 6.1 Query Parameters
```
GET /api/v1/marketplace/apis?page=2&limit=20
```

### 6.2 Response Headers
```http
X-Total-Count: 150
X-Page-Count: 8
Link: </api/v1/marketplace/apis?page=3&limit=20>; rel="next",
      </api/v1/marketplace/apis?page=1&limit=20>; rel="prev",
      </api/v1/marketplace/apis?page=1&limit=20>; rel="first",
      </api/v1/marketplace/apis?page=8&limit=20>; rel="last"
```

### 6.3 Cursor-Based Pagination (for large datasets)
```
GET /api/v1/analytics/events?cursor=eyJpZCI6MTIzNDU2Nzg5MH0&limit=100
```

## 7. Filtering, Sorting & Searching

### 7.1 Filtering
```
GET /api/v1/marketplace/apis?category=weather&pricing_model=per_request&status=active
GET /api/v1/consumer/subscriptions?status=active,suspended
GET /api/v1/provider/apis?created_after=2024-01-01&created_before=2024-12-31
```

### 7.2 Sorting
```
GET /api/v1/marketplace/apis?sort=popularity
GET /api/v1/marketplace/apis?sort=-created_at    (descending)
GET /api/v1/marketplace/apis?sort=name,created_at (multiple fields)
```

### 7.3 Searching
```
GET /api/v1/marketplace/apis?search=weather
GET /api/v1/marketplace/apis?q=weather+forecast
```

### 7.4 Field Selection
```
GET /api/v1/marketplace/apis?fields=uid,name,description,price
```

## 8. Rate Limiting

### 8.1 Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

### 8.2 Rate Limit Exceeded Response
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 60

{
  "error": {
    "type": "RateLimitExceeded",
    "message": "API rate limit exceeded",
    "retryAfter": 60
  }
}
```

## 9. Error Handling Best Practices

### 9.1 Validation Errors (422 Unprocessable Entity)
```json
{
  "error": {
    "type": "ValidationError",
    "message": "The request contains invalid parameters",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email address format is invalid"
      },
      {
        "field": "price",
        "code": "OUT_OF_RANGE",
        "message": "Price must be between 0.01 and 1000.00"
      }
    ]
  }
}
```

### 9.2 Business Logic Errors (409 Conflict)
```json
{
  "error": {
    "type": "ConflictError",
    "code": "SUBSCRIPTION_EXISTS",
    "message": "You already have an active subscription to this API"
  }
}
```

### 9.3 Internal Server Errors (500)
```json
{
  "error": {
    "type": "InternalServerError", 
    "message": "An unexpected error occurred",
    "reference": "error_ref_123456"
  }
}
```

## 10. Caching & Performance

### 10.1 Cache Control Headers
```http
# Cacheable responses
Cache-Control: public, max-age=3600
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"

# Non-cacheable responses
Cache-Control: no-cache, no-store, must-revalidate
```

### 10.2 Conditional Requests
```http
# Client request
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"

# Server response (304 if unchanged)
HTTP/1.1 304 Not Modified
```

## 11. CORS Configuration

### 11.1 CORS Headers
```http
Access-Control-Allow-Origin: https://app.veil.platform
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

### 11.2 Preflight Handling
```http
# OPTIONS request handling
OPTIONS /api/v1/marketplace/apis
HTTP/1.1 200 OK
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
```

## 12. Security Headers

### 12.1 Security Response Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

## 13. Webhooks & Callbacks

### 13.1 Webhook Request Format
```json
{
  "event": "subscription.created",
  "data": {
    "subscription": {
      "uid": "123e4567-e89b-12d3-a456-426614174000",
      "apiUid": "456e7890-e89b-12d3-a456-426614174000",
      "status": "active"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "signature": "sha256=5d41402abc4b2a76b9719d911017c592"
}
```

### 13.2 Webhook Headers
```http
X-Veil-Event: subscription.created
X-Veil-Delivery: 123e4567-e89b-12d3-a456-426614174000
X-Veil-Signature: sha256=5d41402abc4b2a76b9719d911017c592
```

## 14. Implementation Checklist

### ✅ API Design Checklist

- [ ] Follow RESTful URL naming conventions
- [ ] Use appropriate HTTP methods and status codes
- [ ] Implement consistent request/response formats
- [ ] Add proper authentication and authorization
- [ ] Include comprehensive error handling
- [ ] Implement pagination for collections
- [ ] Add filtering, sorting, and search capabilities
- [ ] Configure rate limiting
- [ ] Set up proper caching headers
- [ ] Include security headers
- [ ] Document all endpoints in OpenAPI specification
- [ ] Write comprehensive API tests
- [ ] Set up monitoring and logging

### ✅ Code Quality Checklist

- [ ] Input validation on all endpoints
- [ ] Proper error handling and logging
- [ ] Database transaction management
- [ ] Service layer abstraction
- [ ] Dependency injection
- [ ] Unit and integration tests
- [ ] API documentation
- [ ] Performance optimization
- [ ] Security audit

## 15. Development Tools & Testing

### 15.1 OpenAPI Specification
All APIs must be documented using OpenAPI 3.0+ specification with:
- Complete endpoint documentation
- Request/response schemas
- Authentication requirements
- Example requests and responses

### 15.2 Testing Strategy
- **Unit Tests**: Business logic and utilities
- **Integration Tests**: Database operations and external services
- **Contract Tests**: API endpoint behavior
- **End-to-End Tests**: Complete user workflows

### 15.3 Development Tools
- **Postman Collections**: For manual API testing
- **OpenAPI Generators**: For client SDK generation
- **API Mocking**: For frontend development
- **Load Testing**: For performance validation

This comprehensive guide ensures consistent, maintainable, and developer-friendly APIs across the Veil platform.