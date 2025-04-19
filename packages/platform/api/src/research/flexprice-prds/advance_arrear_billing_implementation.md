# Advance and Arrear Billing Implementation Plan

## 1. Problem Statement

The current subscription billing system needs to handle multiple scenarios for invoice creation:

1. **Fixed Charge Advanced Billing**: Create an invoice with the full subscription line item amount as soon as the current period starts (i.e., when subscription is created or a period changes).
2. **Fixed Charge Arrear Billing**: Charge when processing subscription period updates (i.e., when the current period ends).
3. **Usage Charge Arrear Billing**: Calculate usage for the entire period when processing subscription period updates.
4. **Usage Charge Advanced Billing**: Currently not supported and will be disabled.

Additionally, the system needs to support preview invoice generation to give customers a sneak peek of their next invoice.

## 2. Current Architecture Analysis

### 2.1 Key Components

1. **BillingService**
   - Calculates fixed and usage charges
   - Prepares invoice requests
   - Determines which line items should be invoiced based on invoice cadence

2. **SubscriptionService**
   - Handles subscription period transitions via `UpdateBillingPeriods`
   - Creates invoices for completed periods

3. **InvoiceService**
   - Creates and finalizes invoices
   - Handles payment attempts

### 2.2 Current Billing Flow

1. The `UpdateBillingPeriods` method in `SubscriptionService` is triggered periodically
2. For each subscription with a period end in the past:
   - An invoice is created for the completed period
   - The subscription is moved to the next period
3. The `PrepareSubscriptionInvoiceRequest` method in `BillingService` determines what to include in the invoice
4. The `GetLineItemsToBeInvoiced` method checks which line items should be invoiced based on invoice cadence

### 2.3 Current Limitations

1. The advance billing logic is incomplete - it only checks if the current time is after or equal to the period start
2. There's no clear separation between preview and actual invoice generation
3. The system doesn't handle different charge types (fixed vs. usage) differently based on invoice cadence
4. The billing logic is spread across multiple services

## 3. Revised Implementation Plan

### 3.1 Key Trigger Points

We need to handle three key trigger points:

1. **Subscription Creation** (`SubscriptionService.CreateSubscription`)
   - Create invoice with advance charges for the current period
   - Fail subscription creation if invoice creation fails

2. **Period Update** (`SubscriptionService.processSubscriptionPeriod`)
   - Create invoice with arrear charges for the current period
   - Create invoice with advance charges for the next period
   - Update the subscription period only after successful invoice creation

3. **Preview Invoice** (`InvoiceService.GetPreviewInvoice`)
   - Show arrear charges for the current period
   - Show advance charges for the next period

### 3.2 Core Billing Logic Components

To avoid duplication and ensure consistency, we'll create these core components:

#### 3.2.1 Line Item Classification

```go
// LineItemClassification represents the classification of line items based on cadence and type
type LineItemClassification struct {
    CurrentPeriodAdvance []*subscription.SubscriptionLineItem
    CurrentPeriodArrear  []*subscription.SubscriptionLineItem
    NextPeriodAdvance    []*subscription.SubscriptionLineItem
}

// ClassifyLineItems classifies line items based on cadence and type
func (s *billingService) ClassifyLineItems(
    sub *subscription.Subscription,
    currentPeriodStart, 
    currentPeriodEnd time.Time,
    nextPeriodStart,
    nextPeriodEnd time.Time,
) *LineItemClassification {
    result := &LineItemClassification{
        CurrentPeriodAdvance: make([]*subscription.SubscriptionLineItem, 0),
        CurrentPeriodArrear:  make([]*subscription.SubscriptionLineItem, 0),
        NextPeriodAdvance:    make([]*subscription.SubscriptionLineItem, 0),
    }
    
    for _, item := range sub.LineItems {
        // Current period advance charges (fixed only)
        if item.InvoiceCadence == types.InvoiceCadenceAdvance && 
           item.PriceType == types.PRICE_TYPE_FIXED {
            result.CurrentPeriodAdvance = append(result.CurrentPeriodAdvance, item)
            
            // Also add to next period advance for preview purposes
            result.NextPeriodAdvance = append(result.NextPeriodAdvance, item)
        }
        
        // Current period arrear charges (fixed and usage)
        if item.InvoiceCadence == types.InvoiceCadenceArrear {
            result.CurrentPeriodArrear = append(result.CurrentPeriodArrear, item)
        }
    }
    
    return result
}
```

