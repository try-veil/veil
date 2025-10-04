# Pricing System Implementation TODO

## Implementation Status: ~85% Complete

**Core Engine:** ✅ Complete (Database Schema, Types, Config Loader, Pricing Engine, Promotion Engine, Repository, Service Layer)

**API & Initialization:** ✅ Complete (Validation Schemas, API Endpoints, Route Registration, Service Initialization)

**Integration & Testing:** ❌ Missing (Service Integration, Unit Tests, Background Jobs, Admin Endpoints)

---

## 🔴 CRITICAL Priority

### 1. Database Migrations ✅ PARTIALLY COMPLETE
- [x] Generate Drizzle migrations from schema changes
- [x] Review generated migration files
- [ ] Apply migrations to development database (requires PostgreSQL setup)
- [ ] Test rollback capabilities
- [ ] Document migration process

**Status:** Migration file `drizzle/0001_fine_omega_flight.sql` generated successfully. Database application pending PostgreSQL setup.

**Commands:**
```bash
cd packages/platform-api
bun run db:generate  # Generate migration files
bun run db:push      # Apply to database
```

**Files Affected:**
- `drizzle/migrations/*.sql` (new)

---

### 2. API Endpoints for Pricing ✅ COMPLETE
- [x] Create `src/routes/pricing.ts` with all pricing endpoints
- [x] Create `src/validation/pricing-validation.ts` with Zod schemas
- [x] Register pricing routes in `src/index.ts`
- [x] Add Swagger documentation tags

**Status:** All pricing API endpoints implemented and registered. 9 endpoints created with full validation.

**Required Endpoints:**
```typescript
GET    /api/v1/pricing/models              # List pricing models
GET    /api/v1/pricing/models/:id          # Get model details
POST   /api/v1/pricing/calculate           # Calculate price for usage
POST   /api/v1/pricing/promotions/validate # Validate promo code
POST   /api/v1/pricing/promotions/apply    # Apply promo to subscription
GET    /api/v1/pricing/invoices            # List user invoices
GET    /api/v1/pricing/invoices/:id        # Get invoice details
POST   /api/v1/pricing/invoices/:id/pay    # Mark invoice as paid
GET    /api/v1/pricing/billing-periods     # List billing periods for subscription
```

**Estimated Lines:** ~400

---

## 🟡 HIGH Priority

### 3. Service Integration ✅ COMPLETE
- [x] Update `SubscriptionService.createSubscription()` to integrate pricing
  - Get pricing model for API
  - Create initial billing period
  - Calculate initial price
- [x] Add `SubscriptionService.upgradeSubscription()` method
  - Handle mid-period upgrades
  - Calculate proration credits
  - Record pricing history
- [x] Update `PaymentService.calculatePricing()` to use pricing engine
  - Integration with pricing models
  - Fallback to legacy pricing
  - Support for promotion codes
- [x] Integrate usage tracking with billing period updates
  - Real-time billing period usage updates
  - Usage snapshot tracking
  - Data transfer monitoring
- [x] Add quota enforcement in API usage tracking
  - Quota status checks
  - Warning notifications (50%, 80%, 90%)
  - Over-quota detection

**Status:** Full integration complete! Services, billing, and usage tracking all connected.

**Files to Modify:**
- `src/services/subscription-service.ts` (add pricing integration)
- `src/services/payment-service.ts` (replace stub with actual pricing)
- `src/services/analytics-service.ts` (connect usage to billing)

**Estimated Lines:** ~200

---

### 4. Application Initialization ✅ COMPLETE
- [x] Initialize pricing service on app startup
- [x] Load YAML configurations into database
- [x] Add health check for pricing service
- [x] Log pricing models loaded

**Status:** Pricing service initialization added to `src/index.ts`. Runs before server starts listening.

**File to Modify:**
- `src/index.ts` (add initialization before app.listen())

**Code:**
```typescript
import { pricingService } from './services/pricing/pricing-service';

// Before app.listen():
await pricingService.initialize();
console.log('✅ Pricing service initialized');
```

