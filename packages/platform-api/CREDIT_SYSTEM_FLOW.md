# Veil Credit System - Complete Flow Documentation

## 🎯 System Overview

Veil uses a **credit-based system** where users purchase credits via Razorpay and consume them when accessing APIs through the platform. All transactions are tracked using a double-entry ledger system for accurate accounting.

---

## 📊 Complete End-to-End Flow

### **Phase 1: Credit Purchase**

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│ Frontend │────▶│ Platform │────▶│ Razorpay │────▶│  User    │
│          │     │   App    │     │   API    │     │ Gateway  │     │  Wallet  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

**Step-by-step:**

1. **User initiates credit purchase**
   - Endpoint: `POST /api/v1/wallet/credits/purchase`
   - Request: `{ amount: 1000, currency: "INR", payment_method: { provider: "razorpay" } }`

2. **Platform API creates Razorpay order**
   - Creates payment record in database (status: `pending`)
   - Calls Razorpay API to create order
   - Returns order details with `order_id` to frontend

3. **User completes payment on Razorpay**
   - Frontend opens Razorpay checkout
   - User enters payment details
   - Payment processed by Razorpay

4. **Razorpay webhook notification**
   - Endpoint: `POST /api/v1/payments/webhook/razorpay`
   - Event: `payment.captured` or `order.paid`
   - Signature validation using HMAC SHA256

5. **Credits added to wallet**
   - Payment record updated (status: `completed`)
   - Credits added to user wallet via `walletService.addCredits()`
   - Wallet transaction recorded
   - **Ledger entries created:**
     ```
     Debit:  Razorpay Gateway Account (1100)  ₹1000
     Credit: Credit Purchase Revenue (4100)   ₹1000

     Debit:  User Wallets (1300)              ₹1000
     Credit: User Credit Liability (2100)     ₹1000
     ```

6. **Gateway fee recorded** (optional)
   ```
   Debit:  Payment Gateway Fees (5000)       ₹22
   Credit: Razorpay Gateway Account (1100)  ₹22
   ```

---

### **Phase 2: API Subscription**

```
┌──────────┐     ┌────────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│ Marketplace│────▶│ Platform │────▶│  Caddy   │
│          │     │    API     │     │   API    │     │  Proxy   │
└──────────┘     └────────────┘     └──────────┘     └──────────┘
```

**Step-by-step:**

1. **User subscribes to API**
   - Endpoint: `POST /api/v1/subscriptions`
   - Creates subscription record (status: `active`)
   - No payment required (credit-based model)

2. **API Key generated**
   - Unique API key created
   - Key synced to Caddy proxy via NATS
   - Status: `active`

3. **User can now make API calls**
   - API key provided in header: `X-Subscription-Key: sk_xxxxx`

---

### **Phase 3: API Usage & Credit Deduction**

This is the core flow where credits are consumed!

```
┌──────┐    ┌───────┐    ┌──────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
│ User │───▶│ Caddy │───▶│ NATS │───▶│ Credit  │───▶│  Wallet  │───▶│  Ledger  │
│  API │    │ Proxy │    │ Event│    │ Worker  │    │ Service  │    │ Service  │
│Request    │       │    │      │    │         │    │          │    │          │
└──────┘    └───────┘    └──────┘    └─────────┘    └──────────┘    └──────────┘
```

**Detailed Flow:**

#### **3.1 API Request Received**
```bash
curl -H "X-Subscription-Key: sk_abc123..." \
  https://api.veil.com/v1/proxy/weather-api/current
```

- Request hits Caddy proxy (port 2021)
- Caddy validates API key in SQLite database
- Checks if key is `active` and subscription is valid

#### **3.2 Request Forwarded**
- If valid, Caddy forwards request to upstream API
- Records usage metrics (response time, status code, data size)

#### **3.3 Usage Event Published**
- Caddy publishes event to NATS topic: `credit.events`
```json
{
  "id": "evt_123abc",
  "api_path": "/weather-api/current",
  "subscription_key": "sk_abc123...",
  "method": "GET",
  "status_code": 200,
  "response_time_ms": 145,
  "success": true,
  "timestamp": "2025-10-05T10:30:00Z",
  "request_size": 512,
  "response_size": 2048
}
```

#### **3.4 Credit Deduction Worker Processes Event**

The `CreditDeductionWorker` subscribes to `credit.events` and:

1. **Retrieves API key and subscription**
   ```typescript
   const apiKey = await apiKeyRepo.findByKeyValue(event.subscription_key);
   const subscription = await subscriptionRepo.findById(apiKey.subscriptionId);
   const userId = subscription.userId;
   ```

