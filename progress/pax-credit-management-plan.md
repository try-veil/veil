# PAX - Credit Management System Plan

## Overview

Implement a comprehensive credit management system that handles user credit balances, transactions, reservations, and integrates with the Razorpay payment system for credit purchases.

## Goals

1. **Accurate Balance Tracking**: Maintain precise credit balances with transaction history
2. **Reservation System**: Reserve credits for in-flight API requests to prevent overdrafts
3. **Purchase Integration**: Allow users to buy credits via Razorpay
4. **Transaction Audit**: Complete audit trail of all credit operations
5. **Low Balance Alerts**: Notify users when credits are running low
6. **Concurrent Safety**: Handle concurrent transactions without race conditions

## Database Schema

### 1. Credit Accounts Table
```typescript
credit_accounts {
  id: serial PRIMARY KEY
  uid: uuid UNIQUE NOT NULL
  userId: integer NOT NULL  // FK to users in platform-api

  // Balance tracking
  balance: decimal(12,4) NOT NULL DEFAULT 0.0000  // Available balance
  reservedBalance: decimal(12,4) NOT NULL DEFAULT 0.0000  // Reserved for in-flight requests
  totalCredits: decimal(12,4) NOT NULL DEFAULT 0.0000  // Lifetime credits added
  totalSpent: decimal(12,4) NOT NULL DEFAULT 0.0000  // Lifetime credits spent

  // Currency
  currency: varchar(3) NOT NULL DEFAULT 'INR'

  // Settings
  lowBalanceThreshold: decimal(12,4) DEFAULT 10.0000
  autoRechargeEnabled: boolean DEFAULT false
  autoRechargeAmount: decimal(12,4) DEFAULT 100.0000
  autoRechargeThreshold: decimal(12,4) DEFAULT 5.0000

  // Status
  isActive: boolean DEFAULT true
  isSuspended: boolean DEFAULT false
  suspensionReason: text

  // Timestamps
  lastTransactionAt: timestamp
  createdAt: timestamp DEFAULT NOW()
  updatedAt: timestamp DEFAULT NOW()

  // Indexes
  INDEX idx_credit_accounts_user_id (userId)
  INDEX idx_credit_accounts_balance (balance)
  INDEX idx_credit_accounts_active (isActive)
}
```

### 2. Credit Transactions Table
```typescript
credit_transactions {
  id: serial PRIMARY KEY
  uid: uuid UNIQUE NOT NULL
  creditAccountId: integer NOT NULL  // FK to credit_accounts

  // Transaction details
  type: varchar(20) NOT NULL  // 'credit', 'debit', 'reserve', 'release', 'refund', 'adjustment'
  amount: decimal(12,4) NOT NULL

  // Balance snapshots
  balanceBefore: decimal(12,4) NOT NULL
  balanceAfter: decimal(12,4) NOT NULL
  reservedBalanceBefore: decimal(12,4)
  reservedBalanceAfter: decimal(12,4)

  // Reference tracking
  referenceType: varchar(50)  // 'payment', 'proxy_request', 'subscription', 'refund', 'admin_adjustment'
  referenceId: varchar(255)  // UID of the referenced entity

  // Description
  description: text

  // Metadata
  metadata: jsonb  // Store additional context

  // Status (for reversible transactions)
  status: varchar(20) DEFAULT 'completed'  // 'pending', 'completed', 'reversed'
  reversedBy: integer  // FK to reversing transaction
  reversedAt: timestamp

  // Timestamps
  createdAt: timestamp DEFAULT NOW()

  // Indexes
  INDEX idx_credit_tx_account (creditAccountId)
  INDEX idx_credit_tx_type (type)
  INDEX idx_credit_tx_reference (referenceType, referenceId)
  INDEX idx_credit_tx_created (createdAt)
  INDEX idx_credit_tx_status (status)
}
```

