# PAX Module - Platform API JWT Integration Plan

**Branch**: `feat/razorpay`
**Created**: 2025-10-18
**Last Updated**: 2025-10-18 (after latest code review)
**Task**: Integrate PAX module authentication with Platform API's JWT/FusionAuth system

## Objective

Unify authentication across Veil's services by migrating PAX module from standalone JWT to use the Platform API's FusionAuth-based authentication system. This ensures:
- Single source of truth for user authentication
- Consistent JWT token format across services
- Centralized identity management via FusionAuth
- Shared user database (PostgreSQL) for profile data

---

## Current State Analysis (Updated After Code Review)

### Platform API Authentication ✅ FULLY IMPLEMENTED
- **Location**: `packages/platform-api/src/`
- **Auth Provider**: FusionAuth (external identity service) ✅
- **Database**: PostgreSQL (`veil_platform` database)
- **Dependencies**: `@fusionauth/typescript-client` v1.60.0 ✅
- **JWT Payload**: `{ userId: number, uid: string, email: string, role: string }`
- **Token Expiry**: Access (7d), Refresh (30d)
- **Middleware**: `authMiddleware` + `requireRole(['admin'])` ✅
- **FusionAuth Service**: Fully implemented at `src/services/fusionauth-service.ts` ✅
- **Features**:
  - Token validation with FusionAuth API ✅
  - Refresh token support ✅
  - Role-based access control (RBAC) ✅
  - User status checks (`isActive`) ✅
  - Local user record sync with FusionAuth ✅
  - Auto-create users on first FusionAuth login ✅

**Users Table** (platform-api schema):
```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  email: varchar('email').unique().notNull(),
  password: varchar('password').notNull(),
  firstName: varchar('first_name').notNull(),
  lastName: varchar('last_name').notNull(),
  role: varchar('role').default('user').notNull(), // 'user', 'seller', 'admin'
  fusionAuthId: varchar('fusion_auth_id').unique(), ✅
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### PAX Module Authentication ❌ NEEDS INTEGRATION
- **Location**: `packages/pax/src/middleware/auth.ts`
- **Auth Provider**: Standalone JWT with `@elysiajs/jwt` ❌
- **Database**: PostgreSQL (`pax` database - SEPARATE from platform-api) ❌
- **Database URL**: `postgresql://postgres:postgres@localhost:5432/pax`
- **Dependencies**: NO `@fusionauth/typescript-client` ❌
- **JWT Payload**: `{ id: number, userId?: number, email: string, role?: string }`
- **Middleware**: Simple JWT verification with local secret ❌
- **FusionAuth Service**: DOES NOT EXIST ❌
- **Users Table**: **MISSING - NO users table in PAX schema!** ❌❌❌

**Critical Issue**: PAX schema references `userId: integer` in many tables:
- `paymentTransactions.userId`
- `creditAccounts.userId`
- `usageRecords.userId`

But **NO users table exists** in the PAX schema to resolve these foreign keys!

**Current Limitations**:
  - No FusionAuth integration ❌
  - Different JWT payload structure ❌
  - No centralized token management ❌
  - No refresh token support ❌
  - Cannot share tokens with Platform API ❌
  - **No users table - cannot resolve user information** ❌
  - **Separate database - cannot access platform-api users** ❌

---

## Integration Architecture

### High-Level Flow
```
User → Platform API Login → FusionAuth issues JWT
                                 ↓
                          Store in client
                                 ↓
User → PAX API Request with JWT in Authorization header
                                 ↓
                   PAX validates with FusionAuth
                                 ↓
                   PAX queries user from PostgreSQL
                                 ↓
                   Request processed with user context
```

### Shared Components
1. **FusionAuth Service**: Validate tokens, refresh tokens
2. **User Database**: Single PostgreSQL database with shared schema
3. **JWT Structure**: Unified payload format
4. **Environment Config**: Shared FusionAuth credentials

---

## Implementation Plan (UPDATED)

### Overview

Since Platform API already has full FusionAuth integration, we can:
1. **Copy** the FusionAuth service from platform-api to PAX
2. **Reuse** the same configuration pattern
3. **Share** the database to access the users table
4. **Adopt** the same authentication middleware pattern

This significantly reduces implementation risk and ensures consistency.

---

### Phase 1: Configuration & Dependencies

#### Task 1.1: Install FusionAuth SDK
**File**: `packages/pax/package.json`

```bash
cd packages/pax
bun add @fusionauth/typescript-client
```

