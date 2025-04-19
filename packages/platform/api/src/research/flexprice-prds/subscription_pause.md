# Subscription Pause Feature - Product Requirements Document

## Problem Statement

Customers often need to temporarily pause their subscriptions for various reasons:
- Financial constraints requiring temporary cost reduction
- Seasonal business fluctuations
- Extended travel or absence
- Temporary lack of need for the service

Without a pause feature, customers are forced to either:
1. Continue paying for services they're not using
2. Cancel their subscription entirely and potentially re-subscribe later

This leads to increased customer churn and reduced customer lifetime value (LTV). By implementing a subscription pause feature, we can:
- Improve customer retention
- Increase customer satisfaction
- Provide more flexibility in billing
- Reduce involuntary churn due to financial constraints

## Current Architecture

The subscription system currently supports the following statuses:
- `active`: The subscription is active and billing normally
- `cancelled`: The subscription has been cancelled
- `trialing`: The subscription is in a trial period

The system has a `SubscriptionStatusPaused` status defined in the types but no functional implementation to support pausing subscriptions.

## Proposed Solution

### Core Functionality

1. **Pause Subscription**: Allow customers to temporarily pause their subscription, stopping billing while maintaining the subscription record
2. **Resume Subscription**: Allow customers to resume a paused subscription, restarting billing
3. **Scheduled Pause/Resume**: Support scheduling pauses and resumes for future dates
4. **Pause History**: Track the history of pauses for reporting and analysis

### Database Schema Changes

#### 1. Update Subscription Model

Add the following fields to the `Subscription` struct:

```go
// Add to existing Subscription struct
type Subscription struct {
    // ... existing fields ...
    
    // PauseStatus tracks the current pause state
    PauseStatus types.PauseStatus `db:"pause_status" json:"pause_status"`
    
    // ActivePauseID references the current active pause configuration
    // This will be null if no pause is active or scheduled
    ActivePauseID *string `db:"active_pause_id" json:"active_pause_id,omitempty"`
}
```

#### 2. Create SubscriptionPause Table

Create a new table to store pause configurations:

```go
// SubscriptionPause stores all pause-related information
type SubscriptionPause struct {
    ID string `db:"id" json:"id"`
    
    SubscriptionID string `db:"subscription_id" json:"subscription_id"`
    
    // Status of this pause configuration
    Status string `db:"status" json:"status"` // active, completed, cancelled
    
    // PauseMode indicates how the pause was applied
    PauseMode string `db:"pause_mode" json:"pause_mode"` // immediate, period_end, scheduled
    
    // ResumeMode indicates how the resume will be applied
    ResumeMode string `db:"resume_mode" json:"resume_mode"` // immediate, scheduled, auto
    
    // When the pause was requested
    CreatedAt time.Time `db:"created_at" json:"created_at"`
    
    // When the pause actually started
    PauseStart time.Time `db:"pause_start" json:"pause_start"`
    
    // When the pause will end (null for indefinite)
    // Either PauseEnd or PauseDays can be specified, but not both
    PauseEnd *time.Time `db:"pause_end" json:"pause_end,omitempty"`
    
    // Duration of the pause in days
    // Either PauseEnd or PauseDays can be specified, but not both
    PauseDays *int `db:"pause_days" json:"pause_days,omitempty"`
    
    // When the pause was actually ended (if manually resumed)
    ResumedAt *time.Time `db:"resumed_at" json:"resumed_at,omitempty"`
    
    // Original billing period information (for restoration)
    OriginalPeriodStart time.Time `db:"original_period_start" json:"original_period_start"`
    OriginalPeriodEnd time.Time `db:"original_period_end" json:"original_period_end"`
    
    // Reason for pausing
    Reason string `db:"reason" json:"reason,omitempty"`
    
    // Additional metadata
    Metadata types.Metadata `db:"metadata" json:"metadata,omitempty"`
}
```

#### 3. Add PauseStatus Type

Add a new type to represent the pause status:

```go
// PauseStatus represents the pause state of a subscription
type PauseStatus string

const (
    // PauseStatusNone indicates the subscription is not paused
    PauseStatusNone PauseStatus = "none"
    
    // PauseStatusActive indicates the subscription is currently paused
    PauseStatusActive PauseStatus = "active"
    
    // PauseStatusScheduled indicates the subscription is scheduled to be paused
    PauseStatusScheduled PauseStatus = "scheduled"
)
```

### Subscription History Tracking

Each pause and resume action will be recorded in the subscription history:

```go
// Example history entry for pause
{
    "type": "subscription.paused",
    "subscription_id": "sub_123",
    "pause_id": "pause_456",
    "pause_mode": "immediate",
    "pause_end": "2023-12-31T00:00:00Z",
    "reason": "Customer traveling",
    "timestamp": "2023-10-15T14:30:00Z"
}

// Example history entry for resume
{
    "type": "subscription.resumed",
    "subscription_id": "sub_123",
    "pause_id": "pause_456",
    "resume_mode": "immediate",
    "timestamp": "2023-11-15T09:15:00Z"
}
```

### API Structure

#### Pause Subscription Request

```json
{
    "pause_mode": "immediate | period_end | scheduled",
    "pause_start": "2023-10-15T00:00:00Z", // Only required for scheduled pauses
    "pause_end": "2023-12-31T00:00:00Z", // Optional, null for indefinite pause
    "pause_days": 30, // Optional, alternative to pause_end
    "reason": "Customer traveling", // Optional
    "dry_run": false, // Optional, default false
    "metadata": { // Optional
        "requested_by": "customer",
        "note": "Customer will be traveling for 2 months"
    }
}
```

**Validation Rules:**
- `pause_mode` is required
- `pause_start` is required only for scheduled pauses
- Either `pause_end` or `pause_days` can be specified, but not both
- `pause_end` must be in the future
- `pause_days` must be a positive integer

#### Pause Subscription Response

```json
{
    "subscription": {
        // Standard subscription response
        "id": "sub_123",
        "status": "paused",
        "pause_status": "active",
        // ... other subscription fields
    },
    "pause": {
        "id": "pause_456",
        "subscription_id": "sub_123",
        "status": "active",
        "pause_mode": "immediate",
        "pause_start": "2023-10-15T14:30:00Z",
        "pause_end": "2023-12-31T00:00:00Z",
        "pause_days": 77,
        "original_period_start": "2023-10-01T00:00:00Z",
        "original_period_end": "2023-10-31T23:59:59Z",
        "reason": "Customer traveling",
        "created_at": "2023-10-15T14:30:00Z"
    },
    "billing_impact": {
        "current_period_adjustment": -50.00,
        "next_billing_date": "2023-12-31T00:00:00Z",
        "next_billing_amount": 100.00,
        "original_period_start": "2023-10-01T00:00:00Z",
        "original_period_end": "2023-10-31T23:59:59Z",
        "adjusted_period_start": "2023-12-31T00:00:00Z",
        "adjusted_period_end": "2024-01-30T23:59:59Z",
        "pause_duration_days": 77
    },
    "dry_run": false
}
```

#### Resume Subscription Request

```json
{
    "resume_mode": "immediate | scheduled",
    "resume_date": "2023-11-15T00:00:00Z", // Only required for scheduled resumes
    "dry_run": false, // Optional, default false
    "metadata": { // Optional
        "requested_by": "customer",
        "note": "Customer returned early"
    }
}
```

**Validation Rules:**
- `resume_mode` is required
- `resume_date` is required only for scheduled resumes
- `resume_date` must be in the future

#### Resume Subscription Response

```json
{
    "subscription": {
        // Standard subscription response
        "id": "sub_123",
        "status": "active",
        "pause_status": "none",
        // ... other subscription fields
    },
    "pause": {
        "id": "pause_456",
        "subscription_id": "sub_123",
        "status": "completed",
        "pause_mode": "immediate",
        "pause_start": "2023-10-15T14:30:00Z",
        "pause_end": "2023-12-31T00:00:00Z",
        "resumed_at": "2023-11-15T09:15:00Z",
        "original_period_start": "2023-10-01T00:00:00Z",
        "original_period_end": "2023-10-31T23:59:59Z",
        "reason": "Customer traveling",
        "created_at": "2023-10-15T14:30:00Z"
    },
    "billing_impact": {
        "next_billing_date": "2023-11-15T09:15:00Z",
        "next_billing_amount": 100.00,
        "original_period_start": "2023-10-01T00:00:00Z",
        "original_period_end": "2023-10-31T23:59:59Z",
        "adjusted_period_start": "2023-11-15T09:15:00Z",
        "adjusted_period_end": "2023-12-15T09:14:59Z",
        "pause_duration_days": 31
    },
    "dry_run": false
}
```

### Service Layer Changes

#### 1. Add New Methods to SubscriptionService Interface

