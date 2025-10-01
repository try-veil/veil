# Usage Tracking Implementation Gap Analysis

## Executive Summary

The current usage tracking implementation has **significant gaps** between what's built and what's needed for production. While basic infrastructure exists, critical integrations are missing.

**Overall Completion: ~40%**

---

## Current Implementation

### ✅ What Exists

#### 1. **Database Schema** (100% Complete)
- `usage_records` table for detailed request logs
- `api_usage_analytics` table for aggregated daily stats
- `billing_periods` with `usageSnapshot` JSON field
- Proper indexes on timestamp, apiKeyId, apiId

#### 2. **UsageTrackingService** (70% Complete)
- `trackUsage()` - Enqueues usage events via event queue ✅
- `updateBillingPeriodUsage()` - Updates billing period snapshot ✅
- `checkQuotaStatus()` - Delegates to pricingService ✅
- `aggregateUsage()` - Aggregates across billing periods ✅
- `getCurrentPeriodUsage()` - Gets current period stats ✅
- `resetBillingPeriodUsage()` - Closes billing periods ✅

#### 3. **Usage Routes** (80% Complete)
- `POST /usage/events` - Receives usage events from gateway ✅
- `GET /usage/stats` - Returns usage statistics ✅
- `GET /usage/trends` - Returns usage over time ✅
- `GET /usage/summary` - Dashboard summary ✅
- `GET /usage/export` - Export to JSON/CSV ✅

#### 4. **Event Queue Integration** (100% Complete)
- Usage events queued with priority 'high' ✅
- Automatic retries (5 attempts) ✅
- Event handler registered ✅
- Fallback to direct update on queue failure ✅

---

## Critical Gaps

### ❌ 1. **Gateway Integration** (0% Complete)

**Problem**: The Caddy gateway doesn't send usage events to the BFF.

**Missing Components**:

```go
// packages/caddy/handler.go - MISSING
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // ... existing validation logic ...

    // ❌ MISSING: Capture request/response metrics
    startTime := time.Now()
    requestSize := r.ContentLength

    // Proxy to upstream
    response := h.proxyToUpstream(r)

    // ❌ MISSING: Send usage event to BFF
    usageEvent := UsageEvent{
        ID: uuid.New().String(),
        APIPath: r.URL.Path,
        SubscriptionKey: subscriptionKey,
        Method: r.Method,
        ResponseTimeMs: time.Since(startTime).Milliseconds(),
        StatusCode: response.StatusCode,
        Success: response.StatusCode < 400,
        Timestamp: time.Now().ISO8601(),
        RequestSize: requestSize,
        ResponseSize: response.ContentLength,
    }

    // ❌ MISSING: Async send to BFF
    go h.sendUsageEvent(usageEvent)
}

// ❌ MISSING: Batch sender
func (h *Handler) batchSendUsageEvents() {
    ticker := time.NewTicker(5 * time.Second)
    for {
        select {
        case <-ticker.C:
            if len(h.eventBuffer) > 0 {
                h.flushEventBuffer()
            }
        }
    }
}
```

**Impact**:
- No usage data is being collected from actual API requests
- Billing cannot be calculated
- Quota enforcement is impossible
- Analytics are empty

**Priority**: 🔴 **CRITICAL**

---

### ❌ 2. **Real-time Quota Enforcement** (20% Complete)

**Problem**: Quota checks happen after the fact, not before request execution.

**Current Flow** (Wrong):
```
1. Gateway receives request
2. Gateway forwards to upstream
3. BFF receives usage event
4. BFF checks quota (TOO LATE!)
5. BFF logs warning if over quota
```

**Required Flow**:
```
1. Gateway receives request
2. Gateway calls BFF: GET /quota/check?subscriptionKey=XXX
3. BFF returns: { allowed: true/false, remaining: X }
4. Gateway blocks or allows request
5. Gateway forwards to upstream (if allowed)
6. Gateway sends usage event to BFF
```

**Missing Endpoint**:
```typescript
// ❌ MISSING in src/routes/quota.ts
router.get('/check', async ({ query }) => {
  const { subscriptionKey } = query;

  // Find subscription by key
  const subscription = await findSubscriptionByKey(subscriptionKey);

  // Check quota
  const quotaStatus = await usageTrackingService.checkQuotaStatus(
    subscription.id
  );

  // Return immediate yes/no
  return {
    allowed: !quotaStatus.isOverQuota,
    remaining: quotaStatus.remainingRequests,
    resetAt: quotaStatus.resetAt
  };
});
```

