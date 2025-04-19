# Customer Entitlement & Usage APIs - Implementation Plan

## 1. Overview

This document outlines the implementation plan for two new APIs that provide customer-centric views of entitlements and usage across subscriptions:

1. **GetCustomerEntitlements**: Aggregates all entitlements for a customer across all subscriptions at the feature level
2. **GetCustomerUsageSummary**: Provides usage summary for the current period for all metered entitlements across subscriptions

These APIs will be implemented in the billing service since they focus on customer-level aggregation that span across entities and will be designed to be lightweight, fast, and informative.

## 2. API Specifications

### 2.1. GetCustomerEntitlements

#### Request
```go
type GetCustomerEntitlementsRequest struct {
    CustomerID      string    `json:"customer_id" binding:"required"`
    FeatureIDs      []string  `json:"feature_ids,omitempty"`
    SubscriptionIDs []string  `json:"subscription_ids,omitempty"`
}
```

#### Response
```go
type CustomerEntitlementsResponse struct {
    CustomerID  string                    `json:"customer_id"`
    Features    []*AggregatedFeature      `json:"features"`
    Pagination  *types.PaginationResponse `json:"pagination,omitempty"`
}

type AggregatedFeature struct {
    Feature     *dto.FeatureResponse      `json:"feature"`
    Entitlement *AggregatedEntitlement    `json:"entitlement"`
    Sources     []*EntitlementSource      `json:"sources"`
}

type AggregatedEntitlement struct {
    IsEnabled        bool                 `json:"is_enabled"`
    UsageLimit       *int64               `json:"usage_limit,omitempty"`
    IsSoftLimit      bool                 `json:"is_soft_limit"`
    UsageResetPeriod types.BillingPeriod  `json:"usage_reset_period,omitempty"`
    StaticValues     []string             `json:"static_values,omitempty"` // For static/SLA features
}

type EntitlementSource struct {
    SubscriptionID   string               `json:"subscription_id"`
    PlanID           string               `json:"plan_id"`
    PlanName         string               `json:"plan_name"`
    EntitlementID    string               `json:"entitlement_id"`
    IsEnabled        bool                 `json:"is_enabled"`
    UsageLimit       *int64               `json:"usage_limit,omitempty"`
    StaticValue      string               `json:"static_value,omitempty"`
}
```

### 2.2. GetCustomerUsageSummary

#### Request
```go
type GetCustomerUsageSummaryRequest struct {
    CustomerID      string    `json:"customer_id" binding:"required"`
    FeatureIDs      []string  `json:"feature_ids,omitempty"`
    SubscriptionIDs []string  `json:"subscription_ids,omitempty"`
    StartTime       *time.Time `json:"start_time,omitempty"` // For custom period
    EndTime         *time.Time `json:"end_time,omitempty"`   // For custom period
}
```

#### Response
```go
type CustomerUsageSummaryResponse struct {
    CustomerID  string                     `json:"customer_id"`
    Features    []*FeatureUsageSummary     `json:"features"`
    Period      *types.BillingPeriodInfo   `json:"period"`
    Pagination  *types.PaginationResponse  `json:"pagination,omitempty"`
}

type FeatureUsageSummary struct {
    Feature       *dto.FeatureResponse     `json:"feature"`
    TotalLimit    *int64                   `json:"total_limit,omitempty"`
    CurrentUsage  int64                    `json:"current_usage"`
    UsagePercent  float64                  `json:"usage_percent"`
    IsSoftLimit   bool                     `json:"is_soft_limit"`
    Sources       []*UsageSource           `json:"sources"`
}

type UsageSource struct {
    SubscriptionID  string                 `json:"subscription_id"`
    PlanID          string                 `json:"plan_id"`
    PlanName        string                 `json:"plan_name"`
    Limit           *int64                 `json:"limit,omitempty"`
    Usage           int64                  `json:"usage"`
    UsagePercent    float64                `json:"usage_percent"`
}
```

## 3. Implementation Plan

### 3.1. Service Interface

Add the following methods to the `BillingService` interface:

```go
type BillingService interface {
    // Existing methods...
    
    // New methods
    GetCustomerEntitlements(ctx context.Context, req *dto.GetCustomerEntitlementsRequest) (*dto.CustomerEntitlementsResponse, error)
    GetCustomerUsageSummary(ctx context.Context, req *dto.GetCustomerUsageSummaryRequest) (*dto.CustomerUsageSummaryResponse, error)
}
```

### 3.2. Repository Enhancements

To support efficient implementation and future caching, we'll add the following strategic repository methods:

#### 3.2.1. Subscription Repository

```go
// Add to subscription.Repository interface
ListByCustomerID(ctx context.Context, customerID string, subscriptionIDs []string) ([]*subscription.Subscription, error)
```

#### 3.2.2. Entitlement Repository

```go
// Add to entitlement.Repository interface
ListByPlanIDs(ctx context.Context, planIDs []string) ([]*entitlement.Entitlement, error)
ListByFeatureIDs(ctx context.Context, featureIDs []string) ([]*entitlement.Entitlement, error)
```

#### 3.2.3. Feature Repository

```go
// Add to feature.Repository interface
ListByIDs(ctx context.Context, featureIDs []string) ([]*feature.Feature, error)
```

#### 3.2.4. Usage Repository

```go
// Add to usage.Repository interface
GetUsageByMeterIDsAndPeriod(
    ctx context.Context,
    meterIDs []string,
    subscriptionIDs []string,
    startTime time.Time,
    endTime time.Time
) (map[string]map[string]int64, error) // Returns map[meterID]map[subscriptionID]usage
```

These methods are strategically chosen to:
1. Support the most common access patterns for these APIs
2. Enable efficient caching with clear invalidation strategies
3. Minimize repository bloat by focusing on high-value methods

### 3.3. Implementation Strategy for GetCustomerEntitlements

#### 3.3.1. Algorithm

1. **Query Active Subscriptions**
   - Use `SubscriptionRepository.ListByCustomerID` to get active subscriptions
   - Filter by subscription IDs if provided in the request

2. **Query Entitlements for Plans**
   - Extract plan IDs from subscriptions
   - Use `EntitlementRepository.ListByPlanIDs` to get entitlements
   - Pass feature IDs and feature types from request for filtering

3. **Query Features**
   - Extract feature IDs from entitlements
   - Use `FeatureRepository.ListByIDs` to get features
   - Pass feature types from request for filtering

4. **Aggregate Entitlements by Feature**
   - Group entitlements by feature ID
   - For each feature, aggregate based on feature type:
     - **Metered**: Sum usage limits if all soft limits, or use minimum if any hard limit
     - **Boolean**: Enable if any subscription enables it
     - **Static/SLA**: Collect all values in an array

5. **Build Response with Sources**
   - For each aggregated entitlement, include source information
   - Return the response

#### 3.3.2. Caching Considerations

While not implementing caching initially, the design will support future caching:

1. **Cache Keys**:
   - Subscriptions: `customer:{customerID}:subscriptions`
   - Entitlements: `plan:{planID}:entitlements`
   - Features: `feature:{featureID}`

2. **Cache Invalidation**:
   - Subscription cache: Invalidate on subscription create/update/delete
   - Entitlement cache: Invalidate on entitlement create/update/delete
   - Feature cache: Invalidate on feature update/delete

### 3.4. Implementation Strategy for GetCustomerUsageSummary

#### 3.4.1. Algorithm

1. **Get Customer Entitlements**
   - Call `GetCustomerEntitlements` with the same customer ID, subscription IDs, and feature IDs
   - Add feature type filter for "metered" features to optimize the query
   - This gives us all the entitlement information we need

2. **Determine Billing Period**
   - If start/end time provided in request, use those
   - Otherwise, use current billing period for each subscription
   - Create a unified period that covers all subscriptions

3. **Query Usage Data**
   - Extract meter IDs from features
   - Use `UsageRepository.GetUsageByMeterIDsAndPeriod` to get usage data
   - Pass subscription IDs for filtering

4. **Calculate Aggregated Usage**
   - For each feature, calculate:
     - Total limit (from entitlements)
     - Current usage (from usage data)
     - Usage percentage
     - Source breakdown by subscription

5. **Build Response**
   - Return the response with period information

#### 3.4.2. Benefits of This Approach

1. **Reduced Duplication**: Leverages existing entitlement aggregation logic
2. **Focused Responsibility**: Each method has a clear, single responsibility
3. **Optimized Queries**: Only fetches metered features when needed
4. **Future Caching**: Supports caching at multiple levels

## 4. Aggregation Logic

### 4.1. Feature Type-Specific Aggregation

#### 4.1.1. Metered Features