#### 3.2.2 Invoice Existence Check

```go
// CheckInvoiceExists checks if an invoice exists for the given period and line items
func (s *billingService) CheckInvoiceExists(
    ctx context.Context,
    sub *subscription.Subscription,
    periodStart,
    periodEnd time.Time,
    lineItems []*subscription.SubscriptionLineItem,
) (bool, error) {
    // Get existing invoices for this period
    invoiceFilter := types.NewNoLimitInvoiceFilter()
    invoiceFilter.SubscriptionID = sub.ID
    invoiceFilter.InvoiceType = types.InvoiceTypeSubscription
    invoiceFilter.InvoiceStatus = []types.InvoiceStatus{types.InvoiceStatusDraft, types.InvoiceStatusFinalized}
    invoiceFilter.TimeRangeFilter = &types.TimeRangeFilter{
        StartTime: lo.ToPtr(periodStart),
        EndTime:   lo.ToPtr(periodEnd),
    }
    
    invoices, err := s.InvoiceRepo.List(ctx, invoiceFilter)
    if err != nil {
        return false, fmt.Errorf("failed to list invoices: %w", err)
    }
    
    // If no invoices exist, return false
    if len(invoices) == 0 {
        return false, nil
    }
    
    // Check if all line items are already invoiced
    for _, lineItem := range lineItems {
        lineItemInvoiced := false
        
        for _, invoice := range invoices {
            if s.checkIfChargeInvoiced(invoice, lineItem, periodStart, periodEnd, time.Now()) {
                lineItemInvoiced = true
                break
            }
        }
        
        // If any line item is not invoiced, return false
        if !lineItemInvoiced {
            return false, nil
        }
    }
    
    // All line items are invoiced
    return true, nil
}
```

#### 3.2.3 Charge Calculation

```go
// CalculateCharges calculates charges for the given line items and period
func (s *billingService) CalculateCharges(
    ctx context.Context,
    sub *subscription.Subscription,
    lineItems []*subscription.SubscriptionLineItem,
    periodStart,
    periodEnd time.Time,
    includeUsage bool,
) (*BillingCalculationResult, error) {
    // Create a filtered subscription with only the specified line items
    filteredSub := *sub
    filteredSub.LineItems = lineItems
    
    // Get usage data if needed
    var usage *dto.GetUsageBySubscriptionResponse
    var err error
    
    if includeUsage {
        subscriptionService := NewSubscriptionService(s.ServiceParams)
        usage, err = subscriptionService.GetUsageBySubscription(ctx, &dto.GetUsageBySubscriptionRequest{
            SubscriptionID: sub.ID,
            StartTime:      periodStart,
            EndTime:        periodEnd,
        })
        if err != nil {
            return nil, err
        }
    }
    
    // Calculate charges
    return s.CalculateAllCharges(ctx, &filteredSub, usage, periodStart, periodEnd)
}
```

#### 3.2.4 Invoice Creation

```go
// CreateInvoiceForCharges creates an invoice for the given charges
func (s *billingService) CreateInvoiceForCharges(
    ctx context.Context,
    sub *subscription.Subscription,
    result *BillingCalculationResult,
    periodStart,
    periodEnd time.Time,
    description string,
    metadata types.Metadata,
) (*dto.CreateInvoiceRequest, error) {
    // Prepare invoice due date
    invoiceDueDate := periodEnd.Add(24 * time.Hour * types.InvoiceDefaultDueDays)
    
    // Create invoice request
    req := &dto.CreateInvoiceRequest{
        CustomerID:     sub.CustomerID,
        SubscriptionID: lo.ToPtr(sub.ID),
        InvoiceType:    types.InvoiceTypeSubscription,
        InvoiceStatus:  lo.ToPtr(types.InvoiceStatusDraft),
        PaymentStatus:  lo.ToPtr(types.PaymentStatusPending),
        Currency:       sub.Currency,
        AmountDue:      result.TotalAmount,
        Description:    description,
        DueDate:        lo.ToPtr(invoiceDueDate),
        BillingPeriod:  lo.ToPtr(string(sub.BillingPeriod)),
        PeriodStart:    &periodStart,
        PeriodEnd:      &periodEnd,
        BillingReason:  types.InvoiceBillingReasonSubscriptionCycle,
        EnvironmentID:  sub.EnvironmentID,
        Metadata:       metadata,
        LineItems:      append(result.FixedCharges, result.UsageCharges...),
    }
    
    return req, nil
}
```

