# FusionAuth Setup Guide for Veil Platform

This guide explains how to set up FusionAuth for authentication in the Veil platform.

## Prerequisites

- FusionAuth server running (local or deployed)
- Access to FusionAuth admin panel

## Setup Steps

### 1. Install and Start FusionAuth

**Using Docker:**
```bash
docker run -d -p 9011:9011 fusionauth/fusionauth-app:latest
```

**Or download from:** https://fusionauth.io/download

### 2. Initial FusionAuth Configuration

1. Open FusionAuth at `http://localhost:9011`
2. Complete the setup wizard
3. Create an admin account

### 3. Create an Application

1. Navigate to **Applications** in the left sidebar
2. Click the **+** button to add a new application
3. Configure the application:
   - **Name**: Veil Platform
   - **OAuth Configuration**:
     - Authorized redirect URLs: `http://localhost:3001/auth/callback` (for local dev)
     - Logout URL: `http://localhost:3001`
     - Enabled grants: `Authorization Code`, `Refresh Token`
   - **JWT Configuration**:
     - Enable JWT
     - JWT duration: 3600 seconds (1 hour)
     - Refresh token duration: 2592000 seconds (30 days)

4. Save the application and note down:
   - Application ID
   - Client ID
   - Client Secret

### 4. Create API Key

1. Navigate to **Settings** → **API Keys**
2. Click **+** to create a new API key
3. Give it a description (e.g., "Veil Platform API")
4. Save and copy the API key (you won't see it again!)

### 5. Get Tenant ID

1. Navigate to **Tenants** in the left sidebar
2. Click on "Default" tenant
3. Copy the Tenant ID from the URL or tenant details

### 6. Configure Roles (Optional)

1. In your application settings, go to the **Roles** tab
2. Add roles:
   - `user` (default role)
   - `seller`
   - `admin`

### 7. Update Environment Variables

Update your `.env` file in `packages/platform-api`:

```env
# FusionAuth Configuration
FUSIONAUTH_SERVER_URL=http://localhost:9011
FUSIONAUTH_API_KEY=<your-api-key>
FUSIONAUTH_APPLICATION_ID=<your-application-id>
FUSIONAUTH_CLIENT_ID=<your-client-id>
FUSIONAUTH_CLIENT_SECRET=<your-client-secret>
FUSIONAUTH_TENANT_ID=<your-tenant-id>
FUSIONAUTH_REDIRECT_URI=http://localhost:3001/auth/callback
```

### 8. For Production Deployment

When deploying to production, update these values:

```env
FUSIONAUTH_SERVER_URL=https://your-fusionauth-instance.com
FUSIONAUTH_REDIRECT_URI=https://your-frontend-domain.com/auth/callback
```

## Testing Authentication

### 1. Start the Platform API

```bash
cd packages/platform-api
bun run dev
```

### 2. Start the Web Frontend

```bash
cd packages/web
npm run dev
```

### 3. Test Registration

1. Go to `http://localhost:3001/signup`
2. Fill in the registration form
3. Check FusionAuth admin panel to see the new user

### 4. Test Login

1. Go to `http://localhost:3001/login`
2. Login with your credentials
3. You should receive a JWT token stored in localStorage

## Troubleshooting

### Issue: "Invalid credentials" error

**Solution:**
- Check that FUSIONAUTH_APPLICATION_ID matches your application
- Verify the user is registered in FusionAuth
- Check FusionAuth logs for detailed error messages

### Issue: "Token validation failed"

**Solution:**
- Ensure JWT is enabled in your FusionAuth application
- Verify FUSIONAUTH_TENANT_ID is correct
- Check that the token hasn't expired

### Issue: "FusionAuth connection refused"

**Solution:**
- Verify FusionAuth is running: `curl http://localhost:9011/api/status`
- Check FUSIONAUTH_SERVER_URL is correct
- Ensure no firewall is blocking the connection

## API Endpoints

The platform-api provides these FusionAuth-integrated endpoints:

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/verify-token` - Verify JWT token
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Logout and revoke tokens

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│  Web Client │────────>│  Platform API    │────────>│  FusionAuth  │
│             │         │                  │         │              │
│  (Next.js)  │<────────│  (Elysia/Bun)   │<────────│  (Auth)      │
└─────────────┘         └──────────────────┘         └──────────────┘
      │                           │
      │                           │
      v                           v
  localStorage              PostgreSQL
  - auth_token             - User data
  - refresh_token          - Subscriptions
                           - API keys
```

## Security Notes

1. **Never commit** actual API keys or secrets to version control
2. **Use HTTPS** in production for all FusionAuth communication
3. **Rotate API keys** periodically
4. **Enable 2FA** for FusionAuth admin accounts in production
5. **Set appropriate token expiration** times based on your security requirements

## Additional Resources

- [FusionAuth Documentation](https://fusionauth.io/docs)
- [FusionAuth TypeScript Client](https://github.com/FusionAuth/fusionauth-typescript-client)
- [JWT Best Practices](https://fusionauth.io/learn/expert-advice/tokens/jwt-best-practices)