### 3. Credit Reservations Table
```typescript
credit_reservations {
  id: serial PRIMARY KEY
  uid: uuid UNIQUE NOT NULL
  creditAccountId: integer NOT NULL  // FK to credit_accounts
  transactionId: integer  // FK to credit_transactions (reserve transaction)

  // Reservation details
  amount: decimal(12,4) NOT NULL
  purpose: varchar(50) NOT NULL  // 'proxy_request', 'subscription_hold'

  // Reference
  referenceType: varchar(50)  // 'proxy_request', 'subscription'
  referenceId: varchar(255)

  // Status
  status: varchar(20) DEFAULT 'active'  // 'active', 'settled', 'released', 'expired'

  // Settlement
  settledAmount: decimal(12,4)  // Actual amount deducted (may be less than reserved)
  settledAt: timestamp
  settleTransactionId: integer  // FK to debit transaction

  // Release
  releasedAmount: decimal(12,4)  // Amount returned (difference between reserved and settled)
  releasedAt: timestamp
  releaseTransactionId: integer  // FK to release transaction

  // Expiration
  expiresAt: timestamp  // Auto-release if not settled by this time

  // Timestamps
  createdAt: timestamp DEFAULT NOW()
  updatedAt: timestamp DEFAULT NOW()

  // Indexes
  INDEX idx_credit_res_account (creditAccountId)
  INDEX idx_credit_res_status (status)
  INDEX idx_credit_res_expires (expiresAt)
  INDEX idx_credit_res_reference (referenceType, referenceId)
}
```

### 4. Credit Packages Table (for purchase)
```typescript
credit_packages {
  id: serial PRIMARY KEY
  uid: uuid UNIQUE NOT NULL

  // Package details
  name: varchar(100) NOT NULL
  description: text
  credits: decimal(12,4) NOT NULL  // Amount of credits
  price: decimal(10,2) NOT NULL  // Price in currency
  currency: varchar(3) NOT NULL DEFAULT 'INR'

  // Bonus
  bonusCredits: decimal(12,4) DEFAULT 0  // Extra credits given

  // Display
  isPopular: boolean DEFAULT false
  displayOrder: integer DEFAULT 0

  // Status
  isActive: boolean DEFAULT true

  // Timestamps
  createdAt: timestamp DEFAULT NOW()
  updatedAt: timestamp DEFAULT NOW()

  // Indexes
  INDEX idx_credit_packages_active (isActive)
  INDEX idx_credit_packages_order (displayOrder)
}
```

### 5. Credit Purchase History Table
```typescript
credit_purchases {
  id: serial PRIMARY KEY
  uid: uuid UNIQUE NOT NULL
  creditAccountId: integer NOT NULL  // FK to credit_accounts
  packageId: integer  // FK to credit_packages (null for custom amounts)
  paymentTransactionId: integer  // FK to payment_transactions

  // Purchase details
  credits: decimal(12,4) NOT NULL  // Credits purchased
  bonusCredits: decimal(12,4) DEFAULT 0
  totalCredits: decimal(12,4) NOT NULL  // credits + bonusCredits
  price: decimal(10,2) NOT NULL
  currency: varchar(3) NOT NULL

  // Status
  status: varchar(20) DEFAULT 'pending'  // 'pending', 'completed', 'failed', 'refunded'

  // Processing
  creditedAt: timestamp
  creditTransactionId: integer  // FK to credit_transactions

  // Timestamps
  createdAt: timestamp DEFAULT NOW()
  updatedAt: timestamp DEFAULT NOW()

  // Indexes
  INDEX idx_credit_purchases_account (creditAccountId)
  INDEX idx_credit_purchases_payment (paymentTransactionId)
  INDEX idx_credit_purchases_status (status)
}
```

## Core Services

### 1. CreditAccountService

```typescript
class CreditAccountService {
  // Account management
  async createAccount(userId: number): CreditAccount
  async getAccount(userId: number): CreditAccount
  async getAccountByUid(uid: string): CreditAccount
  async updateSettings(userId: number, settings: AccountSettings): CreditAccount

  // Balance queries
  async getBalance(userId: number): BalanceInfo
  async getAvailableBalance(userId: number): number
  async getTotalBalance(userId: number): number  // available + reserved

  // Account status
  async suspendAccount(userId: number, reason: string): void
  async unsuspendAccount(userId: number): void
  async isAccountActive(userId: number): boolean
}

interface BalanceInfo {
  balance: number;
  reservedBalance: number;
  availableBalance: number;
  currency: string;
  lowBalanceThreshold: number;
  isLowBalance: boolean;
}

interface AccountSettings {
  lowBalanceThreshold?: number;
  autoRechargeEnabled?: boolean;
  autoRechargeAmount?: number;
  autoRechargeThreshold?: number;
}
```

