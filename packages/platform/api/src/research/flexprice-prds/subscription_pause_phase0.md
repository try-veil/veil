# Subscription Pause Feature - Phase 0 Implementation

This document outlines the minimal viable implementation (Phase 0) for the subscription pause feature that can be implemented today.

## Overview

The goal of Phase 0 is to implement the core functionality needed to pause and resume subscriptions with minimal changes to the existing codebase. This implementation will focus on:

1. Adding the necessary database fields
2. Implementing basic immediate pause/resume functionality
3. Updating the subscription status handling in existing cron jobs
4. Adding simple proration calculations
5. Supporting dry run mode for previewing changes

## Database Changes

### 1. Update Subscription Model

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

### 2. Create SubscriptionPause Table

Create a new table to store pause configurations:

```go
// SubscriptionPause stores all pause-related information
type SubscriptionPause struct {
    ID string `db:"id" json:"id"`
    
    SubscriptionID string `db:"subscription_id" json:"subscription_id"`
    
    // Status of this pause configuration
    Status string `db:"status" json:"status"` // active, completed, cancelled
    
    // PauseMode indicates how the pause was applied
    PauseMode string `db:"pause_mode" json:"pause_mode"` // immediate, period_end
    
    // When the pause was requested
    CreatedAt time.Time `db:"created_at" json:"created_at"`
    
    // When the pause actually started
    PauseStart time.Time `db:"pause_start" json:"pause_start"`
    
    // When the pause will end (null for indefinite)
    PauseEnd *time.Time `db:"pause_end" json:"pause_end,omitempty"`
    
    // Duration of the pause in days (if specified)
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
    
    types.BaseModel
}
```

### 3. Add PauseStatus Type

Add a new type to represent the pause status:

```go
// PauseStatus represents the pause state of a subscription
type PauseStatus string

const (
    // PauseStatusNone indicates the subscription is not paused
    PauseStatusNone PauseStatus = "none"
    
    // PauseStatusActive indicates the subscription is currently paused
    PauseStatusActive PauseStatus = "active"
)
```

## API Implementation

### 1. Add New DTO Types

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

// PauseSubscriptionRequest represents a request to pause a subscription
type PauseSubscriptionRequest struct {
    // When to pause the subscription (only immediate supported in Phase 0)
    PauseMode string `json:"pause_mode" validate:"required,eq=immediate"`
    
    // When to automatically resume (null for indefinite pause)
    // Either PauseEnd or PauseDays can be specified, but not both
    PauseEnd *time.Time `json:"pause_end,omitempty"`
    
    // Duration of the pause in days
    // Either PauseEnd or PauseDays can be specified, but not both
    PauseDays *int `json:"pause_days,omitempty"`
    
    // Optional reason for pausing
    Reason string `json:"reason,omitempty"`
    
    // Whether to perform a dry run (calculate impacts without making changes)
    DryRun bool `json:"dry_run,omitempty"`
    
    // Additional metadata
    Metadata map[string]string `json:"metadata,omitempty"`
}

// PauseSubscriptionResponse represents the response to a pause subscription request
type PauseSubscriptionResponse struct {
    // Only included if not a dry run
    Subscription *dto.SubscriptionResponse `json:"subscription,omitempty"`
    Pause *SubscriptionPause `json:"pause,omitempty"`
    
    // Billing impact details
    BillingImpact *BillingImpactDetails `json:"billing_impact"`
    
    // Whether this was a dry run
    DryRun bool `json:"dry_run"`
}

// ResumeSubscriptionRequest represents a request to resume a subscription
type ResumeSubscriptionRequest struct {
    // When to resume the subscription (only immediate supported in Phase 0)
    ResumeMode string `json:"resume_mode" validate:"required,eq=immediate"`
    
    // Whether to perform a dry run (calculate impacts without making changes)
    DryRun bool `json:"dry_run,omitempty"`
    
    // Additional metadata
    Metadata map[string]string `json:"metadata,omitempty"`
}