2. **Gets user wallet**
   ```typescript
   const wallet = await walletService.getOrCreateWallet(userId);
   ```

3. **Calculates credits required**
   ```typescript
   const creditsRequired = calculateCreditsRequired(event);
   // Default: 1 credit per request
   // Can be customized based on:
   // - API endpoint (premium endpoints cost more)
   // - Request method (POST/PUT cost more than GET)
   // - Data transfer size
   // - Response time
   ```

4. **Checks balance**
   ```typescript
   if (availableBalance < creditsRequired) {
     // Insufficient credits!
     await deactivateApiKey(apiKey.id, 'insufficient_credits');
     await publishKeySyncEvent(apiKey.keyValue, false);
     return;
   }
   ```

5. **Deducts credits**
   ```typescript
   await walletService.deductCredits({
     userId,
     amount: creditsRequired.toString(),
     description: `API request: GET /weather-api/current`,
     referenceType: 'api_usage',
     referenceId: event.id,
     metadata: { /* event details */ }
   });
   ```

6. **Creates ledger entries**
   ```
   Debit:  User Credit Liability (2100)  ₹1
   Credit: User Wallets (1300)           ₹1
   ```

7. **Updates wallet transaction**
   ```typescript
   {
     type: 'debit',
     amount: '1.00',
     balanceBefore: '100.00',
     balanceAfter: '99.00',
     description: 'API request: GET /weather-api/current',
     referenceType: 'api_usage',
     referenceId: 'evt_123abc'
   }
   ```

8. **Checks for depletion**
   ```typescript
   if (newBalance <= MIN_BALANCE_THRESHOLD) {
     // Balance depleted!
     await deactivateApiKey(apiKey.id, 'balance_depleted');
     await publishKeySyncEvent(apiKey.keyValue, false, 'balance_depleted');
   } else if (newBalance < 10) {
     // Low balance warning
     console.warn(`Low balance: ${newBalance} credits`);
     // Could trigger email/notification
   }
   ```

---

### **Phase 4: API Key Deactivation**

When credits are depleted or insufficient:

```
┌─────────────┐    ┌──────────┐    ┌───────┐    ┌──────────┐
│Credit Worker│───▶│ Database │───▶│ NATS  │───▶│  Caddy   │
│             │    │ (Update) │    │ Sync  │    │  SQLite  │
└─────────────┘    └──────────┘    └───────┘    └──────────┘
```

**Step-by-step:**

1. **Platform API updates key status**
   ```sql
   UPDATE api_keys SET is_active = false WHERE id = ?
   ```

2. **Sync event published to NATS**
   ```json
   {
     "key_value": "sk_abc123...",
     "is_active": false,
     "timestamp": "2025-10-05T10:30:05Z",
     "reason": "balance_depleted"
   }
   ```

3. **Caddy receives sync event**
   - Updates SQLite database
   - Marks subscription key as inactive

4. **Subsequent requests rejected**
   ```
   HTTP/1.1 403 Forbidden
   {
     "error": "API key is inactive",
     "reason": "balance_depleted",
     "message": "Please recharge your account"
   }
   ```

---

## 🔄 Credit Replenishment

**User can recharge at any time:**

1. Purchase more credits (Phase 1)
2. Credits added to wallet
3. User can manually reactivate API key or
4. Admin can reactivate via:
   ```
   PUT /api/v1/api-keys/:uid/activate
   ```
5. Key synced back to Caddy as `active`

---

## 📈 Reporting & Analytics

### **User Wallet Dashboard**

```
GET /api/v1/wallet/balance
```
```json
{
  "walletId": 123,
  "balance": "99.00",
  "lockedBalance": "0.00",
  "availableBalance": "99.00",
  "currency": "INR"
}
```

### **Transaction History**

```
GET /api/v1/wallet/transactions?page=1&limit=50
```
```json
{
  "transactions": [
    {
      "type": "debit",
      "amount": "1.00",
      "balanceBefore": "100.00",
      "balanceAfter": "99.00",
      "description": "API request: GET /weather-api/current",
      "createdAt": "2025-10-05T10:30:00Z"
    }
  ],
  "pagination": { "total": 1, "page": 1, "totalPages": 1 }
}
```

### **Wallet Statistics**

```
GET /api/v1/wallet/statistics?from_date=2025-10-01&to_date=2025-10-05
```
```json
{
  "currentBalance": "99.00",
  "statistics": {
    "totalCredits": "100.00",
    "totalDebits": "1.00",
    "transactionCount": 2,
    "netChange": "99.00"
  }
}
```