### 2. CreditTransactionService

```typescript
class CreditTransactionService {
  // Core operations
  async addCredits(
    userId: number,
    amount: number,
    referenceType: string,
    referenceId: string,
    description?: string,
    metadata?: any
  ): CreditTransaction

  async deductCredits(
    userId: number,
    amount: number,
    referenceType: string,
    referenceId: string,
    description?: string,
    metadata?: any
  ): CreditTransaction

  async refundCredits(
    userId: number,
    amount: number,
    referenceType: string,
    referenceId: string,
    description?: string
  ): CreditTransaction

  async adjustCredits(
    userId: number,
    amount: number,  // Can be positive or negative
    reason: string,
    adminUserId: number
  ): CreditTransaction

  // Transaction history
  async getTransactions(
    userId: number,
    filters?: TransactionFilters
  ): CreditTransaction[]

  async getTransaction(uid: string): CreditTransaction

  // Analytics
  async getTransactionSummary(
    userId: number,
    fromDate?: Date,
    toDate?: Date
  ): TransactionSummary

  // Reversals
  async reverseTransaction(transactionId: number, reason: string): CreditTransaction
}

interface TransactionFilters {
  type?: string;
  referenceType?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

interface TransactionSummary {
  totalCredits: number;
  totalDebits: number;
  netChange: number;
  transactionCount: number;
  byType: Record<string, { count: number; amount: number }>;
}
```

### 3. CreditReservationService

```typescript
class CreditReservationService {
  // Reserve credits (for in-flight operations)
  async reserveCredits(
    userId: number,
    amount: number,
    purpose: string,
    referenceType: string,
    referenceId: string,
    expiresInMinutes?: number
  ): CreditReservation

  // Settle reservation (deduct actual amount)
  async settleReservation(
    reservationUid: string,
    actualAmount: number
  ): {
    debitTransaction: CreditTransaction;
    releaseTransaction?: CreditTransaction;  // If actualAmount < reservedAmount
  }

  // Release reservation (cancel and return credits)
  async releaseReservation(reservationUid: string): CreditTransaction

  // Get reservation
  async getReservation(uid: string): CreditReservation

  // Get active reservations for user
  async getActiveReservations(userId: number): CreditReservation[]

  // Cleanup expired reservations (run as cron job)
  async cleanupExpiredReservations(): number
}
```

### 4. CreditPurchaseService

```typescript
class CreditPurchaseService {
  // Package management
  async getPackages(): CreditPackage[]
  async getPackage(uid: string): CreditPackage
  async createPackage(data: CreatePackageData): CreditPackage  // Admin
  async updatePackage(uid: string, data: UpdatePackageData): CreditPackage  // Admin

  // Purchase flow
  async initiatePurchase(
    userId: number,
    packageUid: string
  ): {
    purchaseUid: string;
    paymentOrder: PaymentOrder;  // From PaymentService
  }

  async initiatePurchaseCustomAmount(
    userId: number,
    amount: number  // INR amount
  ): {
    purchaseUid: string;
    paymentOrder: PaymentOrder;
  }

  // Process purchase after payment
  async completePurchase(
    purchaseUid: string,
    paymentTransactionUid: string
  ): CreditPurchase

  async failPurchase(purchaseUid: string, reason: string): void

  // Purchase history
  async getPurchases(userId: number): CreditPurchase[]
  async getPurchase(uid: string): CreditPurchase

  // Auto-recharge
  async checkAndTriggerAutoRecharge(userId: number): void
}
```

## API Endpoints

### Credit Account Endpoints

