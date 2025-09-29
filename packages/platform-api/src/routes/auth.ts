import { Elysia, t } from 'elysia';
import { db, users } from '../db';
import { fusionAuthService } from '../services/fusionauth-service';
import { registerSchema, loginSchema } from '../validation/schemas';
import { eq } from 'drizzle-orm';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/register', async ({ body, set }) => {
    try {
      const validatedData = registerSchema.parse(body);

      // Check if user already exists locally
      const existingLocalUser = await db.select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (existingLocalUser.length > 0) {
        set.status = 409;
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Register user in FusionAuth
      const fusionAuthResult = await fusionAuthService.register({
        email: validatedData.email,
        password: validatedData.password,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: 'buyer',
      });

      if (!fusionAuthResult.success) {
        set.status = 400;
        return {
          success: false,
          message: fusionAuthResult.error || 'Registration failed'
        };
      }

      // Create local user record
      const [newUser] = await db.insert(users).values({
        email: validatedData.email,
        password: '', // Empty password since auth is handled by FusionAuth
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: 'buyer',
        fusionAuthId: fusionAuthResult.user!.id,
        isActive: true,
      }).returning({
        id: users.id,
        uid: users.uid,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt,
      });

      // Login user to get tokens
      const loginResult = await fusionAuthService.login({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (!loginResult.success) {
        set.status = 500;
        return {
          success: false,
          message: 'Registration succeeded but login failed. Please try logging in.'
        };
      }

      set.status = 201;
      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user: newUser,
          token: loginResult.tokens!.accessToken,
          refreshToken: loginResult.tokens!.refreshToken,
        }
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Registration failed',
        errors: error.errors || undefined
      };
    }
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
      firstName: t.String(),
      lastName: t.String()
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Register a new user',
      description: 'Create a new user account with email and password'
    }
  })
  .post('/login', async ({ body, set }) => {
    try {
      const validatedData = loginSchema.parse(body);

      // Authenticate with FusionAuth
      const loginResult = await fusionAuthService.login({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (!loginResult.success) {
        set.status = 401;
        return {
          success: false,
          message: loginResult.error || 'Invalid email or password'
        };
      }

      // Get or create local user record
      let [localUser] = await db.select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (!localUser) {
        // Create local user if it doesn't exist (for existing FusionAuth users)
        const fusionAuthUser = loginResult.user!;
        const [newUser] = await db.insert(users).values({
          email: fusionAuthUser.email,
          password: '', // Empty password since auth is handled by FusionAuth
          firstName: fusionAuthUser.firstName,
          lastName: fusionAuthUser.lastName,
          role: fusionAuthUser.roles[0] || 'buyer',
          fusionAuthId: fusionAuthUser.id,
          isActive: true,
        }).returning();

        localUser = newUser;
      } else {
        // Update FusionAuth ID if it's missing
        if (!localUser.fusionAuthId) {
          await db.update(users)
            .set({ fusionAuthId: loginResult.user!.id })
            .where(eq(users.id, localUser.id));
        }
      }

      // Check if local user is active
      if (!localUser.isActive) {
        set.status = 401;
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: localUser.id,
            uid: localUser.uid,
            email: localUser.email,
            firstName: localUser.firstName,
            lastName: localUser.lastName,
            role: localUser.role,
            createdAt: localUser.createdAt,
          },
          token: loginResult.tokens!.accessToken,
          refreshToken: loginResult.tokens!.refreshToken,
        }
      };
    } catch (error: any) {
      console.error('Login error:', error);
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Login failed',
        errors: error.errors || undefined
      };
    }
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Login user',
      description: 'Authenticate user with email and password, returns JWT token'
    }
  })
  .post('/verify-token', async ({ headers, set }) => {
    try {
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 401;
        return {
          success: false,
          message: 'No token provided'
        };
      }

      const token = authHeader.substring(7);

      // Validate token with FusionAuth
      const validationResult = await fusionAuthService.validateToken(token);

      if (!validationResult.valid || !validationResult.user) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid or expired token'
        };
      }

      const fusionAuthUser = validationResult.user;

      // Get local user data
      const [localUser] = await db.select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      }).from(users)
        .where(eq(users.email, fusionAuthUser.email))
        .limit(1);

      if (!localUser || !localUser.isActive) {
        set.status = 401;
        return {
          success: false,
          message: 'User not found or deactivated'
        };
      }

      return {
        success: true,
        message: 'Token is valid',
        data: { user: localUser }
      };
    } catch (error: any) {
      console.error('Token verification error:', error);
      set.status = 401;
      return {
        success: false,
        message: 'Token verification failed'
      };
    }
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'Verify JWT token',
      description: 'Verify the validity of a JWT token and return user information'
    }
  })
  .post('/refresh-token', async ({ body, set }) => {
    try {
      const { refreshToken } = body as { refreshToken: string };

      if (!refreshToken) {
        set.status = 400;
        return {
          success: false,
          message: 'Refresh token is required'
        };
      }

      // Refresh token with FusionAuth
      const refreshResult = await fusionAuthService.refreshToken(refreshToken);

      if (!refreshResult.success) {
        set.status = 401;
        return {
          success: false,
          message: refreshResult.error || 'Token refresh failed'
        };
      }

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: refreshResult.tokens!.accessToken,
          refreshToken: refreshResult.tokens!.refreshToken,
        }
      };
    } catch (error: any) {
      console.error('Token refresh error:', error);
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Token refresh failed'
      };
    }
  }, {
    body: t.Object({
      refreshToken: t.String()
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      description: 'Refresh an expired access token using a refresh token'
    }
  })
  .post('/logout', async ({ body, set }) => {
    try {
      const { refreshToken } = body as { refreshToken: string };

      if (!refreshToken) {
        set.status = 400;
        return {
          success: false,
          message: 'Refresh token is required'
        };
      }

      // Logout (revoke tokens) with FusionAuth
      const logoutResult = await fusionAuthService.logout(refreshToken);

      if (!logoutResult.success) {
        // Even if logout fails, we'll return success to the client
        console.warn('FusionAuth logout failed:', logoutResult.error);
      }

      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error: any) {
      console.error('Logout error:', error);
      // Return success even on error to avoid leaking token state
      return {
        success: true,
        message: 'Logout successful'
      };
    }
  }, {
    body: t.Object({
      refreshToken: t.String()
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Logout user',
      description: 'Logout user and revoke refresh token'
    }
  });