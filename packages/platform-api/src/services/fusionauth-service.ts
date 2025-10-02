import FusionAuthClient, {
  LoginRequest,
  RegistrationRequest,
  UserRequest,
  RefreshRequest,
  JWTRefreshRequest,
  ValidateResponse,
  LoginResponse,
  RegistrationResponse,
  RefreshResponse,
  User as FusionAuthUser
} from '@fusionauth/typescript-client';
import { config } from '../config';

export interface FusionAuthConfig {
  serverUrl: string;
  apiKey: string;
  applicationId: string;
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
}

export interface FusionAuthUserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  verified: boolean;
  roles: string[];
  registrations: any[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  user?: FusionAuthUserInfo;
  error?: string;
}

export class FusionAuthService {
  private client: FusionAuthClient;
  private readonly config: FusionAuthConfig;

  constructor(fusionAuthConfig?: Partial<FusionAuthConfig>) {
    this.config = {
      serverUrl: fusionAuthConfig?.serverUrl || config.fusionAuth.serverUrl,
      apiKey: fusionAuthConfig?.apiKey || config.fusionAuth.apiKey,
      applicationId: fusionAuthConfig?.applicationId || config.fusionAuth.applicationId,
      clientId: fusionAuthConfig?.clientId || config.fusionAuth.clientId,
      clientSecret: fusionAuthConfig?.clientSecret || config.fusionAuth.clientSecret,
      tenantId: fusionAuthConfig?.tenantId || config.fusionAuth.tenantId,
      redirectUri: fusionAuthConfig?.redirectUri || config.fusionAuth.redirectUri,
    };

    this.client = new FusionAuthClient(this.config.apiKey, this.config.serverUrl, this.config.tenantId);
  }