```typescript
GET    /api/v1/credits/account
// Get user's credit account details including balance

GET    /api/v1/credits/balance
// Get current balance (simplified)
Response: { balance, reservedBalance, availableBalance, currency }

PUT    /api/v1/credits/account/settings
// Update account settings (thresholds, auto-recharge)
Body: { lowBalanceThreshold?, autoRechargeEnabled?, ... }

GET    /api/v1/credits/account/stats
// Get account statistics (lifetime credits, spent, etc.)
```

### Transaction Endpoints

```typescript
GET    /api/v1/credits/transactions
// Get transaction history with filters
Query: { type?, referenceType?, fromDate?, toDate?, limit?, offset? }

GET    /api/v1/credits/transactions/:uid
// Get specific transaction details

GET    /api/v1/credits/transactions/summary
// Get transaction summary/analytics
Query: { fromDate?, toDate? }

POST   /api/v1/credits/adjust  // Admin only
// Manual credit adjustment
Body: { userId, amount, reason }
```

### Package & Purchase Endpoints

```typescript
GET    /api/v1/credits/packages
// Get available credit packages

GET    /api/v1/credits/packages/:uid
// Get specific package details

POST   /api/v1/credits/packages  // Admin only
// Create new credit package
Body: { name, credits, price, bonusCredits?, ... }

PUT    /api/v1/credits/packages/:uid  // Admin only
// Update credit package

POST   /api/v1/credits/purchase
// Initiate credit purchase
Body: { packageUid }

POST   /api/v1/credits/purchase/custom
// Purchase custom credit amount
Body: { amount }  // INR amount

GET    /api/v1/credits/purchases
// Get purchase history

GET    /api/v1/credits/purchases/:uid
// Get specific purchase details
```

### Reservation Endpoints (Internal/Service-to-Service)

```typescript
POST   /internal/v1/credits/reserve
// Reserve credits for operation
Body: { userId, amount, purpose, referenceType, referenceId }

POST   /internal/v1/credits/settle/:reservationUid
// Settle reservation after operation
Body: { actualAmount }

POST   /internal/v1/credits/release/:reservationUid
// Release reservation (cancel operation)
```

## Credit Purchase Flow

### Standard Package Purchase:

```
1. User selects package
   ↓
2. POST /credits/purchase { packageUid }
   ↓
3. Create credit_purchase record (status: pending)
   ↓
4. Create payment order via PaymentService
   ↓
5. Return { purchaseUid, paymentOrder }
   ↓
6. User completes payment via Razorpay
   ↓
7. Payment webhook received
   ↓
8. PaymentService marks payment as completed
   ↓
9. CreditPurchaseService.completePurchase()
   ↓
10. Add credits to user account
    ↓
11. Create credit_transaction record
    ↓
12. Update credit_purchase (status: completed)
    ↓
13. Send confirmation email/notification
```

### Custom Amount Purchase:

```
1. User enters custom amount (e.g., ₹500)
   ↓
2. POST /credits/purchase/custom { amount: 500 }
   ↓
3. Calculate credits: amount / creditRate (e.g., ₹1 = 1 credit)
   ↓
4. Create credit_purchase record
   ↓
5. [Same as above from step 4]
```

## Credit Reservation Flow (for Proxy Requests)

### Reserve → Settle Flow:

```
1. Proxy request arrives
   ↓
2. Estimate cost (e.g., 0.50 credits)
   ↓
3. Check available balance >= estimate
   ↓
4. Reserve credits:
   - balance: 100 → 99.50
   - reservedBalance: 0 → 0.50
   ↓
5. Process proxy request
   ↓
6. Calculate actual cost (e.g., 0.35 credits)
   ↓
7. Settle reservation:
   - Debit 0.35 from reserved
   - Release 0.15 back to available
   - balance: 99.50 → 99.65
   - reservedBalance: 0.50 → 0
   ↓
8. Record usage
```

### Reserve → Release Flow (if request fails):

```
1. Proxy request arrives
   ↓
2. Reserve 0.50 credits
   ↓
3. Request fails before processing
   ↓
4. Release reservation:
   - balance: 99.50 → 100
   - reservedBalance: 0.50 → 0
```