**Gateway Integration**:
```go
// ❌ MISSING in packages/caddy/handler.go
func (h *Handler) checkQuota(subscriptionKey string) (bool, error) {
    resp, err := http.Get(fmt.Sprintf(
        "%s/api/v1/quota/check?subscriptionKey=%s",
        h.bffURL,
        subscriptionKey
    ))

    if err != nil {
        // Fail open or fail closed?
        return true, err // Currently failing open
    }

    var result QuotaCheckResult
    json.NewDecoder(resp.Body).Decode(&result)

    return result.Allowed, nil
}
```

**Impact**:
- Users can exceed quotas with no enforcement
- Revenue loss from unlimited usage
- No hard stops on billing tier limits

**Priority**: 🔴 **CRITICAL**

---

### ❌ 3. **Usage Record Persistence** (30% Complete)

**Problem**: `/usage/events` endpoint doesn't insert into `usage_records` table.

**Current Behavior**:
- Updates `api_subscriptions.requestsUsed` ✅
- Inserts into `api_usage_analytics` (daily aggregates) ✅
- Updates billing period snapshot ✅
- ❌ Does NOT insert into `usage_records` (detailed logs)

**Why This Matters**:
- `usage_records` stores **per-request** details (endpoint, response time, IP, user agent)
- Required for:
  - Debugging specific API calls
  - Detailed audit logs
  - Response time analytics
  - Geographic analysis
  - Fraud detection

**Missing Code**:
```typescript
// src/routes/usage.ts - Line ~131
// ❌ MISSING: Insert into usage_records
await db.insert(usageRecords).values({
  apiKeyId: apiKey.id,
  apiId: subscriptionData.apiId,
  timestamp: new Date(event.timestamp),
  endpoint: event.api_path,
  method: event.method,
  statusCode: event.status_code,
  responseTime: event.response_time_ms,
  requestSize: event.request_size || 0,
  responseSize: event.response_size || 0,
  userAgent: event.user_agent || null,
  ipAddress: event.ip_address || null
});
```

**Impact**:
- No per-request audit trail
- Cannot debug "my request was slow" issues
- Cannot analyze response time distribution
- Missing data for SLA monitoring

**Priority**: 🟡 **HIGH**

---

### ❌ 4. **Overage Charges** (0% Complete)

**Problem**: No logic to charge for usage beyond quota limits.

**Scenario**:
- User on "100 requests/month" plan
- Makes 150 requests
- No overage charge applied

**Missing Components**:

```typescript
// ❌ MISSING in src/services/usage-tracking-service.ts
async calculateOverageCharges(subscriptionId: number): Promise<number> {
  const period = await pricingRepository.findCurrentBillingPeriod(subscriptionId);
  const pricingModel = await pricingRepository.findPricingModelById(
    period.pricingModelId
  );

  // Get overage pricing from config
  const config = JSON.parse(pricingModel.configJson);
  const overageRate = config.overageRate; // e.g., $0.001 per request

  // Calculate overage
  const usage = await this.getCurrentPeriodUsage(subscriptionId);
  const quota = config.quotaLimit;
  const overageRequests = Math.max(0, usage.requestCount - quota);

  return overageRequests * overageRate;
}

// ❌ MISSING: Background job
async processOverageCharges() {
  // Run daily
  const subscriptions = await getActiveSubscriptions();

  for (const sub of subscriptions) {
    const overage = await this.calculateOverageCharges(sub.id);

    if (overage > 0) {
      await eventQueue.enqueue('payment_processing', {
        subscriptionId: sub.id,
        amount: overage,
        type: 'overage_charge',
        description: `Overage charges for ${overageRequests} extra requests`
      });
    }
  }
}
```

**Impact**:
- Lost revenue from high-usage customers
- No incentive for users to upgrade plans
- Billing system incomplete

**Priority**: 🟡 **HIGH**

---

### ❌ 5. **Quota Warning Notifications** (10% Complete)

**Problem**: Quota warnings are logged but not sent to users.

**Current Code** (Line 99 in usage.ts):
```typescript
if (quotaCheck.warnings && quotaCheck.warnings.length > 0) {
  for (const warning of quotaCheck.warnings) {
    console.warn(`Quota warning for subscription ${subscriptionData.subscriptionId}: ${warning}`);
    // ❌ TODO: Send notification to user about approaching quota limit
  }
}
```