```go
// Add to SubscriptionService interface
type SubscriptionService interface {
    // ... existing methods ...
    
    // PauseSubscription pauses a subscription
    PauseSubscription(ctx context.Context, id string, req dto.PauseSubscriptionRequest) (*dto.PauseSubscriptionResponse, error)
    
    // ResumeSubscription resumes a paused subscription
    ResumeSubscription(ctx context.Context, id string, req dto.ResumeSubscriptionRequest) (*dto.ResumeSubscriptionResponse, error)
    
    // GetPauseHistory gets the pause history for a subscription
    GetPauseHistory(ctx context.Context, id string) ([]*dto.SubscriptionPause, error)
}
```

#### 2. Implementation Considerations

##### Processing Pauses

1. **Immediate Pause**:
   - Update subscription status to `paused`
   - Create pause record with current timestamp
   - Skip subscription in billing period updates
   - Calculate and apply prorated credits for unused portion of current period (for advance billing)

2. **Period-End Pause**:
   - Mark subscription for pause at period end
   - Continue normal billing until period end
   - At period end, update status to `paused` instead of renewing

3. **Scheduled Pause**:
   - Create pause record with future start date
   - Continue normal billing until scheduled date
   - At scheduled date, update status to `paused`

##### Processing Resumes

1. **Immediate Resume**:
   - Update subscription status to `active`
   - Update pause record with resume timestamp
   - Adjust billing period dates by adding the pause duration
   - Calculate and apply prorated charges for the resumed period (if applicable)

2. **Scheduled Resume**:
   - Update pause record with scheduled resume date
   - At scheduled date, update status to `active`
   - Adjust billing period dates by adding the pause duration

3. **Auto Resume** (based on pause_end):
   - System automatically resumes the subscription at the specified end date
   - Update status to `active`
   - Adjust billing period dates by adding the pause duration

##### Integration with Existing Cron Jobs

The existing cron job that processes subscription billing periods will need to be updated to:
1. Skip processing for subscriptions with status `paused`
2. Process scheduled pauses and resumes
3. Handle auto-resumes based on pause_end dates

### Billing and Invoicing Impact

#### Immediate Pause (Advance Billing)

For subscriptions billed in advance:
1. Calculate the unused portion of the current period
2. Issue a credit for the unused portion
3. Adjust the next billing date to after the pause ends

**Example:**
- Monthly subscription: $100/month
- Billing period: Oct 1 - Oct 31
- Pause date: Oct 15
- Unused days: 16 (Oct 16 - Oct 31)
- Credit amount: $100 * (16/31) = $51.61
- Next billing date: After pause ends

#### Immediate Pause (Arrears Billing)

For subscriptions billed in arrears:
1. Calculate the used portion of the current period
2. Bill for the used portion at the end of the period
3. Do not bill during the pause period

**Example:**
- Monthly subscription: $100/month
- Billing period: Oct 1 - Oct 31
- Pause date: Oct 15
- Used days: 15 (Oct 1 - Oct 15)
- Bill amount: $100 * (15/31) = $48.39
- Next billing: None during pause

#### Period-End Pause

For period-end pauses, no proration is needed:
1. Complete the current billing period normally
2. Do not bill during the pause period

#### Resume Billing

When resuming a subscription:
1. Adjust the billing period dates by adding the pause duration
2. Resume normal billing based on the adjusted dates

**Example:**
- Original period: Oct 1 - Oct 31
- Pause: Oct 15 - Nov 15 (31 days)
- Resume: Nov 15
- Adjusted period: Nov 15 - Dec 15
- Next billing: Dec 15

### Billing Impact Details

To provide transparency to users about the financial impact of pausing or resuming a subscription, we'll include a `billing_impact` object in the response:

```go
// BillingImpactDetails provides detailed information about the financial impact
type BillingImpactDetails struct {
    // For immediate pauses with advance billing:
    // The amount that will be credited for the unused portion of the current period
    // Negative value indicates a credit to the customer
    CurrentPeriodAdjustment float64 `json:"current_period_adjustment,omitempty"`
    
    // The date when the next invoice will be generated
    // For paused subscriptions, this will be after the pause ends
    NextBillingDate *time.Time `json:"next_billing_date,omitempty"`
    
    // The amount that will be charged on the next billing date
    // This may be prorated if resuming mid-period
    NextBillingAmount float64 `json:"next_billing_amount,omitempty"`
    
    // The original billing cycle dates before pause
    OriginalPeriodStart *time.Time `json:"original_period_start,omitempty"`
    OriginalPeriodEnd *time.Time `json:"original_period_end,omitempty"`
    
    // The adjusted billing cycle dates after pause
    AdjustedPeriodStart *time.Time `json:"adjusted_period_start,omitempty"`
    AdjustedPeriodEnd *time.Time `json:"adjusted_period_end,omitempty"`
    
    // The total pause duration in days
    PauseDurationDays int `json:"pause_duration_days,omitempty"`
}
```

