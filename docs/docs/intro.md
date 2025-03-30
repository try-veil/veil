---
id: intro
title: Welcome to Veil API Marketplace
---

:::info

These docs are still a WIP, please open an [issue ticket](https://github.com/try-veil/veil/issues) if you see any discrepancies.

:::


## Overview

Veil is an API marketplace platform that enables API providers to publish their APIs and allows consumers to discover, subscribe to, and manage API access through a unified gateway. This documentation covers the platform architecture, specifications, and development guides.

## Core Components

1. **Gateway Layer (Caddy-based)**

2. **Platform Services**

3. **Security**

## Getting Started

1. **Development Setup**

2. **API Documentation**

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

## Contributing

1. **Development Guidelines**

   - [Code Style](./contribution/style.md)
   - [Git Workflow](./contribution/git.md)
   - [Testing Requirements](./contribution/testing.md)

2. **Documentation**
   - [API Documentation](./api/readme.md)
   - [Architecture Updates](./contribution/architecture/readme.md)

## Support

- [Issue Tracking](https://github.com/try-veil/veil/issues)
- [Security Policy](./security.md)
- [Release Notes](./releases/releases.md)

## License

Veil is licensed under the [MIT License](https://github.com/try-veil/veil). 