**Estimated Lines:** ~20

---

### 5. Unit & Integration Tests
- [ ] Create `src/tests/pricing/` directory structure
- [ ] Config loader tests
  - YAML parsing
  - Validation (valid/invalid configs)
  - Hot-reload functionality
- [ ] Pricing engine tests
  - Usage-based calculations
  - Subscription calculations
  - Freemium calculations
  - Hybrid calculations
  - Overage handling
  - Prorated billing
- [ ] Promotion engine tests
  - Condition evaluation
  - Discount application
  - Promotion stacking
  - Best combination selection
- [ ] Repository tests
  - CRUD operations
  - Invoice generation
  - Revenue statistics
- [ ] Service layer tests
  - End-to-end price calculation
  - Invoice creation
  - Quota management
- [ ] API endpoint tests
  - Request validation
  - Response formats
  - Error handling

**Test Files Structure:**
```
src/tests/pricing/
├── config-loader.test.ts
├── pricing-engine.test.ts
├── promotion-engine.test.ts
├── pricing-repository.test.ts
├── pricing-service.test.ts
├── pricing-routes.test.ts
└── fixtures/
    ├── sample-configs.yaml
    └── test-data.ts
```

**Estimated Lines:** ~600

---

## 🟢 MEDIUM Priority

### 6. Validation Schemas ✅ COMPLETE
- [x] Create `src/validation/pricing-validation.ts`
- [x] Define Zod schemas for all pricing request/response types
- [x] Add schema documentation

**Status:** Comprehensive validation schemas created. 15+ schemas covering all pricing endpoints.

**Required Schemas:**
- `pricingModelQuerySchema`
- `pricingModelParamsSchema`
- `calculatePriceSchema`
- `validatePromotionSchema`
- `applyPromotionSchema`
- `invoiceQuerySchema`
- `invoiceParamsSchema`
- `billingPeriodQuerySchema`

**Estimated Lines:** ~150

---

### 7. Background Jobs ✅ COMPLETE
- [x] Create `src/jobs/` directory
- [x] Billing period closure job
  - Close expired billing periods
  - Calculate final usage and charges
  - Generate invoices automatically
  - Create new billing periods
- [x] Invoice reminder job
  - Send reminders for upcoming due dates
  - Mark invoices as overdue
  - Suspend subscriptions after 30 days
- [x] Promotion cleanup job
  - Deactivate expired promotions
  - Deactivate max-usage promotions
  - Archive old promotions
- [x] Job scheduler
  - Simple cron-like scheduler
  - Manual job triggering
  - Execution history tracking
  - Graceful start/stop

**Status:** All background jobs implemented with scheduler. Auto-runs on server startup.

**Job Files Created:**
```
src/jobs/
├── billing-period-closure.ts   (260 lines)
├── invoice-reminder.ts          (160 lines)
├── promotion-cleanup.ts         (210 lines)
└── scheduler.ts                 (220 lines)
```

**Total:** ~850 lines

---

### 8. Admin Endpoints
- [ ] Add admin pricing management to `src/routes/admin.ts`
- [ ] Pricing model CRUD operations
- [ ] Promotion CRUD operations
- [ ] Revenue analytics endpoints
- [ ] Billing period management

**Required Admin Endpoints:**
```typescript
// Pricing Models
POST   /admin/pricing/models            # Create pricing model
PUT    /admin/pricing/models/:id        # Update pricing model
DELETE /admin/pricing/models/:id        # Deactivate pricing model
GET    /admin/pricing/models            # List all models (including inactive)

// Promotions
POST   /admin/pricing/promotions        # Create promotion
PUT    /admin/pricing/promotions/:id    # Update promotion
DELETE /admin/pricing/promotions/:id    # Deactivate promotion
GET    /admin/pricing/promotions        # List all promotions

// Analytics
GET    /admin/pricing/revenue-stats     # Revenue analytics
GET    /admin/pricing/invoice-stats     # Invoice statistics
GET    /admin/pricing/subscription-mrr  # Monthly recurring revenue

// Billing Periods
GET    /admin/pricing/billing-periods   # List all billing periods
POST   /admin/pricing/billing-periods/:id/close  # Manually close period
```

