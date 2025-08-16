import { Elysia, t } from 'elysia';
import { db, users } from '../db';
import { AuthUtils } from '../utils/auth';
import { registerSchema, loginSchema } from '../validation/schemas';
import { eq } from 'drizzle-orm';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/register', async ({ body, set }) => {
    try {
      const validatedData = registerSchema.parse(body);
      
      // Check if user already exists
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (existingUser.length > 0) {
        set.status = 409;
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(validatedData.password);

      // Create user
      const [newUser] = await db.insert(users).values({
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: validatedData.role,
      }).returning({
        id: users.id,
        uid: users.uid,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt,
      });

      // Generate JWT token
      const token = AuthUtils.generateToken({
        userId: newUser.id,
        uid: newUser.uid,
        email: newUser.email,
        role: newUser.role,
      });

      set.status = 201;
      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user: newUser,
          token,
        }
      };
    } catch (error: any) {
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
      lastName: t.String(),
      role: t.Optional(t.Union([t.Literal('buyer'), t.Literal('seller'), t.Literal('admin')]))
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Register a new user',
      description: 'Create a new user account with email, password, and role'
    }
  })
  .post('/login', async ({ body, set }) => {
    try {
      const validatedData = loginSchema.parse(body);

      // Find user by email
      const [user] = await db.select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        set.status = 401;
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }

      // Verify password
      const isPasswordValid = await AuthUtils.comparePassword(validatedData.password, user.password);

      if (!isPasswordValid) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Generate JWT token
      const token = AuthUtils.generateToken({
        userId: user.id,
        uid: user.uid,
        email: user.email,
        role: user.role,
      });

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            uid: user.uid,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            createdAt: user.createdAt,
          },
          token,
        }
      };
    } catch (error: any) {
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
      const payload = AuthUtils.verifyToken(token);

      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid or expired token'
        };
      }

      // Get fresh user data
      const [user] = await db.select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      }).from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user || !user.isActive) {
        set.status = 401;
        return {
          success: false,
          message: 'User not found or deactivated'
        };
      }

      return {
        success: true,
        message: 'Token is valid',
        data: { user }
      };
    } catch (error: any) {
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
  });