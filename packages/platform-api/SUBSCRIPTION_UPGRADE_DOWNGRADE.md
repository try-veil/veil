# Subscription Upgrade/Downgrade Implementation

## Overview

Implemented comprehensive subscription plan change functionality with prorated billing for upgrades and downgrades.

## Components Implemented

### 1. Proration Utility ([proration.ts](src/utils/proration.ts))

**Core Functions:**

- `calculateProration()` - Base proration calculation
- `calculateUpgradeProration()` - Upgrade-specific logic (always positive charge)
- `calculateDowngradeProration()` - Downgrade-specific logic (with immediate/scheduled options)
- `calculateCancellationRefund()` - Proration for subscription cancellation
- `calculateBillingCycleChangeProration()` - Handle annual ↔ monthly changes

**Proration Formula:**
```typescript
const totalDaysInPeriod = getDaysBetween(periodStart, periodEnd);
const daysRemaining = getDaysBetween(changeDate, periodEnd);

const currentDailyRate = currentPrice / totalDaysInPeriod;
const newDailyRate = newPrice / totalDaysInPeriod;

const unusedAmount = currentDailyRate * daysRemaining; // Credit
const proratedNewAmount = newDailyRate * daysRemaining; // Charge

const netAmount = proratedNewAmount - unusedAmount; // Net charge/credit
```

**Example Proration:**
- Current plan: $100/month
- New plan: $150/month
- Billing period: 30 days
- Change date: Day 10 (20 days remaining)

```
Daily rate (current): $100 / 30 = $3.33/day
Daily rate (new): $150 / 30 = $5.00/day

Unused credit: $3.33 × 20 = $66.60
Prorated charge: $5.00 × 20 = $100.00

Net charge: $100.00 - $66.60 = $33.40
```

### 2. Subscription Service Methods ([subscription-service.ts](src/services/subscription-service.ts))

#### **changePlan()**
Core method that handles both upgrades and downgrades:

```typescript
async changePlan(
  subscriptionUid: string,
  newPricingModelId: number,
  applyImmediately: boolean = true
): Promise<{
  subscription: SubscriptionResponse;
  proration: ProrationResult;
  changeType: 'upgrade' | 'downgrade' | 'same';
}>
```

**Process:**
1. Validate subscription is active
2. Fetch current and new pricing models
3. Determine change type (upgrade/downgrade/same)
4. Calculate proration based on current billing period
5. Update subscription with new pricing model
6. Create pricing history record
7. Enqueue payment/credit event for processing
8. Update billing period with proration details

#### **upgradePlan()**
Wrapper for upgrades - enforces upgrade validation:

```typescript
async upgradePlan(
  subscriptionUid: string,
  newPricingModelId: number
): Promise<{
  subscription: SubscriptionResponse;
  proration: ProrationResult;
}>
```

- Always applies immediately
- Charges the difference right away
- Net amount is always positive (charge)

#### **downgradePlan()**
Wrapper for downgrades - supports scheduled changes:

```typescript
async downgradePlan(
  subscriptionUid: string,
  newPricingModelId: number,
  applyImmediately: boolean = false
): Promise<{
  subscription: SubscriptionResponse;
  proration: ProrationResult;
  scheduledFor?: Date;
}>
```

**Two downgrade modes:**

1. **Immediate** (`applyImmediately = true`):
   - Applies downgrade immediately
   - Credits the difference to account
   - Net amount is negative (credit)

2. **Scheduled** (`applyImmediately = false`):
   - Downgrade takes effect at period end
   - No proration needed
   - User keeps current plan until next billing cycle

#### **previewPlanChange()**
Preview proration without applying changes:

```typescript
async previewPlanChange(
  subscriptionUid: string,
  newPricingModelId: number,
  applyImmediately: boolean = true
): Promise<{
  currentPlan: any;
  newPlan: any;
  proration: ProrationResult;
  changeType: 'upgrade' | 'downgrade' | 'same';
}>
```

- Shows what will happen without committing
- Returns current plan, new plan, and proration details
- Useful for UI to show user the cost impact

### 3. API Routes ([subscriptions.ts](src/routes/subscriptions.ts))

#### **GET /api/v1/subscriptions/:uid/plan-change/preview**

Preview plan change impact:

**Query Parameters:**
- `newPricingModelId` (required): ID of new pricing model
- `applyImmediately` (optional): Whether to apply immediately (for downgrades)