## Transaction Safety & Race Conditions

### Database-Level Safety:

1. **Row-Level Locking**:
```sql
-- When updating balances, use FOR UPDATE
BEGIN;
SELECT * FROM credit_accounts WHERE user_id = ? FOR UPDATE;
UPDATE credit_accounts SET balance = balance - ? WHERE id = ?;
INSERT INTO credit_transactions (...);
COMMIT;
```

2. **Check Constraints**:
```sql
ALTER TABLE credit_accounts
ADD CONSTRAINT check_balance_non_negative CHECK (balance >= 0);

ALTER TABLE credit_accounts
ADD CONSTRAINT check_reserved_non_negative CHECK (reserved_balance >= 0);
```

3. **Transaction Isolation**:
```typescript
// Use database transactions for all balance operations
await db.transaction(async (tx) => {
  // Lock account
  const account = await tx.select()
    .from(creditAccounts)
    .where(eq(creditAccounts.userId, userId))
    .for('update');

  // Check balance
  if (account.balance < amount) {
    throw new Error('Insufficient credits');
  }

  // Update balance
  await tx.update(creditAccounts)
    .set({ balance: sql`${creditAccounts.balance} - ${amount}` })
    .where(eq(creditAccounts.id, account.id));

  // Record transaction
  await tx.insert(creditTransactions).values({...});
});
```

### Application-Level Safety:

1. **Idempotency Keys**: For credit additions from payments
```typescript
// Use payment transaction UID as idempotency key
const existing = await db.select()
  .from(creditTransactions)
  .where(eq(creditTransactions.referenceId, paymentUid));

if (existing.length > 0) {
  return existing[0];  // Already processed
}
```

2. **Reservation Expiry**: Auto-cleanup of stale reservations
```typescript
// Cron job every minute
async cleanupExpiredReservations() {
  const expired = await db.select()
    .from(creditReservations)
    .where(
      and(
        eq(creditReservations.status, 'active'),
        lte(creditReservations.expiresAt, new Date())
      )
    );

  for (const reservation of expired) {
    await this.releaseReservation(reservation.uid);
  }
}
```

## Low Balance Notifications

### Notification Triggers:

1. **Below Threshold**: When balance drops below lowBalanceThreshold
2. **Reservation Failed**: When reservation fails due to insufficient balance
3. **Zero Balance**: When balance reaches 0

### Notification Types:

```typescript
interface LowBalanceNotification {
  type: 'low_balance' | 'insufficient_balance' | 'zero_balance';
  userId: number;
  currentBalance: number;
  threshold: number;
  recommendedTopUp: number;
  quickPurchaseLink: string;
}
```

### Notification Channels:

- Email
- In-app notification
- Webhook (optional)

## Auto-Recharge System

### Flow:

```
1. After each debit transaction
   ↓
2. Check if balance < autoRechargeThreshold
   ↓
3. If yes AND autoRechargeEnabled:
   ↓
4. Initiate purchase for autoRechargeAmount
   ↓
5. Use saved payment method (if available)
   ↓
6. Or send notification to user to complete payment
```

### Configuration:

```typescript
{
  autoRechargeEnabled: true,
  autoRechargeThreshold: 5.0,  // Trigger when balance < 5
  autoRechargeAmount: 100.0,   // Purchase 100 credits
  savedPaymentMethod: 'card_xxx'  // Optional
}
```

## Credit Rate Configuration

### Flexible Credit-to-Currency Conversion:

```typescript
// Config table or environment
credit_config {
  creditRate: 1.0,  // 1 INR = 1 credit
  currency: 'INR',
  minimumPurchase: 10.0,  // Minimum ₹10
  maximumPurchase: 10000.0  // Maximum ₹10,000
}
```

### Dynamic Pricing:

```typescript
// Calculate credits from INR amount
function calculateCredits(inrAmount: number): number {
  return inrAmount * config.creditRate;
}

// Calculate INR from credits
function calculatePrice(credits: number): number {
  return credits / config.creditRate;
}
```

