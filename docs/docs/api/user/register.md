# User Registration Specification

## Overview

The user registration endpoint allows API consumers to create accounts in the marketplace.

## Base URL

```
POST /v1/users/register
```

## Request Body

```json
{
  "user": {
    "email": "string",           // User's email address
    "name": "string",            // Full name
    "company": {
      "name": "string",          // Company name
      "website": "string",       // Company website (optional)
      "size": "string"           // Company size category (optional)
    },
    "usage": {
      "purpose": "string",       // Intended API usage purpose
      "estimatedRequests": number // Estimated monthly requests
    },
    "preferences": {
      "newsletter": boolean,     // Opt-in for newsletter
      "notifications": {
        "email": boolean,        // Email notifications
        "webhook": boolean       // Webhook notifications
      }
    }
  },
  "security": {
    "password": "string",        // User password (min 8 chars)
    "mfaEnabled": boolean       // Enable 2FA during registration
  }
}
```

## Response

### Success Response (201 Created)

```json
{
  "status": "success",
  "message": "User successfully registered",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "registrationDate": "string", // ISO 8601 datetime
    "verificationStatus": {
      "email": "pending",
      "company": "pending"
    }
  },
  "nextSteps": {
    "emailVerification": {
      "required": true,
      "expiresIn": "24h"
    },
    "mfaSetup": {
      "required": boolean,
      "setupUrl": "string"
    }
  }
}
```

### Error Response (400 Bad Request)

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Invalid registration data",
  "details": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

## Notes

1. Email verification is required before API access is granted
2. Password must meet security requirements (8+ chars, mixed case, numbers)
3. Company verification may be required for certain usage levels
4. MFA setup must be completed if enabled during registration
5. Initial rate limits are based on estimated usage
6. Welcome email is sent after successful registration