**Expected Change**:
```json
"dependencies": {
  "@fusionauth/typescript-client": "^1.60.0",  // NEW
  "@elysiajs/bearer": "^0.8.0",
  // ... rest
}
```

#### Task 1.2: Update PAX Configuration
**File**: `packages/pax/src/config/index.ts`

**Add FusionAuth configuration** (copy from platform-api):
```typescript
export const config = {
  // ... existing config ...

  // FusionAuth (NEW)
  fusionAuth: {
    serverUrl: process.env.FUSIONAUTH_SERVER_URL || 'http://localhost:9011',
    apiKey: process.env.FUSIONAUTH_API_KEY || '',
    applicationId: process.env.FUSIONAUTH_APPLICATION_ID || '',
    clientId: process.env.FUSIONAUTH_CLIENT_ID || '',
    clientSecret: process.env.FUSIONAUTH_CLIENT_SECRET || '',
    tenantId: process.env.FUSIONAUTH_TENANT_ID || '',
    redirectUri: process.env.FUSIONAUTH_REDIRECT_URI || 'http://localhost:3002/auth/callback',
  },
};
```

#### Task 1.3: Update Environment Variables
**Files**: `packages/pax/.env.example` and `packages/pax/.env`

**Add**:
```bash
# FusionAuth Configuration
FUSIONAUTH_SERVER_URL=http://localhost:9011
FUSIONAUTH_API_KEY=<copy-from-platform-api-.env>
FUSIONAUTH_APPLICATION_ID=<copy-from-platform-api-.env>
FUSIONAUTH_CLIENT_ID=<copy-from-platform-api-.env>
FUSIONAUTH_CLIENT_SECRET=<copy-from-platform-api-.env>
FUSIONAUTH_TENANT_ID=<copy-from-platform-api-.env>
FUSIONAUTH_REDIRECT_URI=http://localhost:3002/auth/callback
```

**IMPORTANT**: Use the **same FusionAuth credentials** as platform-api to ensure tokens work across both services.

**Acceptance Criteria**:
- [ ] `@fusionauth/typescript-client` added to dependencies
- [ ] FusionAuth config added to `config/index.ts`
- [ ] Environment variables documented in `.env.example`
- [ ] Actual credentials added to `.env` (copy from platform-api)

---

### Phase 2: FusionAuth Service Implementation

#### Task 2.1: Create FusionAuth Service
**New File**: `packages/pax/src/services/fusionauth-service.ts`

**Implementation** (adapted from platform API):
```typescript
import FusionAuthClient from '@fusionauth/typescript-client';
import config from '../config';

interface TokenValidationResult {
  valid: boolean;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roles?: string[];
  };
  error?: string;
}

class FusionAuthService {
  private client: FusionAuthClient;

  constructor() {
    this.client = new FusionAuthClient(
      config.fusionAuth.apiKey,
      config.fusionAuth.serverUrl,
      config.fusionAuth.tenantId
    );
  }

  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const response = await this.client.validateJWT(token);

      if (!response.wasSuccessful() || !response.response.jwt) {
        return { valid: false, error: 'Invalid token' };
      }

      const jwt = response.response.jwt;
      return {
        valid: true,
        user: {
          id: jwt.sub,
          email: jwt.email,
          firstName: jwt.given_name,
          lastName: jwt.family_name,
          roles: jwt.roles,
        }
      };
    } catch (error) {
      console.error('FusionAuth validation error:', error);
      return { valid: false, error: 'Token validation failed' };
    }
  }

  async refreshToken(refreshToken: string) {
    // Implement refresh token logic
  }
}

export const fusionAuthService = new FusionAuthService();
export default FusionAuthService;
```

**Acceptance Criteria**:
- [ ] Service successfully validates tokens with FusionAuth
- [ ] Returns user information from JWT claims
- [ ] Handles errors gracefully (network, invalid token)
- [ ] Supports refresh token flow

---

### Phase 3: Database Schema Alignment

#### Task 3.1: Option A - Shared Database (Recommended)
**Approach**: Use the same PostgreSQL database as Platform API

**Changes**:
1. Update `packages/pax/.env`:
   ```bash
   # Use Platform API's database
   DATABASE_URL=postgresql://postgres:password@localhost:5432/veil_platform
   ```