### 3.3 Enhanced BillingService

#### 3.3.1 Update `PrepareSubscriptionInvoiceRequest` Method

```go
func (s *billingService) PrepareSubscriptionInvoiceRequest(
    ctx context.Context,
    sub *subscription.Subscription,
    periodStart,
    periodEnd time.Time,
    isPreview bool,
) (*dto.CreateInvoiceRequest, error) {
    s.Logger.Infow("preparing subscription invoice request",
        "subscription_id", sub.ID,
        "period_start", periodStart,
        "period_end", periodEnd,
        "is_preview", isPreview)
    
    // Calculate next period for advance charges
    nextPeriodStart := periodEnd
    nextPeriodEnd, err := types.NextBillingDate(
        nextPeriodStart, 
        sub.BillingAnchor, 
        sub.BillingPeriodCount, 
        sub.BillingPeriod,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to calculate next billing date: %w", err)
    }
    
    // Classify line items
    classification := s.ClassifyLineItems(sub, periodStart, periodEnd, nextPeriodStart, nextPeriodEnd)
    
    if isPreview {
        // For preview, we need both current period arrear and next period advance
        
        // Calculate current period arrear charges
        arrearResult, err := s.CalculateCharges(
            ctx, 
            sub, 
            classification.CurrentPeriodArrear, 
            periodStart, 
            periodEnd, 
            true, // Include usage
        )
        if err != nil {
            return nil, err
        }
        
        // Calculate next period advance charges
        advanceResult, err := s.CalculateCharges(
            ctx, 
            sub, 
            classification.NextPeriodAdvance, 
            nextPeriodStart, 
            nextPeriodEnd, 
            false, // No usage for advance
        )
        if err != nil {
            return nil, err
        }
        
        // Combine results
        combinedResult := &BillingCalculationResult{
            FixedCharges: append(arrearResult.FixedCharges, advanceResult.FixedCharges...),
            UsageCharges: arrearResult.UsageCharges, // Only arrear has usage
            TotalAmount:  arrearResult.TotalAmount.Add(advanceResult.TotalAmount),
            Currency:     sub.Currency,
        }
        
        // Create invoice request
        return s.CreateInvoiceForCharges(
            ctx,
            sub,
            combinedResult,
            periodStart,
            periodEnd,
            fmt.Sprintf("Preview invoice for subscription %s", sub.ID),
            types.Metadata{
                "is_preview": "true",
                "includes_next_period_charges": "true",
            },
        )
    } else {
        // For actual invoices, determine which charges to include based on the current time
        now := time.Now()
        var chargesToInclude []*subscription.SubscriptionLineItem
        var includeUsage bool
        
        if now.After(periodEnd) || now.Equal(periodEnd) {
            // Period end - include arrear charges
            chargesToInclude = classification.CurrentPeriodArrear
            includeUsage = true
        } else {
            // Period start - include advance charges
            chargesToInclude = classification.CurrentPeriodAdvance
            includeUsage = false
        }
        
        // Check if these charges are already invoiced
        exists, err := s.CheckInvoiceExists(ctx, sub, periodStart, periodEnd, chargesToInclude)
        if err != nil {
            return nil, err
        }
        
        if exists {
            return nil, fmt.Errorf("charges already invoiced for this period")
        }
        
        // Calculate charges
        result, err := s.CalculateCharges(
            ctx, 
            sub, 
            chargesToInclude, 
            periodStart, 
            periodEnd, 
            includeUsage,
        )
        if err != nil {
            return nil, err
        }
        
        // Create invoice request
        return s.CreateInvoiceForCharges(
            ctx,
            sub,
            result,
            periodStart,
            periodEnd,
            fmt.Sprintf("Invoice for subscription %s", sub.ID),
            types.Metadata{},
        )
    }
}
```