## Admin Features

### Admin Endpoints:

```typescript
POST   /admin/v1/credits/adjust
// Manual credit adjustment
Body: { userId, amount, reason }

GET    /admin/v1/credits/accounts
// List all credit accounts
Query: { search?, status?, limit?, offset? }

GET    /admin/v1/credits/accounts/:userId
// Get user's credit account details

POST   /admin/v1/credits/suspend
// Suspend user's credit account
Body: { userId, reason }

POST   /admin/v1/credits/unsuspend
// Unsuspend user's credit account
Body: { userId }

GET    /admin/v1/credits/analytics
// Platform-wide credit analytics
```

### Admin Analytics:

```typescript
interface PlatformCreditAnalytics {
  totalAccounts: number;
  activeAccounts: number;
  totalCreditsInCirculation: number;
  totalReservedCredits: number;
  totalRevenue: number;  // From credit purchases
  averageBalance: number;
  lowBalanceAccounts: number;
  topSpenders: UserSpending[];
}
```

## Testing Strategy

### Unit Tests:
- CreditAccountService methods
- CreditTransactionService methods
- CreditReservationService methods
- Balance calculations
- Transaction safety

### Integration Tests:
- Purchase flow end-to-end
- Reserve → Settle flow
- Reserve → Release flow
- Concurrent transactions
- Auto-recharge trigger

### Load Tests:
- Concurrent balance updates
- High-frequency reservations
- Bulk transaction creation

## Implementation Checklist

### Phase 1: Core Credit System
- [ ] Create database schema
- [ ] Implement CreditAccountService
- [ ] Implement CreditTransactionService
- [ ] Basic API endpoints (balance, transactions)
- [ ] Unit tests

### Phase 2: Reservation System
- [ ] Implement CreditReservationService
- [ ] Reservation expiry cleanup job
- [ ] Internal API endpoints
- [ ] Integration tests

### Phase 3: Purchase Integration
- [ ] Credit package management
- [ ] CreditPurchaseService
- [ ] Payment integration
- [ ] Purchase API endpoints
- [ ] End-to-end purchase flow test

### Phase 4: Notifications & Auto-recharge
- [ ] Low balance notifications
- [ ] Auto-recharge logic
- [ ] Email templates
- [ ] Notification service integration

### Phase 5: Admin Features
- [ ] Admin endpoints
- [ ] Analytics dashboard data
- [ ] Manual adjustment tools

## Success Criteria

- [ ] Accurate balance tracking with no discrepancies
- [ ] Handle 100+ concurrent transactions without race conditions
- [ ] Reserve → Settle flow completes in < 100ms
- [ ] Purchase flow success rate > 99%
- [ ] Zero double-crediting from payments
- [ ] Reservation expiry cleanup runs reliably
- [ ] Low balance notifications sent within 1 minute

## Edge Cases to Handle

1. **Concurrent Reservations**: Multiple requests trying to reserve simultaneously
2. **Payment Refunds**: Handle credit reversal when payment is refunded
3. **Partial Settlements**: When actual cost is less than reserved
4. **Expired Reservations**: Auto-release without manual intervention
5. **Negative Balances**: Prevent through constraints and checks
6. **Double-Crediting**: Idempotency for payment webhooks
7. **Account Suspension**: Block all operations on suspended accounts
8. **Currency Mismatches**: Validate currency consistency
9. **Failed Auto-recharge**: Fallback to manual notification
10. **Transaction Reversals**: Support for error corrections

## Monitoring & Alerts

### Metrics to Track:
- Total credits in circulation
- Daily credit purchases
- Daily credit consumption
- Average reservation time
- Failed reservations (insufficient balance)
- Auto-recharge trigger rate
- Low balance notification rate

### Alerts:
- High rate of failed reservations
- Unusual credit consumption patterns
- Auto-recharge failures
- Reservation cleanup errors
- Balance discrepancies detected

---

**Status**: Ready for review and implementation
**Estimated Complexity**: High (financial system)
**Estimated Time**: 3-4 days implementation + 1-2 days testing