**Response:**
```json
{
  "success": true,
  "data": {
    "currentPlan": {
      "id": 1,
      "name": "Standard Plan",
      "price": 100,
      "billingCycle": "monthly"
    },
    "newPlan": {
      "id": 2,
      "name": "Premium Plan",
      "price": 150,
      "billingCycle": "monthly"
    },
    "proration": {
      "creditAmount": 66.60,
      "chargeAmount": 100.00,
      "netAmount": 33.40,
      "daysRemaining": 20,
      "totalDaysInPeriod": 30,
      "effectiveDate": "2025-10-01T00:00:00.000Z",
      "nextBillingDate": "2025-10-21T00:00:00.000Z"
    },
    "changeType": "upgrade"
  }
}
```

#### **POST /api/v1/subscriptions/:uid/upgrade**

Upgrade to higher-tier plan:

**Request Body:**
```json
{
  "newPricingModelId": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription upgraded successfully",
  "data": {
    "subscription": { /* full subscription details */ },
    "proration": {
      "creditAmount": 66.60,
      "chargeAmount": 100.00,
      "netAmount": 33.40,
      "daysRemaining": 20,
      "effectiveDate": "2025-10-01T00:00:00.000Z",
      "nextBillingDate": "2025-10-21T00:00:00.000Z"
    }
  }
}
```

**Behavior:**
- Always applies immediately
- Charges prorated difference
- New benefits available right away

#### **POST /api/v1/subscriptions/:uid/downgrade**

Downgrade to lower-tier plan:

**Request Body:**
```json
{
  "newPricingModelId": 1,
  "applyImmediately": false
}
```

**Response (Scheduled):**
```json
{
  "success": true,
  "message": "Subscription downgrade scheduled for end of billing period",
  "data": {
    "subscription": { /* full subscription details */ },
    "proration": {
      "creditAmount": 0,
      "chargeAmount": 0,
      "netAmount": 0,
      "daysRemaining": 20,
      "effectiveDate": "2025-10-21T00:00:00.000Z",
      "nextBillingDate": "2025-10-21T00:00:00.000Z"
    },
    "scheduledFor": "2025-10-21T00:00:00.000Z"
  }
}
```

**Response (Immediate):**
```json
{
  "success": true,
  "message": "Subscription downgraded successfully",
  "data": {
    "subscription": { /* full subscription details */ },
    "proration": {
      "creditAmount": 100.00,
      "chargeAmount": 66.60,
      "netAmount": -33.40,
      "daysRemaining": 20,
      "effectiveDate": "2025-10-01T00:00:00.000Z",
      "nextBillingDate": "2025-10-21T00:00:00.000Z"
    }
  }
}
```

## Integration with Event Queue

Plan changes trigger payment processing events:

```typescript
await eventQueue.enqueue('payment_processing', {
  subscriptionId: subscription.id,
  amount: Math.abs(proration.netAmount),
  type: proration.netAmount > 0 ? 'charge' : 'credit',
  reason: `Subscription ${changeType} proration`,
  invoiceId: null
}, {
  priority: 'high',
  maxAttempts: 5
});
```

**Benefits:**
- Reliable payment processing with retries
- Async processing doesn't block API response
- Failed payments go to dead letter queue for manual review

## Pricing History Tracking

Every plan change creates a history record:

```typescript
await this.pricingRepository.createSubscriptionPricingHistory({
  subscriptionId: subscription.id,
  oldPricingModelId: currentPricingModelId,
  newPricingModelId: newPricingModelId,
  changeType: 'upgrade' | 'downgrade',
  changeReason: 'Plan upgrade/downgrade',
  prorationAmount: proration.netAmount.toString(),
  effectiveDate: proration.effectiveDate
});
```

**Use cases:**
- Audit trail of all plan changes
- Analytics on upgrade/downgrade patterns
- Customer support reference
- Revenue forecasting

## Error Handling

### Validation Errors

**Invalid subscription:**
```json
{
  "success": false,
  "message": "Subscription not found"
}
```

**Inactive subscription:**
```json
{
  "success": false,
  "message": "Can only change plan for active subscriptions"
}
```

**Same price:**
```json
{
  "success": false,
  "message": "New plan has the same price as current plan"
}
```

**Wrong change type:**
```json
{
  "success": false,
  "message": "New plan must be more expensive than current plan for upgrade"
}
```

### Proration Validation

The `validateProrationInputs()` function ensures:
- Prices are non-negative
- Period start < period end
- Change date is within billing period

## User Experience Flows

### Upgrade Flow

1. User selects premium plan
2. Frontend calls preview endpoint
3. UI shows: "You'll be charged $33.40 today for the remaining 20 days"
4. User confirms
5. Frontend calls upgrade endpoint
6. Immediate access to new features
7. Confirmation email sent

### Downgrade Flow (Scheduled)

1. User selects basic plan
2. Frontend calls preview endpoint with `applyImmediately=false`
3. UI shows: "Downgrade will take effect on Oct 21. You'll keep premium features until then."
4. User confirms
5. Frontend calls downgrade endpoint
6. Subscription marked for downgrade
7. Cron job applies downgrade at period end