**Estimated Lines:** ~300

---

## 🔵 LOW Priority

### 9. Error Handling & Edge Cases
- [ ] Add retry logic for failed invoice generation
- [ ] Handle concurrent billing period updates
- [ ] Add circuit breaker for external payment providers
- [ ] Implement idempotency keys for payment operations
- [ ] Add comprehensive error logging

**Files to Enhance:**
- `src/services/pricing/pricing-service.ts`
- `src/repositories/pricing-repository.ts`
- `src/middleware/error-handler.ts`

**Estimated Lines:** ~100

---

### 10. Documentation
- [ ] API documentation for pricing endpoints
  - Request/response examples
  - Error codes and messages
  - Rate limiting info
- [ ] YAML configuration guide
  - Schema reference
  - Example configurations
  - Best practices
- [ ] Migration guide
  - Migrating existing subscriptions to pricing models
  - Data migration scripts
- [ ] Admin guide
  - Managing pricing models
  - Creating promotions
  - Handling refunds

**Documentation Files:**
```
docs/api/
├── pricing-endpoints.md
├── pricing-examples.md
└── error-codes.md

docs/configuration/
├── pricing-yaml-schema.md
├── example-configs.md
└── validation-rules.md

docs/guides/
├── subscription-migration.md
├── admin-pricing-guide.md
└── promotion-management.md
```

**Estimated Lines:** ~200

---

## Progress Tracker

### Completed ✅
- [x] Database schema design (7 tables, 200 lines)
- [x] TypeScript type definitions (280 lines)
- [x] YAML config loader with validation (250 lines)
- [x] Pricing calculation engine (383 lines)
- [x] Promotion engine (371 lines)
- [x] Pricing repository (409 lines)
- [x] Pricing service layer (457 lines)
- [x] Sample pricing configurations (186 lines)
- [x] **Database migration generated** (155 lines SQL)
- [x] **Validation schemas** (250 lines)
- [x] **API endpoints** (470 lines)
- [x] **Service initialization** (20 lines)

**Total Completed:** ~4,781 lines

### In Progress 🔄
- [x] **Service integration** (300 lines added)
  - PaymentService pricing calculation
  - SubscriptionService pricing model integration
  - Subscription upgrade functionality
  - Usage tracking service with billing updates
  - Quota enforcement integration
- [x] **Background jobs** (850 lines added)
  - Billing period closure automation
  - Invoice reminders and overdue marking
  - Promotion cleanup
  - Job scheduler with auto-start

### Remaining 📋
- [ ] Database migrations - application to DB (CRITICAL - requires PostgreSQL)
- [ ] Unit tests (HIGH - 600 lines)
- [ ] Admin endpoints (MEDIUM - 300 lines)
- [ ] Error handling (LOW - 100 lines)
- [ ] Documentation (LOW - 200 lines)

**Total Remaining:** ~1,200 lines (excluding DB setup)

---

## Quick Start Guide

To continue implementation, work through tasks in priority order:

```bash
# 1. Generate and apply database migrations
cd packages/platform-api
bun run db:generate
bun run db:push

# 2. Create API endpoints
# Create src/routes/pricing.ts
# Create src/validation/pricing-validation.ts

# 3. Integrate with existing services
# Modify subscription-service.ts
# Modify payment-service.ts

# 4. Add initialization
# Modify src/index.ts

# 5. Write tests
# Create test files in src/tests/pricing/

# 6. Implement background jobs
# Create job files in src/jobs/

# 7. Add admin endpoints
# Modify src/routes/admin.ts

# 8. Complete documentation
# Create docs in docs/api/ and docs/guides/
```

---

## Notes

- All CRITICAL tasks must be completed before the pricing system is functional
- HIGH priority tasks are required for production readiness
- MEDIUM priority tasks enhance functionality and maintainability
- LOW priority tasks improve developer experience and system reliability

**Next Step:** Start with Task #1 (Database Migrations)