### 3.4 Enhanced SubscriptionService

#### 3.4.1 Update `CreateSubscription` Method

```go
func (s *subscriptionService) CreateSubscription(ctx context.Context, req dto.CreateSubscriptionRequest) (*dto.SubscriptionResponse, error) {
    // [Existing subscription creation code]
    
    // After subscription is created, create invoice for advance charges
    invoiceService := NewInvoiceService(s.ServiceParams)
    
    // Create invoice for advance charges
    inv, err := invoiceService.CreateSubscriptionInvoice(ctx, &dto.CreateSubscriptionInvoiceRequest{
        SubscriptionID: subscription.ID,
        PeriodStart:    subscription.CurrentPeriodStart,
        PeriodEnd:      subscription.CurrentPeriodEnd,
        IsPreview:      false,
    })
    if err != nil {
        // Rollback subscription creation
        if deleteErr := s.SubRepo.Delete(ctx, subscription.ID); deleteErr != nil {
            s.Logger.Errorw("failed to delete subscription after invoice creation failure",
                "subscription_id", subscription.ID,
                "error", deleteErr)
        }
        return nil, fmt.Errorf("failed to create invoice for advance charges: %w", err)
    }
    
    // Finalize invoice and attempt payment
    if err := invoiceService.FinalizeInvoice(ctx, inv.ID); err != nil {
        return nil, fmt.Errorf("failed to finalize invoice: %w", err)
    }
    
    if err := invoiceService.AttemptPayment(ctx, inv.ID); err != nil {
        // Log error but continue
        s.Logger.Errorw("failed to attempt payment for advance invoice",
            "invoice_id", inv.ID,
            "error", err)
    }
    
    // Return subscription response
    return response, nil
}
```

#### 3.4.2 Update `processSubscriptionPeriod` Method

