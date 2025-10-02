# Veil SaaS Platform BFF (Backend for Frontend)

A powerful BFF server built with Elysia and Bun, providing APIs for the Veil SaaS platform. This server handles user authentication, API marketplace functionality, API key management, and integrates with the Veil Caddy module for API proxying.

## Features

- 🔐 **User Authentication**: JWT-based auth with role-based access control
- 🏪 **API Marketplace**: Browse, search, and subscribe to APIs
- 👨‍💼 **Seller Dashboard**: API onboarding and management for sellers
- 🔑 **API Key Management**: Generate and manage API keys for subscriptions
- 👤 **User Profiles**: User settings and subscription management
- 🛡️ **Admin Panel**: API approval workflow and category management
- 📊 **Analytics**: Usage tracking and reporting
- 🔗 **Veil Integration**: Seamless integration with Veil proxy

## Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with bcryptjs
- **Validation**: Zod
- **Integration**: Veil Node.js SDK

## Quick Start

### Prerequisites

- Bun >= 1.0.0
- PostgreSQL >= 13
- Node.js >= 18 (for SDK compatibility)

### Installation

1. **Install dependencies**:
   ```bash
   cd packages/bff
   bun install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**:
   ```bash
   # Create database
   createdb veil_saas
   
   # Push schema to database
   bun run db:push
   ```

4. **Start Development Server**:
   ```bash
   bun run dev
   ```

The server will start at `http://localhost:3000`

## Environment Variables

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/veil_saas

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Application Configuration
PORT=3000
NODE_ENV=development

# Veil API Configuration
VEIL_API_BASE_URL=http://localhost:2020
VEIL_API_TIMEOUT=10000

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/verify-token` | Token verification |

### Marketplace Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/marketplace/apis` | Browse APIs with search/filter |
| GET | `/api/v1/marketplace/apis/:uid` | Get API details |
| POST | `/api/v1/marketplace/apis/:uid/subscribe` | Subscribe to API |
| POST | `/api/v1/marketplace/apis/:uid/rate` | Rate an API |
| GET | `/api/v1/marketplace/categories` | Get API categories |

### Seller Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/seller/dashboard` | Seller dashboard stats |
| GET | `/api/v1/seller/apis` | List seller's APIs |
| POST | `/api/v1/seller/apis` | Create new API |
| GET | `/api/v1/seller/apis/:uid` | Get API details |
| PUT | `/api/v1/seller/apis/:uid` | Update API |
| DELETE | `/api/v1/seller/apis/:uid` | Delete API |
| GET | `/api/v1/seller/apis/:uid/analytics` | API usage analytics |

### API Key Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/api-keys` | List user's API keys |
| POST | `/api/v1/api-keys/subscription/:uid` | Create API key |
| GET | `/api/v1/api-keys/:uid` | Get API key details |
| PUT | `/api/v1/api-keys/:uid` | Update API key |
| DELETE | `/api/v1/api-keys/:uid` | Delete API key |
| POST | `/api/v1/api-keys/:uid/regenerate` | Regenerate API key |

### Profile Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile` | Get user profile |
| PUT | `/api/v1/profile` | Update profile |
| POST | `/api/v1/profile/change-password` | Change password |
| GET | `/api/v1/profile/dashboard` | User dashboard |
| GET | `/api/v1/profile/subscriptions` | List subscriptions |
| DELETE | `/api/v1/profile/subscriptions/:uid` | Cancel subscription |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/stats` | Admin dashboard stats |
| GET | `/api/v1/admin/apis/pending` | Pending API approvals |
| POST | `/api/v1/admin/apis/:uid/approve` | Approve API |
| POST | `/api/v1/admin/apis/:uid/reject` | Reject API |
| GET | `/api/v1/admin/categories` | Manage categories |
| POST | `/api/v1/admin/categories` | Create category |
| DELETE | `/api/v1/admin/categories/:id` | Delete category |

## Database Schema

The application uses the following main entities:

- **Users**: User accounts with role-based access
- **APIs**: API definitions and metadata
- **API Categories**: Categorization system
- **API Subscriptions**: User subscriptions to APIs
- **API Keys**: Generated keys for API access
- **API Ratings**: User ratings and reviews
- **Usage Analytics**: API usage tracking

## Development

### Database Commands

```bash
# Generate migration
bun run db:generate

# Push schema changes
bun run db:push

# Open Drizzle Studio
bun run db:studio
```

### Project Structure

```
src/
├── config/           # Application configuration
├── db/              # Database schema and connection
├── middleware/      # Express-like middleware
├── routes/          # API route handlers
├── services/        # External service integrations
├── utils/           # Utility functions
├── validation/      # Zod validation schemas
└── index.ts         # Application entry point
```

## Deployment

### Production Setup

1. **Environment**:
   ```bash
   NODE_ENV=production
   DATABASE_URL=your-production-db-url
   JWT_SECRET=secure-production-secret
   ```

2. **Database Migration**:
   ```bash
   bun run db:push
   ```

3. **Start Server**:
   ```bash
   bun src/index.ts
   ```

## Security Considerations

- JWT tokens expire after 7 days by default
- Passwords are hashed using bcryptjs with salt rounds of 12
- API keys are generated using UUID v4 with custom prefix
- CORS is configured for specific origins in production
- Rate limiting is implemented for API endpoints
- SQL injection protection via Drizzle ORM parameterized queries

## Integration with Veil

The BFF integrates with the Veil Caddy module for API proxying:

1. **API Approval**: When an admin approves an API, it's automatically onboarded to Veil
2. **Path Mapping**: APIs are accessible at `/{api-uid}/*` through Veil
3. **Subscription Management**: API access is controlled via subscription requirements
4. **Key Management**: API keys are managed through both systems