// ResumeSubscriptionResponse represents the response to a resume subscription request
type ResumeSubscriptionResponse struct {
    // Only included if not a dry run
    Subscription *dto.SubscriptionResponse `json:"subscription,omitempty"`
    Pause *SubscriptionPause `json:"pause,omitempty"`
    
    // Billing impact details
    BillingImpact *BillingImpactDetails `json:"billing_impact"`
    
    // Whether this was a dry run
    DryRun bool `json:"dry_run"`
}
```

### 2. Add New Repository Methods

```go
// Add to subscription.Repository interface
type Repository interface {
    // ... existing methods ...
    
    // CreatePause creates a new subscription pause
    CreatePause(ctx context.Context, pause *SubscriptionPause) error
    
    // GetPause gets a subscription pause by ID
    GetPause(ctx context.Context, id string) (*SubscriptionPause, error)
    
    // UpdatePause updates a subscription pause
    UpdatePause(ctx context.Context, pause *SubscriptionPause) error
    
    // ListPauses lists all pauses for a subscription
    ListPauses(ctx context.Context, subscriptionID string) ([]*SubscriptionPause, error)
}
```

### 3. Add New Service Methods

```go
// Add to SubscriptionService interface
type SubscriptionService interface {
    // ... existing methods ...
    
    // PauseSubscription pauses a subscription
    PauseSubscription(ctx context.Context, id string, req dto.PauseSubscriptionRequest) (*dto.PauseSubscriptionResponse, error)
    
    // ResumeSubscription resumes a paused subscription
    ResumeSubscription(ctx context.Context, id string, req dto.ResumeSubscriptionRequest) (*dto.ResumeSubscriptionResponse, error)
}