2. Import user schema from Platform API:
   ```typescript
   // packages/pax/src/db/schema.ts
   export const users = pgTable('users', {
     id: serial('id').primaryKey(),
     uid: uuid('uid').defaultRandom().unique().notNull(),
     email: varchar('email').unique().notNull(),
     firstName: varchar('first_name').notNull(),
     lastName: varchar('last_name').notNull(),
     role: varchar('role').default('user').notNull(),
     fusionAuthId: varchar('fusion_auth_id').unique(),
     isActive: boolean('is_active').default(true).notNull(),
     emailVerified: boolean('email_verified').default(false).notNull(),
     createdAt: timestamp('created_at').defaultNow().notNull(),
     updatedAt: timestamp('updated_at').defaultNow().notNull(),
   });
   ```

#### Task 3.2: Option B - Separate Database with User Service (Alternative)
**Approach**: Keep separate databases, create user service to query Platform API

**Not recommended** due to added complexity and network latency.

**Decision**: Use Option A (Shared Database)

---

### Phase 4: Authentication Middleware Update

#### Task 4.1: Update JWT Payload Interface
**File**: `packages/pax/src/types/index.ts`

```typescript
export interface JWTPayload {
  userId: number;     // Local DB user ID
  uid: string;        // User UUID
  email: string;
  role: string;       // 'user', 'seller', 'admin'
  fusionAuthId?: string;
}

export interface AuthContext {
  user: {
    id: number;
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    fusionAuthId: string | null;
  };
}
```

#### Task 4.2: Rewrite Authentication Middleware
**File**: `packages/pax/src/middleware/auth.ts`

**New Implementation**:
```typescript
import { Elysia } from 'elysia';
import { fusionAuthService } from '../services/fusionauth-service';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

// Extract Bearer token from Authorization header
const extractBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

// Main authentication middleware
export const authMiddleware = new Elysia()
  .onBeforeHandle(async ({ headers, set, request, store }) => {
    const authHeader = headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      set.status = 401;
      return { success: false, error: 'Missing or invalid authorization header' };
    }

    // Validate token with FusionAuth
    const validationResult = await fusionAuthService.validateToken(token);

    if (!validationResult.valid || !validationResult.user) {
      set.status = 401;
      return { success: false, error: 'Invalid or expired token' };
    }

    // Get or create local user record
    let [localUser] = await db.select()
      .from(users)
      .where(eq(users.email, validationResult.user.email))
      .limit(1);

    if (!localUser) {
      // Create user record if doesn't exist (sync from FusionAuth)
      const [newUser] = await db.insert(users)
        .values({
          email: validationResult.user.email,
          firstName: validationResult.user.firstName || '',
          lastName: validationResult.user.lastName || '',
          role: validationResult.user.roles?.[0] || 'user',
          fusionAuthId: validationResult.user.id,
          emailVerified: true,
          isActive: true,
          password: '', // No local password for FusionAuth users
        })
        .returning();
      localUser = newUser;
    }

    // Check if user is active
    if (!localUser.isActive) {
      set.status = 401;
      return { success: false, error: 'Account is deactivated' };
    }

    // Store user in context
    store.user = localUser;
  })
  .derive(({ store, request }) => {
    return { user: store.user };
  });

// Role-based access control middleware
export const requireRole = (requiredRoles: string[]) => {
  return new Elysia()
    .use(authMiddleware)
    .onBeforeHandle(async ({ user, set }) => {
      if (!user || !requiredRoles.includes(user.role)) {
        set.status = 403;
        return { success: false, error: 'Insufficient permissions' };
      }
    });
};
```

**Acceptance Criteria**:
- [ ] Successfully validates FusionAuth tokens
- [ ] Queries local user from database
- [ ] Auto-creates user on first access (sync from FusionAuth)
- [ ] Checks `isActive` status
- [ ] Injects user context into route handlers
- [ ] Role-based middleware works correctly

---

### Phase 5: Route Updates

#### Task 5.1: Update Protected Routes
**Files to Update**:
- `packages/pax/src/routes/payments.ts`
- `packages/pax/src/routes/credits/accounts.ts`
- `packages/pax/src/routes/credits/transactions.ts`
- `packages/pax/src/routes/credits/purchases.ts`
- `packages/pax/src/routes/usage.ts`
- `packages/pax/src/routes/admin/**/*.ts`

**Example Change** (payments.ts):
```typescript
// Before
import { authMiddleware } from '../middleware/auth';

// After (no change needed, just ensure authMiddleware is updated)
import { authMiddleware, requireRole } from '../middleware/auth';

// Admin routes now use:
.use(requireRole(['admin']))
```

**Changes**:
- Verify all routes using `authMiddleware` work with updated middleware
- Update admin routes to use `requireRole(['admin'])`
- Ensure user context (`{ user }`) is correctly used in handlers

