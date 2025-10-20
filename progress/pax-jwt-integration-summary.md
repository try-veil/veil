# PAX-Platform API JWT Integration - Key Findings

**Date**: 2025-10-18
**Status**: Ready for implementation

## Executive Summary

After reviewing the latest code, I've updated the integration plan. Here are the key findings:

### ✅ Good News - Platform API Already Has Everything
The Platform API has a **complete, production-ready FusionAuth integration** that we can copy directly to PAX:
- Full FusionAuth service implementation (`fusionauth-service.ts` - 384 lines)
- Working authentication middleware
- Auto-user creation from FusionAuth tokens
- Role-based access control
- Token refresh support

### ❌ Critical Issues in PAX Module

1. **NO Users Table** - PAX schema references `userId` everywhere but has NO users table defined!
   - `paymentTransactions.userId`
   - `creditAccounts.userId`
   - `usageRecords.userId`

2. **Separate Database** - PAX uses `pax` database, Platform API uses `veil_platform`

3. **No FusionAuth Integration** - PAX uses standalone JWT with local secret

## Implementation Strategy (Simplified)

Instead of building from scratch, we'll **copy from Platform API**:

### Phase 1: Copy & Configure (30 min)
1. Install `@fusionauth/typescript-client` in PAX
2. Copy FusionAuth config from platform-api to PAX config
3. Copy environment variables (use SAME credentials!)

### Phase 2: Copy Service (15 min)
1. Copy `fusionauth-service.ts` from platform-api to PAX
2. No changes needed - works as-is!

### Phase 3: Fix Database (1 hour)  ⚠️ CRITICAL
1. Add users table to PAX schema (copy from platform-api schema)
2. **Change PAX database to `veil_platform`** (shared database)
3. Run `bun run db:push`

### Phase 4: Copy Middleware (1 hour)
1. Copy auth middleware pattern from platform-api
2. Replace PAX's JWT middleware with FusionAuth-based middleware
3. Test with platform-api token

### Phase 5: Test (1 hour)
1. Login via platform-api → get JWT
2. Use JWT in PAX endpoints
3. Verify user auto-creation
4. Test role-based access

**Total Time**: ~3.5 hours (much faster than original estimate!)

## Key Files to Copy

| From (platform-api) | To (PAX) | Changes Needed |
|---------------------|----------|----------------|
| `services/fusionauth-service.ts` | `services/fusionauth-service.ts` | None (direct copy) |
| `middleware/auth.ts` (pattern) | `middleware/auth.ts` | Replace existing |
| `config/index.ts` (fusionAuth section) | `config/index.ts` | Add section |
| `.env` (FusionAuth vars) | `.env` | Copy values |

## Database Migration Plan

```bash
# 1. Backup PAX database (if has data)
pg_dump -h localhost -U postgres -d pax > backup-pax.sql

# 2. Update PAX .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/veil_platform

# 3. Add users table to PAX schema
# (manually add the users table definition)

# 4. Push schema
cd packages/pax
bun run db:push

# 5. If PAX had existing users, migrate them:
# (manual script to link old user data to platform-api users by email)
```

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Data loss during migration | Full backup before starting |
| Existing PAX data references invalid userIds | Migration script to map users by email |
| Schema conflicts (users table) | users table already exists in veil_platform from platform-api |
| Breaking existing PAX functionality | Keep old middleware as backup, gradual rollout |

## Next Steps

**Before starting - Get approval on**:
1. ✅ Shared database approach (both services use `veil_platform`)
2. ✅ Using same FusionAuth credentials
3. ✅ Copying implementation from platform-api
4. ⚠️ Data migration strategy (if PAX has existing data)

**Ready to implement?** See detailed plan in `./integrate-pax-jwt.md`
