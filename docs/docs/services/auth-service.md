# AuthService (FusionAuth)

The AuthService is implemented using FusionAuth and handles all authentication and user management for the Veil platform. It provides JWT tokens for authenticated users and maintains user roles and permissions.

## Responsibilities

- User registration and authentication
- Role-based access control
- JWT token issuance and validation
- User profile management
- Session management
- OAuth2/OIDC support

## Authentication Flow

1. User registers or logs in through the FusionAuth interface
2. User receives a JWT token with appropriate claims (including role)
3. User includes this token in API requests to BFF services
4. BFF services validate the token using JWKS URL
5. Services extract user ID and role for authorization decisions

## JWT Token Structure

```json
{
  "sub": "user-id",
  "iss": "fusionauth-instance",
  "aud": "veil-platform",
  "exp": 1644155042,
  "iat": 1644151442,
  "auth_time": 1644151442,
  "roles": ["Consumer", "Provider", "Admin"],
  "email": "user@example.com",
  "email_verified": true,
  "name": "User Name",
  "preferred_username": "username"
}
```

## User Roles

The AuthService manages the following roles:

1. **Consumer**: Users who subscribe to and consume APIs
2. **Provider**: Users who provide and manage APIs
3. **Admin**: Platform administrators with elevated privileges

## Integration Points

### JWKS URL

Services should use the JWKS URL to validate JWT tokens:

```
https://[fusionauth-domain]/.well-known/jwks.json
```

### OAuth2 Endpoints

- Authorization: `https://[fusionauth-domain]/oauth2/authorize`
- Token: `https://[fusionauth-domain]/oauth2/token`
- User Info: `https://[fusionauth-domain]/oauth2/userinfo`
- Logout: `https://[fusionauth-domain]/oauth2/logout`

## Configuration

The FusionAuth instance should be configured with:

1. Custom JWT claims for roles and permissions
2. Appropriate token lifetimes
3. Secure password policies
4. Multi-factor authentication for admin accounts
5. Email verification for user sign-up

## Implementation Notes

- Each service should independently verify JWT tokens
- Consider token renewal strategies for long-lived sessions
- Implement proper error handling for authentication failures
- Configure appropriate CORS settings for web clients
- Maintain a secure connection between services and FusionAuth
- Implement regular security audits and updates
- Configure proper rate limiting for authentication endpoints

## User Management

The FusionAuth admin interface provides capabilities for:

- Creating/modifying users
- Assigning roles and permissions
- Resetting passwords
- Monitoring authentication activities
- Configuring authentication policies

## References

- [FusionAuth Documentation](https://fusionauth.io/docs/)
- [JWT Specification](https://datatracker.ietf.org/doc/html/rfc7519)
- [OAuth 2.0 Specification](https://datatracker.ietf.org/doc/html/rfc6749)
