<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# Veil API

A secure API gateway service with FusionAuth integration for authentication and role-based access control.

## Features

- User authentication with FusionAuth
- Role-based access control
- API key management
- Swagger API documentation
- PostgreSQL database with Prisma ORM
- Docker Compose setup for local development

## Prerequisites

- Node.js (v18 or later)
- Docker and Docker Compose
- Yarn package manager

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd veil-api
```

2. Install dependencies:
```bash
yarn install
```

3. Start the infrastructure services:
```bash
docker-compose up -d
```

4. Configure FusionAuth:
   - Access FusionAuth admin UI at http://localhost:9011
   - Complete the initial setup
   - Create a new application
   - Update the `.env` file with your FusionAuth credentials:
     ```env
     FUSION_AUTH_URL="http://localhost:9011"
     FUSION_AUTH_API_KEY="your-api-key"
     FUSION_AUTH_APPLICATION_ID="your-application-id"
     FUSION_AUTH_TENANT_ID="your-tenant-id"
     ```

5. Set up the database:
```bash
npx prisma migrate dev
```

6. Start the application:
```bash
yarn start:dev
```

The API will be available at http://localhost:3000, and the Swagger documentation at http://localhost:3000/api.

## API Documentation

### Authentication Endpoints

#### Sign Up
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Get User Profile
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Create API Key
```bash
curl -X POST http://localhost:3000/auth/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Key"
  }'
```

#### Assign Role (Admin only)
```bash
curl -X POST http://localhost:3000/auth/assign-role \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "roleName": "admin"
  }'
```

## Testing

### Running Tests

```bash
# Unit tests
yarn test

# e2e tests
yarn test:e2e

# Test coverage
yarn test:cov
```

## Development

### Database Migrations

To create a new migration after modifying the Prisma schema:

```bash
npx prisma migrate dev --name your_migration_name
```

### API Documentation

The API documentation is automatically generated using Swagger. Access it at:
http://localhost:3000/api

## License

[MIT License](LICENSE)
