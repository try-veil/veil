# Veil SaaS Platform API - API Summary

**Version:** 1.0.0  
**Generated:** 2025-10-03T05:16:26.993Z

## Overview
No description available

## Statistics
- **Total Endpoints:** 0
- **Categories/Tags:** 15  
- **Data Schemas:** 0
- **Server Environments:** 3
- **Authentication Methods:** 2

## API Categories

### Authentication
User authentication and authorization

### Marketplace
API discovery and browsing

### Categories
API category management

### Provider
API provider onboarding and management

### Subscriptions
Subscription plans and billing

### Payments
Payment processing and invoicing

### Analytics
Usage analytics and reporting

### Seller
API seller dashboard

### API Keys
API key management

### Profile
User profile management

### Admin
Administrative functions

### Approvals
Approval workflows

### Usage
Usage tracking and monitoring

### Quota
Quota management and monitoring

### System
System health and information


## Server Environments

- **Production server:** `https://api.veil.dev`
- **Staging server:** `https://staging-api.veil.dev`
- **Development server:** `http://localhost:3000`

## Authentication

### bearerAuth
- **Type:** http
- **Description:** JWT authentication token obtained from login endpoint

### apiKeyAuth
- **Type:** apiKey
- **Description:** API key for accessing marketplace endpoints


## Quick Start

1. Register at `POST /api/v1/auth/register`
2. Login at `POST /api/v1/auth/login` 
3. Browse marketplace at `GET /api/v1/marketplace`
4. Create subscription at `POST /api/v1/subscriptions`
5. Generate API key at `POST /api/v1/api-keys`

## Resources

- **Documentation:** https://docs.veil.dev
- **Support:** support@veil.dev
- **License:** MIT

---

*This summary was automatically generated from the OpenAPI specification.*