### **Ledger Reports (Admin)**

```
GET /api/v1/ledger/trial-balance
```
```json
{
  "accounts": [
    { "code": "1300", "name": "User Wallets", "debit": "1000.00", "credit": "0.00" },
    { "code": "2100", "name": "User Credit Liability", "debit": "0.00", "credit": "1000.00" }
  ],
  "totalDebits": "1000.00",
  "totalCredits": "1000.00",
  "isBalanced": true
}
```

---

## 🎛️ Configuration

### **Credit Pricing**

Modify in `credit-deduction-worker.ts`:

```typescript
// Credits per request
private readonly CREDIT_PER_REQUEST = 1;

// Customize pricing
private calculateCreditsRequired(event: UsageEvent): number {
  let credits = this.CREDIT_PER_REQUEST;

  // Premium endpoints
  if (event.api_path.includes('/premium')) {
    credits *= 2;
  }

  // Failed requests cost less
  if (event.status_code >= 400) {
    credits *= 0.5;
  }

  // Data transfer pricing
  const dataGB = (event.response_size) / (1024 * 1024 * 1024);
  if (dataGB > 0.001) {
    credits += Math.ceil(dataGB * 10); // 10 credits per GB
  }

  return credits;
}
```

### **Deactivation Threshold**

```typescript
private readonly MIN_BALANCE_THRESHOLD = 0; // Deactivate at 0 credits
```

### **Low Balance Warning**

```typescript
if (newBalance < 10) {
  // Trigger notification
  await notificationService.sendLowBalanceAlert(userId, newBalance);
}
```

---

## 🔐 Security Considerations

1. **Razorpay Webhook Validation**
   - HMAC SHA256 signature verification
   - Prevents unauthorized credit additions

2. **API Key Deactivation**
   - Automatic on credit depletion
   - Prevents unauthorized API access

3. **Double-Entry Ledger**
   - All transactions balanced
   - Audit trail for every credit movement

4. **NATS Pub/Sub**
   - Reliable event delivery
   - Automatic retries

---

## 🚀 Deployment Checklist

### **Environment Variables**

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=your_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# NATS Configuration
NATS_URL=nats://localhost:4222

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/veil
```

### **Database Setup**

```bash
# Push schema
bun run db:push

# Initialize system accounts
curl -X POST http://localhost:3000/api/v1/ledger/initialize-accounts
```

### **Razorpay Webhook Setup**

1. Go to Razorpay Dashboard → Webhooks
2. Add webhook URL: `https://your-domain.com/api/v1/payments/webhook/razorpay`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
   - `refund.created`
4. Copy webhook secret to `.env`

### **Service Startup**

```bash
# Start Platform API
cd packages/platform-api
bun run dev

# Start Caddy Proxy
cd packages/caddy
make run

# Start NATS (if not running)
docker run -p 4222:4222 nats:latest
```

---

## 📊 Monitoring

### **Worker Status**

Check logs for:
```
✅ Credit worker started (subscription-based tracking)
✅ Credit deduction worker started (wallet-based credit system)
```

### **Key Metrics**

1. **Credit Deduction Rate**
   - Events processed per second
   - Average deduction time

2. **Wallet Balance Distribution**
   - Users with low balance (<10 credits)
   - Total credits in circulation

3. **API Key Deactivation Rate**
   - Keys deactivated per day
   - Reasons: `balance_depleted` vs `insufficient_credits`

4. **Ledger Balance**
   - Trial balance should always balance
   - Total debits = Total credits

---

## 🐛 Troubleshooting

### **Credits not deducted**

1. Check NATS connection
2. Verify `credit.events` topic has messages
3. Check worker logs for errors

### **API key not deactivated**

1. Verify `key.sync` event published
2. Check Caddy SQLite database
3. Verify NATS connectivity

### **Ledger unbalanced**

1. Check for failed transactions
2. Verify all credit operations create paired entries
3. Run trial balance report

---

## 📝 Future Enhancements

1. **Tiered Pricing**
   - Different credit costs per API tier
   - Volume discounts

2. **Credit Packages**
   - Bulk purchase discounts
   - Subscription plans with included credits

3. **Credit Expiry**
   - Time-based credit expiration
   - Use-it-or-lose-it policies

4. **Auto-Recharge**
   - Automatic credit purchase when balance low
   - Configurable thresholds

5. **Credit Transfers**
   - Transfer credits between users
   - Gift credits

6. **Advanced Analytics**
   - Credit consumption forecasting
   - Cost optimization recommendations