  /**
   * Register a new user in FusionAuth
   */
  async register(userData: RegisterUserData): Promise<{ success: boolean; user?: FusionAuthUserInfo; error?: string }> {
    try {
      const request: RegistrationRequest = {
        user: {
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          active: true,
          verified: false,
        },
        registration: {
          applicationId: this.config.applicationId,
          roles: userData.role ? [userData.role] : ['buyer'], // Default to buyer role
        },
        sendSetPasswordEmail: false,
        skipRegistrationVerification: true,
      };

      const response = await this.client.register(null, request);

      console.log('FusionAuth registration response:', JSON.stringify(response, null, 2));

      if (response.wasSuccessful() && response.response?.user) {
        const user = this.mapFusionAuthUser(response.response.user, response.response.registration);
        return { success: true, user };
      } else {
        console.error('FusionAuth registration failed - response structure:', {
          statusCode: response.statusCode,
          wasSuccessful: response.wasSuccessful(),
          hasResponse: !!response.response,
          responseKeys: response.response ? Object.keys(response.response) : [],
          errorResponse: response.errorResponse
        });
        return {
          success: false,
          error: response.errorResponse?.fieldErrors ?
            Object.values(response.errorResponse.fieldErrors).flat().join(', ') :
            response.errorResponse?.generalErrors?.[0]?.message ||
            'Registration failed'
        };
      }
    } catch (error: any) {
      console.error('FusionAuth registration error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<{ success: boolean; tokens?: { accessToken: string; refreshToken: string }; user?: FusionAuthUserInfo; error?: string }> {
    try {
      const request: LoginRequest = {
        loginId: credentials.email,
        password: credentials.password,
        applicationId: this.config.applicationId,
      };

      const response = await this.client.login(request);

      if (response.wasSuccessful() && response.response.token && response.response.user) {
        const user = this.mapFusionAuthUser(response.response.user);
        return {
          success: true,
          tokens: {
            accessToken: response.response.token,
            refreshToken: response.response.refreshToken || '',
          },
          user,
        };
      } else {
        return {
          success: false,
          error: response.errorResponse?.fieldErrors ?
            Object.values(response.errorResponse.fieldErrors).flat().join(', ') :
            'Invalid credentials'
        };
      }
    } catch (error: any) {
      console.error('FusionAuth login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      console.log('FusionAuth validateToken - token length:', token.length);
      console.log('FusionAuth validateToken - token prefix:', token.substring(0, 50) + '...');

      const response = await this.client.validateJWT(token);

      console.log('FusionAuth validateToken - response.wasSuccessful():', response.wasSuccessful());
      console.log('FusionAuth validateToken - response.statusCode:', response.statusCode);

      if (!response.wasSuccessful()) {
        console.log('FusionAuth validateToken - error response:', response.errorResponse);
        console.log('FusionAuth validateToken - error details:', JSON.stringify(response, null, 2));
        console.log('FusionAuth validateToken - config check:', {
          serverUrl: this.config.serverUrl,
          tenantId: this.config.tenantId,
          applicationId: this.config.applicationId
        });
      }

      if (response.wasSuccessful() && response.response.jwt) {
        // Get user info from the JWT claims
        const jwt = response.response.jwt;

        // Fetch full user details if we have the user ID
        if (jwt.sub) {
          const userResponse = await this.client.retrieveUser(jwt.sub);
          if (userResponse.wasSuccessful() && userResponse.response.user) {
            const user = this.mapFusionAuthUser(userResponse.response.user);
            return { valid: true, user };
          }
        }

        // Fallback to JWT claims only
        const user: FusionAuthUserInfo = {
          id: jwt.sub || '',
          email: jwt.email || '',
          firstName: jwt.given_name || '',
          lastName: jwt.family_name || '',
          active: true,
          verified: jwt.email_verified || false,
          roles: jwt.roles || [],
          registrations: [],
        };

        return { valid: true, user };
      } else {
        return { valid: false, error: 'Invalid token' };
      }
    } catch (error: any) {
      console.error('FusionAuth token validation error:', error);
      return { valid: false, error: error.message || 'Token validation failed' };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ success: boolean; tokens?: { accessToken: string; refreshToken: string }; error?: string }> {
    try {
      const request: JWTRefreshRequest = {
        refreshToken,
      };

      const response = await this.client.exchangeRefreshTokenForJWT(request);

      if (response.wasSuccessful() && response.response.token) {
        return {
          success: true,
          tokens: {
            accessToken: response.response.token,
            refreshToken: response.response.refreshToken || refreshToken,
          },
        };
      } else {
        return { success: false, error: 'Token refresh failed' };
      }
    } catch (error: any) {
      console.error('FusionAuth token refresh error:', error);
      return { success: false, error: error.message || 'Token refresh failed' };
    }
  }

  /**
   * Logout user (revoke tokens)
   */
  async logout(refreshToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.client.revokeRefreshToken(refreshToken);

      if (response.wasSuccessful()) {
        return { success: true };
      } else {
        return { success: false, error: 'Logout failed' };
      }
    } catch (error: any) {
      console.error('FusionAuth logout error:', error);
      return { success: false, error: error.message || 'Logout failed' };
    }
  }

  /**
   * Get user information by ID
   */
  async getUserInfo(userId: string): Promise<{ success: boolean; user?: FusionAuthUserInfo; error?: string }> {
    try {
      const response = await this.client.retrieveUser(userId);

      if (response.wasSuccessful() && response.response.user) {
        const user = this.mapFusionAuthUser(response.response.user);
        return { success: true, user };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error: any) {
      console.error('FusionAuth get user info error:', error);
      return { success: false, error: error.message || 'Failed to get user info' };
    }
  }

  /**
   * Generate OAuth2 authorization URL
   */
  generateAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: 'openid email profile',
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.config.serverUrl}/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, state?: string): Promise<{ success: boolean; tokens?: { accessToken: string; refreshToken: string }; user?: FusionAuthUserInfo; error?: string }> {
    try {
      // Use the OAuth2 client credentials flow
      const response = await fetch(`${this.config.serverUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
        }).toString(),
      });

      if (response.ok) {
        const tokenData = await response.json();

        // Validate the access token to get user info
        const validationResult = await this.validateToken(tokenData.access_token);

        if (validationResult.valid && validationResult.user) {
          return {
            success: true,
            tokens: {
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
            },
            user: validationResult.user,
          };
        } else {
          return { success: false, error: 'Failed to validate token' };
        }
      } else {
        const error = await response.text();
        return { success: false, error: `Token exchange failed: ${error}` };
      }
    } catch (error: any) {
      console.error('FusionAuth code exchange error:', error);
      return { success: false, error: error.message || 'Code exchange failed' };
    }
  }

  /**
   * Map FusionAuth user to our user interface
   */
  private mapFusionAuthUser(fusionAuthUser: FusionAuthUser, registration?: any): FusionAuthUserInfo {
    const roles: string[] = [];

    // Extract roles from registrations
    if (fusionAuthUser.registrations) {
      for (const reg of fusionAuthUser.registrations) {
        if (reg.applicationId === this.config.applicationId && reg.roles) {
          roles.push(...reg.roles);
        }
      }
    }

    // Extract roles from registration parameter if provided
    if (registration && registration.roles) {
      roles.push(...registration.roles);
    }

    return {
      id: fusionAuthUser.id || '',
      email: fusionAuthUser.email || '',
      firstName: fusionAuthUser.firstName || '',
      lastName: fusionAuthUser.lastName || '',
      active: fusionAuthUser.active || false,
      verified: fusionAuthUser.verified || false,
      roles: [...new Set(roles)], // Remove duplicates
      registrations: fusionAuthUser.registrations || [],
    };
  }
}

// Export singleton instance
export const fusionAuthService = new FusionAuthService();