// Simple proration calculation helper
func calculateBillingImpact(ctx context.Context, subscription *subscription.Subscription, pauseStart time.Time, pauseEnd *time.Time, pauseDays *int) (*dto.BillingImpactDetails, error) {
    // Implementation details below
}
```

## Implementation Details

### 1. PauseSubscription Method

```go
func (s *subscriptionService) PauseSubscription(ctx context.Context, id string, req dto.PauseSubscriptionRequest) (*dto.PauseSubscriptionResponse, error) {
    // Validate request
    if req.PauseMode != "immediate" {
        return nil, fmt.Errorf("only immediate pause mode is supported in this version")
    }
    
    if req.PauseEnd != nil && req.PauseDays != nil {
        return nil, fmt.Errorf("cannot specify both PauseEnd and PauseDays")
    }
    
    // Get subscription
    subscription, lineItems, err := s.SubRepo.GetWithLineItems(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("failed to get subscription: %w", err)
    }
    
    // Validate subscription state
    if subscription.SubscriptionStatus != types.SubscriptionStatusActive {
        return nil, fmt.Errorf("cannot pause subscription with status %s", subscription.SubscriptionStatus)
    }
    
    if subscription.PauseStatus != types.PauseStatusNone {
        return nil, fmt.Errorf("subscription is already paused or scheduled to be paused")
    }
    
    // Create pause record
    now := time.Now().UTC()
    pauseID := types.GenerateUUIDWithPrefix("pause")
    
    // Calculate pause end date if PauseDays is provided
    var pauseEnd *time.Time
    if req.PauseDays != nil {
        end := now.AddDate(0, 0, *req.PauseDays)
        pauseEnd = &end
    } else {
        pauseEnd = req.PauseEnd
    }
    
    // Calculate billing impact
    billingImpact, err := calculateBillingImpact(ctx, subscription, now, pauseEnd, req.PauseDays)
    if err != nil {
        return nil, fmt.Errorf("failed to calculate billing impact: %w", err)
    }
    
    // If this is a dry run, return the calculated impact without making changes
    if req.DryRun {
        return &dto.PauseSubscriptionResponse{
            BillingImpact: billingImpact,
            DryRun:        true,
        }, nil
    }
    
    pause := &subscription.SubscriptionPause{
        ID:                  pauseID,
        SubscriptionID:      subscription.ID,
        Status:              "active",
        PauseMode:           req.PauseMode,
        CreatedAt:           now,
        PauseStart:          now,
        PauseEnd:            pauseEnd,
        PauseDays:           req.PauseDays,
        OriginalPeriodStart: subscription.CurrentPeriodStart,
        OriginalPeriodEnd:   subscription.CurrentPeriodEnd,
        Reason:              req.Reason,
        Metadata:            req.Metadata,
        BaseModel:           types.GetDefaultBaseModel(ctx),
    }
    
    // Update subscription
    subscription.PauseStatus = types.PauseStatusActive
    subscription.ActivePauseID = &pauseID
    subscription.SubscriptionStatus = types.SubscriptionStatusPaused
    
    // Use transaction to ensure atomicity
    err = s.DB.WithTx(ctx, func(ctx context.Context) error {
        // Create pause record
        if err := s.SubRepo.CreatePause(ctx, pause); err != nil {
            return fmt.Errorf("failed to create pause record: %w", err)
        }
        
        // Update subscription
        if err := s.SubRepo.Update(ctx, subscription); err != nil {
            return fmt.Errorf("failed to update subscription: %w", err)
        }
        
        return nil
    })
    
    if err != nil {
        return nil, err
    }
    
    // Build response
    response := &dto.PauseSubscriptionResponse{
        Subscription: &dto.SubscriptionResponse{
            Subscription: subscription,
            LineItems:    lineItems,
        },
        Pause:         pause,
        BillingImpact: billingImpact,
        DryRun:        false,
    }
    
    return response, nil
}
```

### 2. ResumeSubscription Method

```go
func (s *subscriptionService) ResumeSubscription(ctx context.Context, id string, req dto.ResumeSubscriptionRequest) (*dto.ResumeSubscriptionResponse, error) {
    // Validate request
    if req.ResumeMode != "immediate" {
        return nil, fmt.Errorf("only immediate resume mode is supported in this version")
    }
    
    // Get subscription
    subscription, lineItems, err := s.SubRepo.GetWithLineItems(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("failed to get subscription: %w", err)
    }
    
    // Validate subscription state
    if subscription.SubscriptionStatus != types.SubscriptionStatusPaused {
        return nil, fmt.Errorf("cannot resume subscription with status %s", subscription.SubscriptionStatus)
    }
    
    if subscription.PauseStatus != types.PauseStatusActive || subscription.ActivePauseID == nil {
        return nil, fmt.Errorf("subscription is not paused")
    }
    
    // Get active pause
    pause, err := s.SubRepo.GetPause(ctx, *subscription.ActivePauseID)
    if err != nil {
        return nil, fmt.Errorf("failed to get pause record: %w", err)
    }
    
    // Calculate pause duration
    now := time.Now().UTC()
    pauseDuration := now.Sub(pause.PauseStart)
    pauseDurationDays := int(pauseDuration.Hours() / 24)
    
    // Calculate billing impact for resume
    billingImpact := &dto.BillingImpactDetails{
        OriginalPeriodStart: &pause.OriginalPeriodStart,
        OriginalPeriodEnd:   &pause.OriginalPeriodEnd,
        AdjustedPeriodStart: &subscription.CurrentPeriodStart,
        AdjustedPeriodEnd:   &subscription.CurrentPeriodEnd,
        PauseDurationDays:   pauseDurationDays,
    }
    
    // Calculate next billing date
    nextBillingDate := subscription.CurrentPeriodEnd
    billingImpact.NextBillingDate = &nextBillingDate
    
    // If this is a dry run, return the calculated impact without making changes
    if req.DryRun {
        return &dto.ResumeSubscriptionResponse{
            BillingImpact: billingImpact,
            DryRun:        true,
        }, nil
    }
    
    // Update pause record
    pause.Status = "completed"
    pause.ResumedAt = &now
    
    // Update subscription
    subscription.PauseStatus = types.PauseStatusNone
    subscription.ActivePauseID = nil
    subscription.SubscriptionStatus = types.SubscriptionStatusActive
    
    // Adjust billing period by pause duration
    subscription.CurrentPeriodStart = subscription.CurrentPeriodStart.Add(pauseDuration)
    subscription.CurrentPeriodEnd = subscription.CurrentPeriodEnd.Add(pauseDuration)
    
    // Update billing impact with final adjusted dates
    billingImpact.AdjustedPeriodStart = &subscription.CurrentPeriodStart
    billingImpact.AdjustedPeriodEnd = &subscription.CurrentPeriodEnd
    
    // Use transaction to ensure atomicity
    err = s.DB.WithTx(ctx, func(ctx context.Context) error {
        // Update pause record
        if err := s.SubRepo.UpdatePause(ctx, pause); err != nil {
            return fmt.Errorf("failed to update pause record: %w", err)
        }
        
        // Update subscription
        if err := s.SubRepo.Update(ctx, subscription); err != nil {
            return fmt.Errorf("failed to update subscription: %w", err)
        }
        
        return nil
    })
    
    if err != nil {
        return nil, err
    }
    
    // Build response
    response := &dto.ResumeSubscriptionResponse{
        Subscription: &dto.SubscriptionResponse{
            Subscription: subscription,
            LineItems:    lineItems,
        },
        Pause:         pause,
        BillingImpact: billingImpact,
        DryRun:        false,
    }
    
    return response, nil
}
```

### 3. Billing Impact Calculation

```go
// calculateBillingImpact calculates the financial impact of pausing a subscription
func calculateBillingImpact(ctx context.Context, sub *subscription.Subscription, pauseStart time.Time, pauseEnd *time.Time, pauseDays *int) (*dto.BillingImpactDetails, error) {
    impact := &dto.BillingImpactDetails{
        OriginalPeriodStart: &sub.CurrentPeriodStart,
        OriginalPeriodEnd:   &sub.CurrentPeriodEnd,
    }
    
    // Calculate total period duration
    periodDuration := sub.CurrentPeriodEnd.Sub(sub.CurrentPeriodStart)
    totalDays := int(periodDuration.Hours() / 24)
    
    // Calculate remaining days in current period
    remainingDuration := sub.CurrentPeriodEnd.Sub(pauseStart)
    remainingDays := int(remainingDuration.Hours() / 24)
    
    // Calculate used days in current period
    usedDays := totalDays - remainingDays
    
    // Calculate pause duration
    var pauseDurationDays int
    if pauseEnd != nil {
        pauseDuration := pauseEnd.Sub(pauseStart)
        pauseDurationDays = int(pauseDuration.Hours() / 24)
    } else if pauseDays != nil {
        pauseDurationDays = *pauseDays
    } else {
        // Indefinite pause, use a placeholder value
        pauseDurationDays = 30 // Arbitrary default for indefinite pauses
    }
    
    impact.PauseDurationDays = pauseDurationDays
    
    // Calculate next billing date (after pause)
    var nextBillingDate time.Time
    if pauseEnd != nil {
        nextBillingDate = *pauseEnd
    } else if pauseDays != nil {
        nextBillingDate = pauseStart.AddDate(0, 0, *pauseDays)
    } else {
        // Indefinite pause, no next billing date
        nextBillingDate = time.Time{}
    }
    
    if !nextBillingDate.IsZero() {
        impact.NextBillingDate = &nextBillingDate
    }
    
    // Calculate adjusted period dates
    adjustedStart := sub.CurrentPeriodStart.AddDate(0, 0, pauseDurationDays)
    adjustedEnd := sub.CurrentPeriodEnd.AddDate(0, 0, pauseDurationDays)
    impact.AdjustedPeriodStart = &adjustedStart
    impact.AdjustedPeriodEnd = &adjustedEnd
    
    // For simplicity in Phase 0, we'll just calculate a basic adjustment
    // based on the remaining days in the period
    
    // TODO: In a future phase, we would calculate this based on the actual
    // subscription amounts, taking into account fixed vs usage-based pricing
    
    // For now, we'll use a placeholder value
    // Assuming advance billing, credit for unused portion
    if remainingDays > 0 && totalDays > 0 {
        // This is a simplified calculation - in reality, we would need to
        // calculate the actual subscription amount
        placeholderMonthlyAmount := 100.0 // Placeholder value
        adjustment := -(float64(remainingDays) / float64(totalDays)) * placeholderMonthlyAmount
        impact.CurrentPeriodAdjustment = adjustment
    }
    
    return impact, nil
}
```

### 4. Update Cron Job

Modify the `UpdateBillingPeriods` method in `subscriptionService` to handle paused subscriptions:

```go
func (s *subscriptionService) UpdateBillingPeriods(ctx context.Context) (*dto.SubscriptionUpdatePeriodResponse, error) {
    // ... existing code ...
    
    // Process each subscription in the batch
    for _, sub := range subs {
        // Skip paused subscriptions
        if sub.SubscriptionStatus == types.SubscriptionStatusPaused {
            s.Logger.Infow("skipping paused subscription",
                "subscription_id", sub.ID)
            continue
        }
        
        // ... existing processing code ...
    }
    
    // ... rest of existing code ...
}
```

## API Endpoints

Add new API endpoints to handle pause and resume operations:

```go
// Add to subscription handler
func (h *SubscriptionHandler) RegisterRoutes(router chi.Router) {
    // ... existing routes ...
    
    router.Post("/{id}/pause", h.PauseSubscription)
    router.Post("/{id}/resume", h.ResumeSubscription)
}

