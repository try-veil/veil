# 🚀 Complete Setup Guide - Integrated API Management System

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker)
- Razorpay account (for payments)

## Step 1: Environment Configuration

### 1.1 Get Razorpay Credentials

1. **Sign up at Razorpay**: https://razorpay.com
2. **Get Test Credentials**:
   - Go to Settings → API Keys
   - Generate Test Key ID and Key Secret
   - Note: Test keys start with `rzp_test_`

3. **Setup Webhook**:
   - Go to Settings → Webhooks
   - Add webhook URL: `http://localhost:3000/razorpay/webhook`
   - Select events: `payment.captured`, `payment.failed`
   - Generate webhook secret

### 1.2 Configure Environment Variables

Update `veil/packages/platform/api/.env`:

```bash
# Database
DATABASE_URL="postgresql://myuser:mypassword@localhost:5433/mydb"
NODE_ENV="development"

# Razorpay Configuration (REPLACE WITH YOUR VALUES)
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_URL=redis://localhost:6379



# Keep your existing FusionAuth settings
FUSIONAUTH_URL=http://localhost:9011
FUSIONAUTH_API_KEY=your_existing_api_key
# ... other existing values
```

Update `veil/packages/platform/web/apps/complete-application/.env`:

```bash
# Add these to your existing frontend .env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
```

## Step 2: Start Services

### 2.1 Start Database and Redis

```bash
cd veil/packages/platform/api
docker-compose up -d redis my_postgres
```

Wait 30 seconds for services to start.

### 2.2 Setup Database

```bash
# Install dependencies
yarn install

# Run migrations
yarn prisma migrate deploy

# Generate Prisma client
yarn prisma generate

# Setup default data
bash scripts/setup-database.sh
```

### 2.3 Start API Server

```bash
yarn start:dev
```

Server should start on http://localhost:3000

### 2.4 Start Frontend

```bash
cd veil/packages/platform/web/apps/complete-application
pnpm install
pnpm dev
```

Frontend should start on http://localhost:3001