---

### Phase 6: Testing & Validation

#### Task 6.1: Unit Tests
**New File**: `packages/pax/tests/unit/fusionauth-service.test.ts`

Test cases:
- [ ] Valid token validation returns user data
- [ ] Invalid token returns error
- [ ] Expired token returns error
- [ ] Network error handling

#### Task 6.2: Integration Tests
**New File**: `packages/pax/tests/integration/auth-flow.test.ts`

Test cases:
- [ ] Login via Platform API, use token in PAX
- [ ] Protected route access with valid token
- [ ] Protected route rejection with invalid token
- [ ] Role-based access control
- [ ] User auto-creation on first access
- [ ] Inactive user rejection

#### Task 6.3: Manual Testing Checklist
- [ ] Start Platform API and PAX services
- [ ] Register user via Platform API
- [ ] Login via Platform API → get JWT token
- [ ] Use JWT token to access PAX `/api/v1/credits/account`
- [ ] Verify user record created in PAX database
- [ ] Test admin endpoints with admin role token
- [ ] Test token expiry and refresh flow
- [ ] Test cross-service token validity

---

## Database Migration Strategy

### Step 1: Backup Current Data
```bash
cd packages/pax
pg_dump -h localhost -U postgres -d pax > backup-pax-$(date +%Y%m%d).sql
```

### Step 2: Update Database Connection
```bash
# packages/pax/.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/veil_platform
```

### Step 3: Run Schema Migrations
```bash
cd packages/pax
bun run db:generate  # Generate migration files
bun run db:push      # Apply to veil_platform database
```

### Step 4: Data Migration (if needed)
If PAX has existing credit/payment data:
```sql
-- Migrate credit accounts to new user IDs
-- This requires mapping old users to new platform users
-- Manual script needed based on email matching
```

---

## Rollback Plan

If integration fails, rollback steps:

1. Revert PAX database connection:
   ```bash
   DATABASE_URL=postgresql://postgres:password@localhost:5432/pax
   ```

2. Restore auth middleware from git:
   ```bash
   git checkout HEAD -- packages/pax/src/middleware/auth.ts
   ```

3. Remove FusionAuth service:
   ```bash
   rm packages/pax/src/services/fusionauth-service.ts
   ```

4. Restore database from backup:
   ```bash
   psql -h localhost -U postgres -d pax < backup-pax-YYYYMMDD.sql
   ```

---

## Success Criteria

Integration is complete when:

- [ ] PAX accepts JWT tokens issued by Platform API
- [ ] User can authenticate once and access both services
- [ ] User records are shared between services
- [ ] Role-based access control works in PAX
- [ ] All existing PAX features work with new auth
- [ ] No breaking changes to existing Platform API
- [ ] Documentation updated
- [ ] All tests passing

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| FusionAuth service unavailable | High - No authentication | Add fallback JWT validation, health checks |
| Database migration data loss | High - Credit/payment data | Comprehensive backups, test migration on staging |
| Token format incompatibility | Medium - Auth failures | Thorough testing, gradual rollout |
| Performance degradation | Medium - Slower requests | Cache user lookups, optimize queries |
| Existing PAX users locked out | High - Service disruption | Migration script to link old accounts to FusionAuth |

---

## Timeline Estimate

- **Phase 1 (Config)**: 30 minutes
- **Phase 2 (FusionAuth Service)**: 1-2 hours
- **Phase 3 (Database)**: 1 hour
- **Phase 4 (Middleware)**: 2-3 hours
- **Phase 5 (Routes)**: 1 hour
- **Phase 6 (Testing)**: 2-3 hours

**Total**: 7.5-10.5 hours

---

## Checklist for Reviewer

Before starting implementation:

- [ ] Confirm FusionAuth is running and accessible
- [ ] Confirm Platform API database schema is finalized
- [ ] Decide on shared vs. separate database approach
- [ ] Review JWT payload structure compatibility
- [ ] Approve timeline and resource allocation
- [ ] Confirm rollback plan is acceptable
- [ ] Verify no breaking changes to existing PAX API contracts

---

## Next Steps After Approval

1. Create feature branch from `feat/razorpay`
2. Implement Phase 1 (Configuration)
3. Implement Phase 2 (FusionAuth Service)
4. Implement Phase 3 (Database alignment)
5. Implement Phase 4 (Middleware update)
6. Implement Phase 5 (Route updates)
7. Implement Phase 6 (Testing)
8. Update documentation
9. Create pull request for review

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Status**: Awaiting Approval
