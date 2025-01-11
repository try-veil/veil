# Veil API Marketplace Documentation

## Overview

Veil is an API marketplace platform that enables API providers to publish their APIs and allows consumers to discover, subscribe to, and manage API access through a unified gateway. This documentation covers the platform architecture, specifications, and development guides.

## Core Components

1. **Gateway Layer (Caddy-based)**

   - [Gateway Architecture](./contribution/architecture/readme.md#gateway-configuration-management)
   - [Configuration Management](./contribution/caddy/GET.json5)
   - [Rate Limiting](./api/analytics/rate-limits.md)

2. **Platform Services**

   - [API Management](./api/provider/readme.md)
   - [User Management](./api/consumer/readme.md)
   - [Analytics & Billing](./api/analytics/readme.md)

3. **Security**
   - [Authentication](./contribution/architecture/readme.md#security-architecture)
   - [API Key Management](./api/consumer/api-keys.md)
   - [Rate Limiting](./api/analytics/rate-limits.md)

## Getting Started

1. **Development Setup**

   - [Local Environment](./setup.md)
   - [Configuration Guide](./contribution/readme.md)
   - [Testing Guide](./contribution/testing.md)

2. **API Documentation**
   - [Provider APIs](./api/provider/readme.md)
     - [API Onboarding](./api/provider/onboarding.md)
     - [API Validation](./api/provider/validate.md)
     - [API Updates](./api/provider/update.md)
   - [Consumer APIs](./api/consumer/readme.md)
     - [Registration](./api/consumer/register.md)
     - [API Keys](./api/consumer/api-keys.md)
     - [Subscriptions](./api/consumer/subscriptions.md)
   - [Analytics APIs](./api/analytics/readme.md)
     - [Usage Analytics](./api/analytics/usage.md)
     - [Rate Limits](./api/analytics/rate-limits.md)
     - [Billing](./api/analytics/billing.md)

## Architecture

1. **Core Design**

   - [Architecture Overview](./contribution/architecture/readme.md)
   - [System Components](./contribution/architecture/arch.mmd)
   - [Data Flow](./contribution/architecture/seq-dig/usage.sequence.mmd)

2. **Key Features**

   - Versioned API configurations
   - Log-based analytics
   - Hybrid consistency model
   - Multi-region deployment
   - High availability design

3. **Technology Stack**
   - Go & Caddy for core services
   - Ory.sh for authentication
   - SQLite for data storage (v1)
   - S3-compatible config storage

## Deployment

1. **Infrastructure**

   - [Production Setup](./deployment/production.md)
   - [Scaling Guide](./deployment/scaling.md)
   - [Monitoring](./deployment/monitoring.md)

2. **Operations**
   - [Backup & Recovery](./deployment/backup.md)
   - [Security Guidelines](./deployment/security.md)
   - [Incident Response](./deployment/incidents.md)

## Contributing

1. **Development Guidelines**

   - [Code Style](./contribution/style.md)
   - [Git Workflow](./contribution/git.md)
   - [Testing Requirements](./contribution/testing.md)

2. **Documentation**
   - [Documentation Style](./contribution/docs.md)
   - [API Documentation](./contribution/api-docs.md)
   - [Architecture Updates](./contribution/architecture.md)

## Support

- [Issue Tracking](https://github.com/veil/issues)
- [Security Policy](./security.md)
- [Release Notes](./releases.md)

## License

Veil is licensed under the [MIT License](./LICENSE).
