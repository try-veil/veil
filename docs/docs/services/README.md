# Veil Services Architecture

This directory contains documentation for the various services that make up the Veil API marketplace platform. These services work together to enable API onboarding, subscription management, request routing, and consumption tracking.

## Core Services

| Service                                                 | Description                 | Primary Responsibility                                 |
| ------------------------------------------------------- | --------------------------- | ------------------------------------------------------ |
| [GatewayService](gateway-service.md)                    | API gateway built on Caddy  | Routes API requests and validates API keys             |
| [OnboardingService](onboarding-service.md)              | API provider onboarding     | Manages API registration and configuration             |
| [SubscriptionService](subscription-service.md)          | API subscriptions           | Manages consumer subscriptions and API keys            |
| [CreditService](credit-service.md)                      | Credit management           | Core service managing credit balances and transactions |
| [CreditManagementService](credit-management-service.md) | Credit administration       | BFF for credit operations and user interfaces          |
| [AuthService](auth-service.md)                          | Authentication (FusionAuth) | Handles user authentication and JWT issuance           |

## Architecture Overview

The Veil platform follows a microservices architecture with the following key components:

1. **Gateway Layer**: Caddy-based API gateway that handles routing, API key validation, and usage tracking
2. **BFF Layer**: Backend-for-Frontend services that handle JWT validation and business logic
3. **Core Services**: Internal services that manage the platform's core data and operations
4. **Authentication**: External authentication service (FusionAuth) for user management

## Service Interactions

### Provider Onboarding Flow

```
Provider -> AuthService -> OnboardingService -> GatewayService
```

1. Provider authenticates with AuthService and receives JWT
2. Provider submits API details to OnboardingService
3. OnboardingService configures routes in GatewayService
4. Provider receives API ID for reference

### Consumer Subscription Flow

```
Consumer -> AuthService -> SubscriptionService -> GatewayService
```

1. Consumer authenticates with AuthService and receives JWT
2. Consumer requests API subscription from SubscriptionService
3. SubscriptionService generates API key and registers it with GatewayService
4. Consumer receives API key for making API calls

### Credit Management Flow

```
Consumer -> AuthService -> CreditManagementService -> CreditService
```

1. Consumer authenticates with AuthService and receives JWT
2. Consumer interacts with CreditManagementService to view/manage credits
3. CreditManagementService communicates with CreditService for balance and transactions

### API Request Flow

```
Consumer -> GatewayService -> CreditService -> Provider API
```

1. Consumer sends request to GatewayService with API key
2. GatewayService validates the API key
3. GatewayService checks credits with CreditService
4. GatewayService transforms the request and forwards to Provider API
5. GatewayService logs usage with CreditService
6. Consumer receives response from Provider API via Gateway

## Service Development

Each service is designed to be independently deployable with the following characteristics:

- Clearly defined API contracts
- Stateless where possible
- Single responsibility principle
- Secure service-to-service authentication
- Proper error handling and logging
- Observability instrumentation

## Implementation Notes

- Services should verify JWT tokens using the JWKS URL from the AuthService
- Service-to-service communication should use secure authentication
- All services should implement proper logging and metrics
- Consider implementing circuit breakers for resilience
- Use database transactions for operations that span multiple updates
- Implement proper caching strategies for frequently accessed data
