---
id: intro
title: Veil - Documentation
---

:::info

These docs are still a WIP, please open an [issue ticket](https://github.com/try-veil/veil/issues) if you see any discrepancies.

:::


## Overview

Veil is an opinionated, fully featured, modular observability stack for APIs. Allows you to sell, monitor, authenticate your APIs.

The veil API marketplace platform enables API providers to publish their APIs and allows consumers to discover, subscribe to, and manage API access through a unified gateway. This documentation covers the platform architecture, specifications, and development guides.

## Core Components

1. **Gateway Layer (Caddy-based)**

This component is also called the `core` of caddy by maintainers. This is a modded caddy build with first class support for observability and API validation validation for non standard properties like API keys, granular rate limits, etc.

2. **Platform Services**

The Veil marketplace platform is a SaaS built using Veil and offered by [TheFlyWheel](https://theflywheel.in) where developers can come and host their APIs and get them behind a paywell very easily.


## Architecture

1. **Design**

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

   - Gateway Layer
      - Go & Caddy for core services
      - SQLite for data storage (v1)
   - Platform Services
      - FusionAuth for authentication 
      - S3-compatible config storage (WIP)

## Contributing

1. **Development Guidelines**

   - [Development Setup](./contribution/setup.md)
   - [Code Style](./contribution/style.md)
   - [Git Workflow](./contribution/git.md)
   - [Testing Requirements](./contribution/testing.md)

2. **Documentation**

   - [Architecture Design Document](./contribution/architecture/readme.md)
   - [API Desing Document](./api/readme.md)
   - [OpenAPI Swagger Reference for implemented APIs](./swagger/veil-core-openapi-reference.info.mdx)


## Support

- [Issue Tracking](https://github.com/try-veil/veil/issues)
- [Release Notes](https://github.com/try-veil/veil/releases)

## License

Veil is licensed under the [MIT License](https://github.com/try-veil/veil?tab=MIT-1-ov-file#readme). 