// PauseSubscription handles the pause subscription request
func (h *SubscriptionHandler) PauseSubscription(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    id := chi.URLParam(r, "id")
    
    var req dto.PauseSubscriptionRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        h.Error(w, r, err, http.StatusBadRequest)
        return
    }
    
    response, err := h.SubscriptionService.PauseSubscription(ctx, id, req)
    if err != nil {
        h.Error(w, r, err, http.StatusInternalServerError)
        return
    }
    
    h.JSON(w, r, response, http.StatusOK)
}

// ResumeSubscription handles the resume subscription request
func (h *SubscriptionHandler) ResumeSubscription(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    id := chi.URLParam(r, "id")
    
    var req dto.ResumeSubscriptionRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        h.Error(w, r, err, http.StatusBadRequest)
        return
    }
    
    response, err := h.SubscriptionService.ResumeSubscription(ctx, id, req)
    if err != nil {
        h.Error(w, r, err, http.StatusInternalServerError)
        return
    }
    
    h.JSON(w, r, response, http.StatusOK)
}
```

## Testing

### Manual Testing Scenarios

1. **Pause Active Subscription**
   - Create a subscription
   - Pause the subscription
   - Verify subscription status is `paused`
   - Verify pause record is created
   - Verify billing impact calculations

2. **Resume Paused Subscription**
   - Resume a paused subscription
   - Verify subscription status is `active`
   - Verify pause record is updated
   - Verify billing period is adjusted
   - Verify billing impact calculations

3. **Dry Run Testing**
   - Perform dry run pause request
   - Verify no changes are made to subscription
   - Verify billing impact calculations match actual pause

4. **Verify Cron Job Behavior**
   - Pause a subscription
   - Run the billing period update cron job
   - Verify paused subscription is skipped

5. **PauseDays Testing**
   - Pause a subscription with PauseDays specified
   - Verify PauseEnd is calculated correctly
   - Resume the subscription
   - Verify billing period adjustments

## Limitations of Phase 0

1. Only immediate pause/resume is supported (no scheduled or period-end pauses)
2. Basic proration calculations (placeholder values)
3. No tenant configuration options
4. Limited validation rules
5. No reporting or analytics

These limitations will be addressed in subsequent phases. 