**Missing Implementation**:
```typescript
// ❌ MISSING
if (quotaCheck.usagePercentage >= 80) {
  await eventQueue.enqueue('quota_warning', {
    subscriptionId: sub.id,
    userEmail: user.email,
    apiName: api.name,
    usagePercentage: quotaCheck.usagePercentage,
    remainingRequests: quotaCheck.remainingRequests
  }, {
    priority: 'normal'
  });
}
```

**Impact**:
- Users surprised when they hit limits
- Poor user experience
- Support tickets increase

**Priority**: 🟠 **MEDIUM**

---

### ❌ 6. **Usage Data Retention Policy** (0% Complete)

**Problem**: No mechanism to archive or delete old usage data.

**Current Situation**:
- `usage_records` grows indefinitely
- No data lifecycle management
- Will hit storage limits eventually

**Required Components**:

```typescript
// ❌ MISSING: Background job
async archiveOldUsageRecords() {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 6); // 6 months retention

  // Move to cold storage or S3
  const oldRecords = await db.select()
    .from(usageRecords)
    .where(lt(usageRecords.timestamp, cutoffDate))
    .limit(10000);

  if (oldRecords.length > 0) {
    await archiveToS3(oldRecords);
    await db.delete(usageRecords)
      .where(lt(usageRecords.timestamp, cutoffDate));
  }
}
```

**Impact**:
- Database bloat
- Slow queries as table grows
- High storage costs

**Priority**: 🟢 **LOW** (but will become critical over time)

---

### ❌ 7. **Rate Limiting Integration** (50% Complete)

**Problem**: Rate limiting service exists but isn't integrated with usage tracking.

**Current State**:
- `rate-limiting-service.ts` has methods ✅
- Usage routes call it ✅
- Gateway doesn't enforce it ❌
- No Redis integration ❌

**Missing**:
```go
// ❌ MISSING in packages/caddy/handler.go
func (h *Handler) checkRateLimit(apiKeyId int, endpoint string) bool {
    // Check Redis for current window
    key := fmt.Sprintf("ratelimit:%d:%s", apiKeyId, endpoint)
    current, _ := h.redis.Get(key).Int()
    limit := h.getRateLimitForKey(apiKeyId)

    if current >= limit {
        return false
    }

    // Increment counter
    h.redis.Incr(key)
    h.redis.Expire(key, time.Minute)

    return true
}
```

**Impact**:
- No protection against API abuse
- Gateway can be overwhelmed
- DDoS vulnerability

**Priority**: 🟡 **HIGH**

---

### ❌ 8. **Real-time Dashboard Updates** (0% Complete)

**Problem**: Dashboard data is stale, requires page refresh.

**Missing Components**:

```typescript
// ❌ MISSING: WebSocket endpoint
router.ws('/usage/stream', (ws) => {
  const subscriptionId = ws.params.subscriptionId;

  // Subscribe to Redis pub/sub
  redisSubscriber.subscribe(`usage:${subscriptionId}`);

  redisSubscriber.on('message', (channel, message) => {
    const usageUpdate = JSON.parse(message);
    ws.send(JSON.stringify(usageUpdate));
  });
});

// ❌ MISSING: Publish usage updates
async function publishUsageUpdate(subscriptionId: number) {
  const currentUsage = await getCurrentPeriodUsage(subscriptionId);
  await redisPublisher.publish(
    `usage:${subscriptionId}`,
    JSON.stringify(currentUsage)
  );
}
```

**Impact**:
- Poor user experience
- Users don't see real-time quota usage
- Cannot monitor live traffic

**Priority**: 🟢 **LOW** (nice to have)

---

## Data Flow Gaps

### Current (Broken) Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────┐
│   Gateway   │ ❌ No usage tracking
│   (Caddy)   │ ❌ No quota check
└──────┬──────┘
       │ Proxy
       ▼
┌─────────────┐
│  Upstream   │
│   API       │
└─────────────┘

       ❌ No usage event sent to BFF
