# PAX - Payment & Proxy Service

Payment gateway and API proxy service for the Veil platform.

## Features

### Current (Razorpay Integration)
- ✅ Payment order creation
- ✅ Payment processing and verification
- ✅ Refund processing
- ✅ Webhook handling
- ✅ Payment analytics
- ✅ Transaction history

### Upcoming
- 🔄 API request proxying with metering
- 🔄 Credit management system
- 🔄 Invoice generation
- 🔄 Multi-provider support (Stripe, PayPal)

## Tech Stack

- **Framework**: Elysia (Bun runtime)
- **Database**: PostgreSQL with Drizzle ORM
- **Payment Provider**: Razorpay
- **Authentication**: JWT

## Setup

### Prerequisites
- Bun runtime
- PostgreSQL database
- Razorpay account

### Installation

```bash
# Install dependencies
bun install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
bun run db:push

# Start development server
bun run dev
```

### Environment Variables

See `.env.example` for all required environment variables.

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:3002/swagger`
- Health Check: `http://localhost:3002/health`

## Payment Flow

### 1. Create Payment Order
```bash
POST /api/v1/payments/create
Authorization: Bearer <token>

{
  "amount": 100,
  "currency": "INR",
  "provider": "razorpay",
  "description": "API Subscription"
}
```

### 2. Process Payment (After User Completes Payment)
```bash
POST /api/v1/payments/process
Authorization: Bearer <token>

{
  "paymentUid": "payment_uid",
  "paymentToken": "razorpay_payment_id",
  "razorpaySignature": "signature",
  "razorpayOrderId": "order_id"
}
```

### 3. Webhook Handler
```bash
POST /api/v1/webhooks/razorpay
X-Razorpay-Signature: <signature>

# Razorpay webhook payload
```

## Database Schema

### Payment Transactions
- Stores all payment transactions
- Tracks status, provider details, metadata
- Links to refunds

### Refunds
- Tracks refund transactions
- Links to original payment
- Stores refund status and reason

### Webhook Events
- Stores webhook events for audit
- Tracks processing status
- Enables retry logic

## Development

```bash
# Development mode with hot reload
bun run dev

# Run tests
bun test

# Database operations
bun run db:push      # Push schema changes
bun run db:studio    # Open Drizzle Studio
bun run db:generate  # Generate migrations
```

## Architecture

```
packages/pax/
├── src/
│   ├── config/          # Configuration
│   ├── db/              # Database schema & client
│   ├── middleware/      # Auth, etc.
│   ├── repositories/    # Data access layer
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   │   └── providers/   # Payment providers
│   ├── types/           # TypeScript types
│   └── index.ts         # Main app
```

## Security

- ✅ Webhook signature verification
- ✅ JWT authentication
- ✅ Input validation with Elysia
- ✅ CORS protection
- ✅ Error handling

## Monitoring

- Health check endpoint
- Payment analytics
- Webhook event tracking
- Error logging

## Deployment

```bash
# Build for production
bun run build

# Start production server
bun run start
```

## Support

For issues and questions, please refer to the main Veil documentation.