### Downgrade Flow (Immediate)

1. User selects basic plan
2. Frontend calls preview endpoint with `applyImmediately=true`
3. UI shows: "You'll receive a $33.40 credit. Premium features will be removed immediately."
4. User confirms
5. Frontend calls downgrade endpoint
6. Features downgraded immediately
7. Credit applied to account

## Testing Examples

### Test 1: Mid-cycle Upgrade

```bash
# Preview upgrade
curl -X GET "http://localhost:3010/api/v1/subscriptions/SUB123/plan-change/preview?newPricingModelId=2"

# Apply upgrade
curl -X POST http://localhost:3010/api/v1/subscriptions/SUB123/upgrade \
  -H "Content-Type: application/json" \
  -d '{"newPricingModelId": 2}'
```

### Test 2: Scheduled Downgrade

```bash
# Preview downgrade (end of period)
curl -X GET "http://localhost:3010/api/v1/subscriptions/SUB123/plan-change/preview?newPricingModelId=1&applyImmediately=false"

# Apply downgrade (scheduled)
curl -X POST http://localhost:3010/api/v1/subscriptions/SUB123/downgrade \
  -H "Content-Type: application/json" \
  -d '{"newPricingModelId": 1, "applyImmediately": false}'
```

### Test 3: Immediate Downgrade

```bash
# Preview downgrade (immediate)
curl -X GET "http://localhost:3010/api/v1/subscriptions/SUB123/plan-change/preview?newPricingModelId=1&applyImmediately=true"

# Apply downgrade (immediate)
curl -X POST http://localhost:3010/api/v1/subscriptions/SUB123/downgrade \
  -H "Content-Type: application/json" \
  -d '{"newPricingModelId": 1, "applyImmediately": true}'
```

## Database Changes

### Billing Period Updates

When plan changes occur, billing periods are updated with proration details:

```typescript
await this.pricingRepository.updateBillingPeriod(currentBillingPeriod.id, {
  proratedAmount: proration.netAmount.toString(),
  notes: `upgrade proration: 20 days remaining`
});
```

### Subscription Pricing History

New table tracking all pricing changes:

```sql
CREATE TABLE subscription_pricing_history (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES api_subscriptions(id),
  old_pricing_model_id INTEGER REFERENCES pricing_models(id),
  new_pricing_model_id INTEGER REFERENCES pricing_models(id),
  change_type VARCHAR(20), -- 'upgrade' or 'downgrade'
  change_reason TEXT,
  proration_amount DECIMAL(10, 2),
  effective_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Business Logic

### Upgrade Policy

- **Always immediate**: Upgrades apply immediately
- **Charge difference**: User pays prorated amount right away
- **Instant access**: New features available immediately

**Rationale**: Users upgrading want benefits now, not later.

### Downgrade Policy

- **Default scheduled**: Downgrades apply at period end
- **Optional immediate**: User can choose immediate downgrade
- **Keep paid features**: User keeps higher-tier features until period end (scheduled)
- **Credit applied**: Immediate downgrades credit the unused amount

**Rationale**: Customers have already paid for the billing period, so they should keep benefits.

## Revenue Impact

### Proration Benefits

- **Fair billing**: Users only pay for what they use
- **Reduces friction**: Easier to upgrade/downgrade
- **Increases conversions**: Lower risk for users to try higher tiers
- **Trust building**: Transparent pricing builds customer confidence

### Revenue Protection

- **No gaming system**: Scheduled downgrades prevent users from downgrading right before renewal
- **Credits > refunds**: Credits keep money in system vs cash refunds
- **Upgrade incentives**: Immediate upgrades encourage trying premium tiers

## Future Enhancements

1. **Annual ↔ Monthly switching**: Support changing billing cycles
2. **Plan comparison**: Endpoint to compare plans side-by-side
3. **Rollback**: Allow undoing recent plan changes
4. **Promotion codes**: Apply discounts during plan changes
5. **Usage-based adjustments**: Adjust pricing based on actual usage
6. **Scheduled upgrades**: Allow scheduling upgrades (like downgrades)
7. **Custom proration policies**: Configurable proration rules per API

## Summary

The subscription upgrade/downgrade system provides:

✅ **Flexible plan changes**: Upgrade/downgrade anytime
✅ **Fair proration**: Only pay for days used
✅ **Transparent pricing**: Preview before committing
✅ **Scheduled options**: Downgrades can wait until period end
✅ **Reliable processing**: Event queue ensures payments complete
✅ **Complete audit trail**: Pricing history tracks all changes
✅ **User-friendly**: Clear messaging and fair policies

All plan changes are processed reliably with automatic retries and dead letter queue for failures.