```

### Required Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP Request with X-Subscription-Key
       ▼
┌─────────────────────────────────────┐
│           Gateway (Caddy)            │
│  1. Validate subscription key        │
│  2. ✅ Check quota (call BFF)        │
│  3. ✅ Check rate limit (Redis)      │
│  4. Capture request metrics          │
└──────┬──────────────────┬───────────┘
       │ If allowed       │ If blocked
       ▼                  ▼
┌─────────────┐    ┌──────────────┐
│  Upstream   │    │ 429 Response │
│   API       │    └──────────────┘
└──────┬──────┘
       │ Response
       ▼
┌─────────────────────────────────────┐
│           Gateway (Caddy)            │
│  5. Capture response metrics         │
│  6. ✅ Buffer usage event            │
│  7. ✅ Batch send every 5s           │
└──────┬──────────────────────────────┘
       │ Usage events (batched)
       ▼
┌─────────────────────────────────────┐
│        BFF (Platform API)            │
│  POST /api/v1/usage/events           │
│  1. Validate events                  │
│  2. Find subscription                │
│  3. ✅ Insert usage_records          │
│  4. ✅ Update api_usage_analytics    │
│  5. ✅ Update billing_periods        │
│  6. ✅ Check for quota warnings      │
│  7. ✅ Enqueue warning events        │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│          Event Queue                 │
│  - usage_tracking (billing update)   │
│  - quota_warning (notifications)     │
│  - overage_charge (payments)         │
└─────────────────────────────────────┘
```

---

## Priority Action Items

### 🔴 CRITICAL (Block Production Launch)

1. **Gateway Usage Event Sender**
   - Implement usage event capture in Caddy handler
   - Add batch buffer and async sender
   - Send to `POST /api/v1/usage/events`
   - **Estimated Effort**: 2-3 days

2. **Real-time Quota Check Endpoint**
   - Add `GET /api/v1/quota/check?subscriptionKey=XXX`
   - Gateway calls before proxying request
   - Return allow/deny decision
   - **Estimated Effort**: 1 day

3. **Gateway Quota Enforcement**
   - Call quota check endpoint before proxy
   - Return 429 if over quota
   - Add retry-after header
   - **Estimated Effort**: 1 day

### 🟡 HIGH (Required for Billing)

4. **Usage Records Persistence**
   - Insert into `usage_records` table
   - Add missing fields (IP, user agent)
   - **Estimated Effort**: 0.5 days

5. **Overage Charge Calculation**
   - Calculate usage beyond quota
   - Apply overage rates from pricing model
   - Queue payment events
   - **Estimated Effort**: 2 days

6. **Rate Limiting Enforcement**
   - Add Redis integration to gateway
   - Enforce per-key rate limits
   - Return 429 on rate limit exceeded
   - **Estimated Effort**: 2 days

### 🟠 MEDIUM (User Experience)

7. **Quota Warning Notifications**
   - Send email/webhook at 80%, 90%, 100%
   - Integration with notification service
   - **Estimated Effort**: 1 day

8. **Usage Analytics Improvements**
   - Response time percentiles (p50, p95, p99)
   - Error rate breakdown by status code
   - Geographic distribution
   - **Estimated Effort**: 2 days

### 🟢 LOW (Optimizations)

9. **Data Retention Policy**
   - Archive old usage records to S3
   - Delete after retention period
   - **Estimated Effort**: 1-2 days

10. **Real-time Dashboard**
    - WebSocket streaming
    - Live usage updates
    - **Estimated Effort**: 2-3 days

---

## Testing Gaps

### ❌ Missing Tests

1. **Gateway Integration Tests**
   - No tests for usage event sending
   - No tests for quota enforcement
   - No tests for rate limiting

2. **Load Tests**
   - How does system handle 1000 req/s?
   - Does event queue keep up?
   - Does database performance degrade?

3. **Overage Scenarios**
   - User exceeds quota by 10%
   - User exceeds quota by 1000%
   - Verify overage charges correct

4. **Quota Edge Cases**
   - Usage exactly at limit
   - Concurrent requests near limit
   - Quota updates during active period

---

## Recommended Implementation Order

### Phase 1: Critical Path (1 week)
1. Gateway usage event sender
2. Quota check endpoint
3. Gateway quota enforcement
4. Usage records persistence

### Phase 2: Billing (1 week)
5. Overage charge calculation
6. Overage background jobs
7. Rate limiting enforcement

### Phase 3: Polish (1 week)
8. Quota warning notifications
9. Analytics improvements
10. Integration tests

### Phase 4: Scale (1 week)
11. Data retention policy
12. Real-time dashboard
13. Load testing & optimization

---

## Summary

**Current State**: The usage tracking system has good foundational code but is **not production-ready**. Critical integrations with the gateway are completely missing.

**Blocking Issues**:
- ❌ Gateway doesn't send usage data
- ❌ No quota enforcement at gateway
- ❌ Billing cannot be calculated without usage data

**Estimated Time to Production**: **4 weeks** with 1 engineer

**Risk Assessment**: 🔴 **HIGH** - Current implementation cannot support paying customers.