The calculation of these values will depend on:
1. The billing model (advance vs. arrears)
2. The pause mode (immediate vs. period-end)
3. The subscription's billing cycle
4. The pause duration

### Dry Run Mode

To allow clients to preview the effects of pausing or resuming a subscription without making actual changes, we'll support a "dry run" mode:

```json
{
    "pause_mode": "immediate",
    "pause_end": "2023-12-31T00:00:00Z",
    "dry_run": true
}
```

When `dry_run` is set to `true`:
1. No changes will be made to the subscription
2. The response will include the calculated billing impact
3. The response will not include the updated subscription or pause objects
4. The `dry_run` field in the response will be set to `true`

This allows clients to show users the financial impact of pausing before they commit to it.

### Edge Cases and Considerations

1. **Pausing During Trial**: 
   - Allow pausing during trial
   - Extend trial end date by pause duration when resumed

2. **Multiple Pauses**: 
   - Only one active pause allowed at a time
   - Track total pause count and duration for reporting

3. **Usage During Pause**:
   - Continue to record usage events during pause
   - Do not bill for usage during pause
   - Include usage in reports with a "paused" flag

4. **Subscription Changes During Pause**:
   - Do not allow plan changes while paused
   - Queue changes to apply after resume

5. **Cancellation During Pause**:
   - Allow cancellation while paused
   - Update status directly to `cancelled`

6. **Failed Payments Before Pause**:
   - Require outstanding invoices to be paid before pausing
   - Or, allow pausing but resume only after payment

### Tenant Configuration Options

Provide tenant-level configuration options:

1. **Allow Pause**: Enable/disable pause feature
2. **Maximum Pause Duration**: Set maximum allowed pause duration
3. **Minimum Time Between Pauses**: Require a minimum active period between pauses
4. **Proration Settings**: Configure how credits and charges are calculated
5. **Pause Limits**: Set maximum number of pauses allowed per subscription

### Implementation Phases

#### Phase 0: Minimal Viable Implementation
- Add database fields
- Implement basic immediate pause/resume
- Update subscription status handling in cron jobs
- Support dry run mode for previewing changes
- Add simple proration calculations

#### Phase 1: Core Functionality
- Implement period-end pauses
- Add scheduled pauses and resumes
- Implement auto-resume based on pause_end
- Add pause history API

#### Phase 2: Advanced Features
- Add tenant configuration options
- Implement usage handling during pauses
- Add reporting and analytics
- Support partial pauses (pause specific line items)

### Migration Strategy

1. **Database Migration**:
   - Add new fields to subscription table
   - Create new subscription_pauses table
   - Initialize existing subscriptions with `pause_status = none`

2. **API Versioning**:
   - Add new endpoints to existing API version
   - Document new functionality

3. **Rollout Strategy**:
   - Deploy database changes
   - Deploy code changes with feature flag
   - Enable for beta customers
   - Gradually roll out to all customers

### Testing Scenarios

1. **Pause Active Subscription**
   - Verify subscription status changes to `paused`
   - Verify pause record is created
   - Verify billing impact calculations

2. **Resume Paused Subscription**
   - Verify subscription status changes to `active`
   - Verify pause record is updated
   - Verify billing period is adjusted
   - Verify billing impact calculations

3. **Dry Run Testing**
   - Verify no changes are made to subscription
   - Verify billing impact calculations match actual pause

4. **Scheduled Pause/Resume**
   - Verify scheduled pauses activate at the correct time
   - Verify scheduled resumes activate at the correct time

5. **Auto-Resume**
   - Verify subscription automatically resumes at pause_end
   - Verify billing period is adjusted correctly

6. **Edge Cases**
   - Test pausing during trial
   - Test cancellation during pause
   - Test with various billing models and cycles

### Monitoring and Metrics

Track the following metrics:

1. **Pause Rate**: Percentage of subscriptions paused
2. **Pause Duration**: Average and distribution of pause durations
3. **Resume Rate**: Percentage of paused subscriptions that resume
4. **Churn After Pause**: Percentage of resumed subscriptions that cancel within X days
5. **Revenue Impact**: Total credits issued due to pauses

### Future Considerations

1. **Partial Pauses**: Allow pausing specific line items instead of the entire subscription
2. **Pause Tiers**: Different pause options with different costs (e.g., free pause with ads, paid pause without ads)
3. **Pause Suggestions**: Proactively suggest pauses based on usage patterns
4. **Pause Incentives**: Offer incentives to resume early
5. **Seasonal Pause Programs**: Pre-defined pause programs for seasonal businesses 