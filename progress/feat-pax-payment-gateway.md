# Payment Gateway & Proxy Service (feat/pax)

## Overview
Create a unified payment gateway and proxy service that handles:
- Payment gateway integration (Razorpay, Stripe, etc.)
- API request proxying with usage metering
- Credit management and balance tracking
- Invoice generation and management

## Technology Stack
- **Framework**: Elysia (Bun runtime)
- **Database**: PostgreSQL with Drizzle ORM
- **Payment Providers**: Razorpay (primary), Stripe, PayPal (future)
- **Proxy**: HTTP proxy with request/response interception

## Architecture

### 1. Package Structure
```
packages/pax/
├── src/
│   ├── index.ts                    # Main Elysia app
│   ├── config.ts                   # Configuration
│   ├── db/
│   │   ├── schema.ts              # Database schema
│   │   └── index.ts               # DB client
│   ├── routes/
│   │   ├── payments.ts            # Payment endpoints
│   │   ├── proxy.ts               # Proxy endpoints
│   │   ├── credits.ts             # Credit management
│   │   └── invoices.ts            # Invoice management
│   ├── services/
│   │   ├── payment-gateway.ts     # Payment processing
│   │   ├── proxy-service.ts       # Request proxying
│   │   ├── credit-service.ts      # Credit tracking
│   │   ├── invoice-service.ts     # Invoice generation
│   │   └── providers/
│   │       ├── razorpay.ts        # Razorpay provider
│   │       ├── stripe.ts          # Stripe provider
│   │       └── base-provider.ts   # Base payment provider interface
│   ├── middleware/
│   │   ├── auth.ts                # Authentication
│   │   ├── metering.ts            # Usage metering
│   │   └── credit-check.ts        # Credit balance validation
│   ├── repositories/
│   │   ├── payment-repository.ts
│   │   ├── credit-repository.ts
│   │   └── invoice-repository.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

### 2. Database Schema

#### Credits Table
```typescript
{
  id: serial
  uid: uuid
  userId: integer (FK to users)
  balance: decimal(10,2)
  reservedBalance: decimal(10,2)  // For in-flight requests
  currency: varchar(3)
  lastUpdated: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Credit Transactions Table
```typescript
{
  id: serial
  uid: uuid
  creditAccountId: integer (FK to credits)
  type: varchar(20)  // 'credit', 'debit', 'reserve', 'release'
  amount: decimal(10,2)
  balanceBefore: decimal(10,2)
  balanceAfter: decimal(10,2)
  referenceType: varchar(50)  // 'payment', 'subscription', 'usage', 'refund'
  referenceId: varchar(255)
  metadata: jsonb
  createdAt: timestamp
}
```

#### Proxy Usage Records Table
```typescript
{
  id: serial
  uid: uuid
  subscriptionId: integer (FK to subscriptions)
  apiKeyId: integer (FK to api_keys)
  creditTransactionId: integer (FK to credit_transactions)
  endpoint: varchar(500)
  method: varchar(10)
  statusCode: integer
  requestSize: integer
  responseSize: integer
  costAmount: decimal(10,6)
  duration: integer  // milliseconds
  timestamp: timestamp
  metadata: jsonb
}
```

#### Payment Gateway Transactions Table
```typescript
{
  id: serial
  uid: uuid
  userId: integer (FK to users)
  provider: varchar(50)
  providerTransactionId: varchar(255)
  amount: decimal(10,2)
  currency: varchar(3)
  status: varchar(20)  // 'pending', 'processing', 'completed', 'failed', 'refunded'
  paymentMethod: varchar(50)
  metadata: jsonb
  webhookReceived: boolean
  webhookProcessedAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Invoices Table
```typescript
{
  id: serial
  uid: uuid
  invoiceNumber: varchar(50) UNIQUE
  userId: integer (FK to users)
  subscriptionId: integer (FK to subscriptions)
  billingPeriodStart: timestamp
  billingPeriodEnd: timestamp
  status: varchar(20)  // 'draft', 'pending', 'paid', 'overdue', 'cancelled'
  subtotal: decimal(10,2)
  discountAmount: decimal(10,2)
  taxAmount: decimal(10,2)
  totalAmount: decimal(10,2)
  currency: varchar(3)
  lineItems: jsonb  // Array of usage/subscription items
  paymentTransactionId: integer (FK to payment_gateway_transactions)
  dueDate: timestamp
  paidDate: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 3. Core Services

#### Payment Gateway Service
```typescript
class PaymentGatewayService {
  // Initialize payment
  createPayment(userId, amount, currency, metadata)

  // Process payment with provider
  processPayment(paymentId, paymentMethod)

  // Handle webhooks
  handleWebhook(provider, payload, signature)

  // Refund management
  refundPayment(paymentId, amount, reason)

  // Add credits after successful payment
  creditUserAccount(userId, amount, paymentId)
}
```

#### Proxy Service
```typescript
class ProxyService {
  // Proxy request with metering
  proxyRequest(apiKey, targetUrl, request)

  // Pre-request credit check
  checkAndReserveCredits(apiKeyId, estimatedCost)

  // Post-request settlement
  settleTransaction(apiKeyId, actualCost, reservationId)

  // Calculate request cost
  calculateCost(apiId, request, response)
}
```

#### Credit Service
```typescript
class CreditService {
  // Get user balance
  getBalance(userId)

  // Add credits
  addCredits(userId, amount, referenceType, referenceId)

  // Deduct credits
  deductCredits(userId, amount, referenceType, referenceId)

  // Reserve credits (for in-flight requests)
  reserveCredits(userId, amount)

  // Release reservation
  releaseReservation(userId, reservationId, actualAmount)

  // Get transaction history
  getTransactionHistory(userId, filters)
}
```

#### Invoice Service
```typescript
class InvoiceService {
  // Generate invoice for billing period
  generateInvoice(subscriptionId, billingPeriod)

  // Calculate usage charges
  calculateUsageCharges(subscriptionId, startDate, endDate)

  // Apply pricing model
  applyPricingModel(pricingModelId, usage)

  // Send invoice
  sendInvoice(invoiceId, recipient)

  // Mark invoice as paid
  markPaid(invoiceId, paymentTransactionId)
}
```

### 4. API Endpoints

#### Payment Endpoints
- `POST /api/v1/payments/create` - Create payment intent
- `POST /api/v1/payments/process` - Process payment
- `POST /api/v1/payments/webhooks/:provider` - Webhook handler
- `POST /api/v1/payments/refund` - Request refund
- `GET /api/v1/payments/:paymentId` - Get payment details
- `GET /api/v1/payments` - List payments

#### Proxy Endpoints
- `ALL /proxy/:apiId/*` - Proxy API requests
- `GET /api/v1/proxy/health` - Health check
- `GET /api/v1/proxy/stats/:apiKeyId` - Get usage stats

#### Credit Endpoints
- `GET /api/v1/credits/balance` - Get balance
- `GET /api/v1/credits/transactions` - Transaction history
- `POST /api/v1/credits/purchase` - Purchase credits
- `GET /api/v1/credits/estimate` - Estimate cost for operation

#### Invoice Endpoints
- `GET /api/v1/invoices` - List invoices
- `GET /api/v1/invoices/:invoiceId` - Get invoice
- `POST /api/v1/invoices/generate` - Generate invoice
- `GET /api/v1/invoices/:invoiceId/pdf` - Download PDF
- `POST /api/v1/invoices/:invoiceId/pay` - Pay invoice

### 5. Integration Points

#### With Platform API
- Fetch subscription details
- Validate API keys
- Get pricing models
- Update subscription usage

#### With Caddy Gateway
- Receive proxy requests
- Report usage metrics
- Validate requests

#### With External Services
- Payment providers (Razorpay, Stripe)
- Email service (invoice delivery)
- PDF generation (invoices)

### 6. Credit System Flow

1. **User adds credits**:
   - User initiates payment
   - Payment processed via provider
   - On success, credits added to account
   - Transaction recorded

2. **Proxy request with metering**:
   - Request arrives with API key
   - Calculate estimated cost
   - Check user balance
   - Reserve credits
   - Proxy request
   - Calculate actual cost
   - Deduct from reserved amount
   - Release remaining reservation

3. **Negative balance handling**:
   - Set credit threshold (e.g., $0)
   - Reject requests if balance < threshold
   - Send low balance notifications
   - Auto-suspend on zero balance

### 7. Pricing Models Support

- **Pay-as-you-go**: Deduct per request
- **Prepaid credits**: Add credits, deduct on usage
- **Subscription + Overages**: Free tier, then charge
- **Tiered pricing**: Different rates per tier

### 8. Invoice Generation

- **Trigger**: End of billing period (cron job)
- **Calculate**:
  - Base subscription fee
  - Usage charges
  - Apply discounts
  - Calculate tax
- **Generate**: PDF invoice
- **Send**: Email to user
- **Track**: Payment status

## Implementation Plan

### Phase 1: Setup & Core Infrastructure ✅
- [ ] Create new package structure
- [ ] Setup Elysia server
- [ ] Configure database connection
- [ ] Define database schema
- [ ] Setup Drizzle ORM
- [ ] Create migration scripts

### Phase 2: Credit System 📋
- [ ] Implement credit repository
- [ ] Build credit service
- [ ] Create credit endpoints
- [ ] Add transaction recording
- [ ] Implement balance checks
- [ ] Add reservation system

### Phase 3: Payment Gateway 💳
- [ ] Create base payment provider interface
- [ ] Implement Razorpay provider
- [ ] Build payment gateway service
- [ ] Create payment endpoints
- [ ] Implement webhook handling
- [ ] Add payment verification
- [ ] Connect to credit system

### Phase 4: Proxy Service 🔄
- [ ] Build proxy service
- [ ] Implement metering middleware
- [ ] Add credit check middleware
- [ ] Create proxy endpoints
- [ ] Implement cost calculation
- [ ] Add request/response logging

### Phase 5: Invoice System 🧾
- [ ] Create invoice repository
- [ ] Build invoice service
- [ ] Implement invoice generation
- [ ] Add PDF generation
- [ ] Create invoice endpoints
- [ ] Setup email delivery
- [ ] Add billing period job

### Phase 6: Integration & Testing 🔗
- [ ] Integrate with platform API
- [ ] Connect to Caddy gateway
- [ ] End-to-end testing
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation

### Phase 7: Deployment 🚀
- [ ] Setup environment configs
- [ ] Database migrations
- [ ] Deploy to staging
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Alerting configuration

## Configuration

### Environment Variables
```bash
# Server
PORT=3002
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/pax

# Payment Providers
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Platform API
PLATFORM_API_URL=http://localhost:3000
PLATFORM_API_KEY=

# Caddy Gateway
GATEWAY_URL=http://localhost:2021

# Invoice Service
INVOICE_EMAIL_FROM=invoices@veil.com
PDF_SERVICE_URL=

# Credits
MINIMUM_BALANCE=0.00
LOW_BALANCE_THRESHOLD=10.00
```

## Security Considerations

1. **API Key Security**: Hash API keys, never log full keys
2. **Payment Provider Webhooks**: Verify signatures
3. **Credit Transactions**: Use database transactions (ACID)
4. **Rate Limiting**: Prevent abuse
5. **Audit Logging**: Log all financial transactions
6. **Encryption**: Encrypt sensitive data at rest
7. **Input Validation**: Validate all inputs
8. **CORS**: Restrict origins

## Monitoring & Observability

1. **Metrics**:
   - Payment success/failure rates
   - Proxy request latency
   - Credit balance distribution
   - Invoice generation status

2. **Alerts**:
   - Failed payments
   - Low credit balance
   - Proxy errors
   - Webhook failures

3. **Logging**:
   - All payment transactions
   - Credit operations
   - Proxy requests
   - Invoice generation

## Success Criteria

- [ ] Process payments successfully via Razorpay
- [ ] Proxy requests with accurate metering
- [ ] Maintain accurate credit balances
- [ ] Generate correct invoices
- [ ] Handle 1000+ requests/second
- [ ] 99.9% uptime
- [ ] < 100ms proxy latency overhead
- [ ] Zero credit discrepancies

## Notes & Decisions

- Using Elysia for high performance (Bun runtime)
- PostgreSQL for ACID compliance (financial data)
- Credit reservation system prevents race conditions
- Webhooks for async payment processing
- Separate service for isolation and scalability
- Can be deployed independently from platform API

## Review Checklist

- [ ] Architecture reviewed and approved
- [ ] Database schema reviewed
- [ ] Security considerations addressed
- [ ] Integration points validated
- [ ] Performance requirements defined
- [ ] Monitoring strategy approved
- [ ] Deployment plan reviewed