```go
func aggregateMeteredEntitlements(entitlements []*entitlement.Entitlement) *AggregatedEntitlement {
    var totalLimit int64 = 0
    isSoftLimit := true
    var usageResetPeriod types.BillingPeriod
    
    // First pass: check if any hard limits exist
    for _, e := range entitlements {
        if e.IsEnabled && !e.IsSoftLimit {
            isSoftLimit = false
            break
        }
    }
    
    // Second pass: calculate total limit based on soft/hard limit policy
    if isSoftLimit {
        // For soft limits, sum all limits
        for _, e := range entitlements {
            if e.IsEnabled && e.UsageLimit != nil {
                totalLimit += *e.UsageLimit
            }
        }
    } else {
        // For hard limits, use the minimum non-zero limit
        var minLimit *int64
        for _, e := range entitlements {
            if e.IsEnabled && e.UsageLimit != nil && !e.IsSoftLimit {
                if minLimit == nil || *e.UsageLimit < *minLimit {
                    minLimit = e.UsageLimit
                }
            }
        }
        if minLimit != nil {
            totalLimit = *minLimit
        }
    }
    
    // Determine reset period (use most common)
    resetPeriodCounts := make(map[types.BillingPeriod]int)
    for _, e := range entitlements {
        if e.IsEnabled && e.UsageResetPeriod != "" {
            resetPeriodCounts[e.UsageResetPeriod]++
        }
    }
    
    maxCount := 0
    for period, count := range resetPeriodCounts {
        if count > maxCount {
            maxCount = count
            usageResetPeriod = period
        }
    }
    
    return &AggregatedEntitlement{
        IsEnabled:        len(entitlements) > 0,
        UsageLimit:       &totalLimit,
        IsSoftLimit:      isSoftLimit,
        UsageResetPeriod: usageResetPeriod,
    }
}
```

#### 4.1.2. Boolean Features

```go
func aggregateBooleanEntitlements(entitlements []*entitlement.Entitlement) *AggregatedEntitlement {
    isEnabled := false
    
    // If any subscription enables the feature, it's enabled
    for _, e := range entitlements {
        if e.IsEnabled {
            isEnabled = true
            break
        }
    }
    
    return &AggregatedEntitlement{
        IsEnabled: isEnabled,
    }
}
```

#### 4.1.3. Static/SLA Features

```go
func aggregateStaticEntitlements(entitlements []*entitlement.Entitlement) *AggregatedEntitlement {
    isEnabled := false
    staticValues := []string{}
    valueMap := make(map[string]bool) // To deduplicate values
    
    for _, e := range entitlements {
        if e.IsEnabled {
            isEnabled = true
            if e.StaticValue != "" && !valueMap[e.StaticValue] {
                staticValues = append(staticValues, e.StaticValue)
                valueMap[e.StaticValue] = true
            }
        }
    }
    
    return &AggregatedEntitlement{
        IsEnabled:    isEnabled,
        StaticValues: staticValues,
    }
}
```

## 5. API Endpoints

Add these REST endpoints to the customer controller:

```
GET /api/v1/customers/:id/entitlements
GET /api/v1/customers/:id/usage
```

## 6. Performance Considerations

### 6.1. Database Optimization

1. **Indexes**
   - Ensure proper indexes on `subscription.customer_id`
   - Add composite indexes for common query patterns:
     - `(customer_id, subscription_status)`
     - `(plan_id, feature_id)`
     - `(feature_id, feature_type)`

2. **Query Optimization**
   - Use SQL JOINs where appropriate to minimize round trips
   - Consider adding denormalized views for common query patterns

### 6.2. Application Optimization

1. **Parallel Processing**
   - Use goroutines for independent data fetching operations
   - Implement proper error handling with context cancellation

2. **Memory Efficiency**
   - Use maps for lookups to minimize iteration
   - Preallocate slices where size is known

3. **Future Caching Strategy**
   - Design for fragment caching of:
     - Customer subscriptions
     - Feature metadata
     - Aggregated entitlements
   - Use deterministic cache keys based on IDs and timestamps

## 7. Testing Strategy

1. **Unit Tests**
   - Test aggregation logic for each feature type
   - Test edge cases (no subscriptions, mixed feature types)

2. **Integration Tests**
   - Test with various customer configurations
   - Test filtering and pagination

3. **Performance Tests**
   - Benchmark with large numbers of subscriptions/features
   - Identify bottlenecks and optimize

## 8. Implementation Timeline

1. **Phase 1: Core Implementation**
   - Implement repository enhancements
   - Implement DTO structures
   - Implement service methods
   - Add API endpoints

2. **Phase 2: Optimization**
   - Optimize query performance
   - Implement error handling and edge cases

3. **Phase 3: Testing & Documentation**
   - Write comprehensive tests
   - Document API usage
   - Prepare for production deployment
