# PLAN.md - Grafana Dynamic Folder Management Implementation

## Overview
Implement automated folder creation system with:
1. **Common Folder**: Static provisioning for all users (already 80% complete)
2. **Private User Folders**: Dynamic creation via FusionAuth webhooks + Grafana API

## Phase 1: Complete Common Folder Setup (15 minutes)

### 1.1 Fix Grafana Provisioning Configuration
- Update `docker-compose.yml` to mount provisioning files
- Add environment variable for provisioning path
- Mount common dashboards directory

### 1.2 Test Common Folder
- Restart services and verify "Common" folder appears
- Ensure all users can see it (Viewer role default)

## Phase 2: Webhook Service for Private Folders (45 minutes)

### 2.1 Create Lightweight Node.js Webhook Service
- **File**: `webhook-service/index.js`
- **Framework**: Express.js (minimal, no over-engineering)
- **Purpose**: Listen for FusionAuth user registration events
- **Key Features**:
  - Single endpoint: `POST /webhook/user-registered`
  - Grafana API integration for folder creation
  - User permission management

### 2.2 Service Dependencies
- **File**: `webhook-service/package.json`
- **Dependencies**: express, axios (for API calls)
- **Configuration**: Environment variables for secrets

### 2.3 Grafana API Integration
- Create service account in Grafana (manual step)
- Generate API token for webhook service
- Implement folder creation logic
- Implement permission setting logic

## Phase 3: Docker Integration (15 minutes)

### 3.1 Add Webhook Service to docker-compose.yml
- New service definition
- Network connectivity to Grafana
- Environment configuration
- Port exposure for FusionAuth webhooks

### 3.2 Environment Configuration
- Add `.env` file for sensitive configuration
- Grafana API endpoint and token
- FusionAuth webhook security

## Phase 4: FusionAuth Webhook Configuration (10 minutes)

### 4.1 Configure Webhook in FusionAuth
- Add webhook endpoint in FusionAuth admin
- Target: `user.registration.create` event
- URL: webhook service endpoint
- Security configuration

## Phase 5: Testing & Verification (15 minutes)

### 5.1 End-to-End Testing
- Register new test user
- Verify private folder creation
- Verify folder permissions
- Test common folder visibility

### 5.2 Cleanup Test Data
- Remove test users/folders
- Document manual cleanup process

## Implementation Notes

### No Over-Engineering Principles Applied:
- **Single-purpose webhook service** (not a complex microservice)
- **Direct API calls** (no queue/message system)
- **Environment-based config** (no complex config management)
- **Minimal dependencies** (express + axios only)
- **Synchronous processing** (webhooks are fast enough)
- **File-based provisioning** for static content (built-in Grafana feature)

### Security Considerations:
- Grafana service account with minimal required permissions
- Webhook endpoint validation
- Environment-based secrets management
- No hardcoded credentials

### File Structure:
```
grafan-poc/
├── PLAN.md (this file)
├── docker-compose.yml (updated with init container)
├── .env.template (optional now)
├── provisioning/
│   ├── dashboards/common-folder.yml (exists)
│   └── access-control/service-accounts.yml (removed - not needed)
├── dashboards/common/ (exists)
├── scripts/
│   ├── init-grafana.sh (new - auto token creation)
│   └── Dockerfile (new - init container)
└── webhook-service/
    ├── index.js (updated - reads token from shared volume)
    ├── package.json (new)
    └── Dockerfile (new)
```

## Fully Automated Setup - No Manual Steps Required!

### Step 1: Start All Services
```bash
docker-compose up -d
```

**That's it!** The system will automatically:
1. ✅ Start Grafana with provisioned "Common" folder
2. ✅ Create service account "folder-provisioner" with Admin role
3. ✅ Generate API token and save to shared volume
4. ✅ Start webhook service with auto-loaded token
5. ✅ All services ready for FusionAuth webhook integration

### Step 2: Configure FusionAuth Webhook (One-time setup)
1. Access FusionAuth at http://localhost:9011
2. Login with admin credentials
3. Go to Settings → Webhooks
4. Click "Add" webhook
5. Configure:
   - URL: `http://webhook-service:3001/webhook/user-registered`
   - Events: Select "user.registration.create"
   - Applications: Select your Grafana application
6. Save the webhook

### Step 3: Test the Implementation
1. Register a new user through Grafana's OAuth flow
2. Check Grafana for:
   - "Common" folder visible to all users
   - Private folder named after the new user (e.g., "john.doe@example.com's Dashboards")
   - Proper permissions on the private folder

## Troubleshooting

### Common Issues:
1. **Common folder not appearing**: Check provisioning mount points in docker-compose.yml
2. **Private folders not created**: Check webhook service logs and Grafana API token
3. **Permission errors**: Ensure service account has Admin role in Grafana
4. **Webhook not triggered**: Verify FusionAuth webhook configuration and network connectivity

### Debug Commands:
```bash
# Check webhook service logs
docker-compose logs webhook-service

# Check Grafana logs
docker-compose logs grafana

# Test webhook service manually
curl -X POST http://localhost:3001/webhook/user-registered \
  -H "Content-Type: application/json" \
  -d '{"event":{"user":{"email":"test@example.com"}}}'
```

**Total Estimated Time**: ~1.5 hours
**Risk Level**: Low (incremental changes, easy to rollback)
**Dependencies**: None (all components independent)