```go
func (s *subscriptionService) processSubscriptionPeriod(ctx context.Context, sub *subscription.Subscription, now time.Time) error {
    // [Existing pause handling code]
    
    // Initialize services
    invoiceService := NewInvoiceService(s.ServiceParams)
    
    currentStart := sub.CurrentPeriodStart
    currentEnd := sub.CurrentPeriodEnd
    
    // Start with current period
    var periods []struct {
        start time.Time
        end   time.Time
    }
    periods = append(periods, struct {
        start time.Time
        end   time.Time
    }{
        start: currentStart,
        end:   currentEnd,
    })
    
    for currentEnd.Before(now) {
        nextStart := currentEnd
        nextEnd, err := types.NextBillingDate(nextStart, sub.BillingAnchor, sub.BillingPeriodCount, sub.BillingPeriod)
        if err != nil {
            s.Logger.Errorw("failed to calculate next billing date",
                "subscription_id", sub.ID,
                "current_end", currentEnd,
                "process_up_to", now,
                "error", err)
            return err
        }
        
        periods = append(periods, struct {
            start time.Time
            end   time.Time
        }{
            start: nextStart,
            end:   nextEnd,
        })
        
        currentEnd = nextEnd
    }
    
    if len(periods) == 1 {
        // No transitions needed
        s.Logger.Debugw("no transitions needed for subscription",
            "subscription_id", sub.ID,
            "current_period_start", sub.CurrentPeriodStart,
            "current_period_end", sub.CurrentPeriodEnd,
            "process_up_to", now)
        return nil
    }
    
    // Use db's WithTx for atomic operations
    err := s.DB.WithTx(ctx, func(ctx context.Context) error {
        // Process all periods except the last one (which becomes the new current period)
        for i := 0; i < len(periods)-1; i++ {
            period := periods[i]
            
            // Create and finalize invoice for this period (arrear billing)
            inv, err := invoiceService.CreateSubscriptionInvoice(ctx, &dto.CreateSubscriptionInvoiceRequest{
                SubscriptionID: sub.ID,
                PeriodStart:    period.start,
                PeriodEnd:      period.end,
                IsPreview:      false,
            })
            if err != nil {
                // If error is "charges already invoiced", continue
                if strings.Contains(err.Error(), "charges already invoiced") {
                    s.Logger.Infow("charges already invoiced for this period",
                        "subscription_id", sub.ID,
                        "period_start", period.start,
                        "period_end", period.end)
                } else {
                    return err
                }
            } else {
                // Finalize and attempt payment only if invoice was created
                if err := invoiceService.FinalizeInvoice(ctx, inv.ID); err != nil {
                    return err
                }
                
                if err := invoiceService.AttemptPayment(ctx, inv.ID); err != nil {
                    // return only if it's a database or system error else log and continue
                    if ierr.IsDatabase(err) || ierr.IsSystem(err) {
                        return err
                    }
                    s.Logger.Errorw("failed to attempt payment for invoice",
                        "invoice_id", inv.ID,
                        "error", err)
                }
                
                s.Logger.Infow("created invoice for period",
                    "subscription_id", sub.ID,
                    "invoice_id", inv.ID,
                    "period_start", period.start,
                    "period_end", period.end,
                    "period_index", i)
            }
            
            // Check for cancellation at this period end
            if sub.CancelAtPeriodEnd && sub.CancelAt != nil && !sub.CancelAt.After(period.end) {
                sub.SubscriptionStatus = types.SubscriptionStatusCancelled
                sub.CancelledAt = sub.CancelAt
                break
            }
        }
        
        // Update to the new current period (last period)
        newPeriod := periods[len(periods)-1]
        sub.CurrentPeriodStart = newPeriod.start
        sub.CurrentPeriodEnd = newPeriod.end
        
        // Final cancellation check
        if sub.CancelAtPeriodEnd && sub.CancelAt != nil && !sub.CancelAt.After(newPeriod.end) {
            sub.SubscriptionStatus = types.SubscriptionStatusCancelled
            sub.CancelledAt = sub.CancelAt
        }
        
        // Update the subscription
        if err := s.SubRepo.Update(ctx, sub); err != nil {
            return err
        }
        
        // Create invoice for advance billing items in the new period
        inv, err := invoiceService.CreateSubscriptionInvoice(ctx, &dto.CreateSubscriptionInvoiceRequest{
            SubscriptionID: sub.ID,
            PeriodStart:    newPeriod.start,
            PeriodEnd:      newPeriod.end,
            IsPreview:      false,
        })
        if err != nil {
            // If error is "charges already invoiced" or "no line items to be invoiced", continue
            if strings.Contains(err.Error(), "charges already invoiced") || 
               strings.Contains(err.Error(), "no line items to be invoiced") {
                s.Logger.Infow("no new charges to invoice for the new period",
                    "subscription_id", sub.ID,
                    "period_start", newPeriod.start,
                    "period_end", newPeriod.end)
            } else {
                return err
            }
        } else {
            // Finalize and attempt payment only if invoice was created
            if err := invoiceService.FinalizeInvoice(ctx, inv.ID); err != nil {
                return err
            }
            
            if err := invoiceService.AttemptPayment(ctx, inv.ID); err != nil {
                // Log error but continue
                s.Logger.Errorw("failed to attempt payment for advance invoice",
                    "invoice_id", inv.ID,
                    "error", err)
            }
            
            s.Logger.Infow("created advance billing invoice for new period",
                "subscription_id", sub.ID,
                "invoice_id", inv.ID,
                "period_start", newPeriod.start,
                "period_end", newPeriod.end)
        }
        
        s.Logger.Infow("completed subscription period processing",
            "subscription_id", sub.ID,
            "original_period_start", periods[0].start,
            "original_period_end", periods[0].end,
            "new_period_start", sub.CurrentPeriodStart,
            "new_period_end", sub.CurrentPeriodEnd,
            "process_up_to", now,
            "periods_processed", len(periods)-1)
        
        return nil
    })
    
    if err != nil {
        s.Logger.Errorw("failed to process subscription period",
            "subscription_id", sub.ID,
            "error", err)
        return err
    }
    
    return nil
}
```

### 3.5 Enhanced InvoiceService

#### 3.5.1 Update `GetPreviewInvoice` Method

```go
func (s *invoiceService) GetPreviewInvoice(ctx context.Context, req dto.GetPreviewInvoiceRequest) (*dto.InvoiceResponse, error) {
    sub, _, err := s.SubRepo.GetWithLineItems(ctx, req.SubscriptionID)
    if err != nil {
        return nil, err
    }
    
    if req.PeriodStart == nil {
        req.PeriodStart = &sub.CurrentPeriodStart
    }
    
    if req.PeriodEnd == nil {
        req.PeriodEnd = &sub.CurrentPeriodEnd
    }
    
    // Prepare invoice request using billing service
    billingService := NewBillingService(s.ServiceParams)
    invReq, err := billingService.PrepareSubscriptionInvoiceRequest(
        ctx, sub, *req.PeriodStart, *req.PeriodEnd, true)
    if err != nil {
        return nil, err
    }
    
    // Create a draft invoice object for preview
    inv, err := invReq.ToInvoice(ctx)
    if err != nil {
        return nil, err
    }
    
    // Create preview response
    return dto.InvoiceResponseFromInvoice(inv), nil
}
```

## 4. Implementation Steps

### 4.1 Phase 1: Core Components (Day 1-2)

1. Implement `LineItemClassification` and `ClassifyLineItems`
2. Implement `CheckInvoiceExists`
3. Implement `CalculateCharges`
4. Implement `CreateInvoiceForCharges`

### 4.2 Phase 2: BillingService Enhancement (Day 3-4)

1. Update `PrepareSubscriptionInvoiceRequest` to use the core components
2. Update `checkIfChargeMustBeInvoicedAsPerInvoiceCadence` to handle different charge types

### 4.3 Phase 3: SubscriptionService Enhancement (Day 5-6)

1. Update `CreateSubscription` to create invoice for advance charges
2. Update `processSubscriptionPeriod` to handle period transitions and create appropriate invoices

### 4.4 Phase 4: InvoiceService Enhancement (Day 7-8)

1. Update `GetPreviewInvoice` to show both current period arrear charges and next period advance charges

### 4.5 Phase 5: Manual Testing (Day 9-10)

1. Test subscription creation with advance charges
2. Test period transitions with arrear and advance charges
3. Test preview invoice generation

## 5. Benefits of This Approach

1. **Modularity**: Core components can be reused across different parts of the system
2. **Consistency**: The same logic is used for all billing scenarios
3. **Maintainability**: Changes to billing logic only need to be made in one place
4. **Testability**: Core components can be tested independently
5. **Clarity**: Each component has a clear responsibility

## 6. Considerations and Edge Cases

### 6.1 Invoice Deduplication

The `CheckInvoiceExists` method ensures that we don't create duplicate invoices for the same charges. This is important for:

1. Subscription creation - ensure we don't create duplicate advance invoices
2. Period transitions - ensure we don't create duplicate arrear invoices
3. Preview invoices - no actual invoices are created

### 6.2 Error Handling

1. **Subscription Creation**: If invoice creation fails, roll back the subscription creation
2. **Period Transitions**: If invoice creation fails, log the error but continue with the period transition
3. **Preview Invoices**: If any calculation fails, return an error to the client

### 6.3 Transaction Management

All period transitions are performed within a transaction to ensure atomicity:

1. Create arrear invoice for the current period
2. Update subscription to the next period
3. Create advance invoice for the new period

If any step fails, the entire transaction is rolled back.

## 7. Conclusion

This implementation plan provides a modular approach to handling advance and arrear billing within the current architecture. By creating reusable components, we can ensure consistency across different billing scenarios while minimizing code duplication.

The plan focuses on:
1. Creating reusable components for common billing operations
2. Handling the three key trigger points: subscription creation, period transitions, and preview invoices
3. Ensuring consistency across different billing scenarios
4. Maintaining backward compatibility with the existing codebase

By following this plan, we can implement the required billing functionality while setting the foundation for future improvements. 