import { Elysia } from 'elysia';
import { fusionAuthService } from '../services/fusionauth-service';
import { db, users } from '../db';
import { eq } from 'drizzle-orm';

export interface AuthContext {
  user: {
    id: number;
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    fusionAuthId: string;
  };
}

// Helper function to extract Bearer token
function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// Helper function to get user from FusionAuth token
async function getUserFromHeaders(headers: any): Promise<AuthContext['user']> {
  const token = extractBearerToken(headers.authorization);

  if (!token) {
    throw new Error('No token provided');
  }

  // Validate token with FusionAuth
  const validationResult = await fusionAuthService.validateToken(token);

  if (!validationResult.valid || !validationResult.user) {
    throw new Error('Invalid or expired token');
  }

  const fusionAuthUser = validationResult.user;

  // Get local user data by FusionAuth ID or email
  let [localUser] = await db.select({
    id: users.id,
    uid: users.uid,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
    isActive: users.isActive,
    fusionAuthId: users.fusionAuthId,
  }).from(users)
    .where(eq(users.email, fusionAuthUser.email))
    .limit(1);

  // If user doesn't exist locally, create them
  if (!localUser) {
    const [newUser] = await db.insert(users).values({
      email: fusionAuthUser.email,
      firstName: fusionAuthUser.firstName,
      lastName: fusionAuthUser.lastName,
      role: fusionAuthUser.roles[0] || 'buyer', // Use first role or default to buyer
      fusionAuthId: fusionAuthUser.id,
      isActive: true,
      password: '', // Empty password since auth is handled by FusionAuth
    }).returning({
      id: users.id,
      uid: users.uid,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      fusionAuthId: users.fusionAuthId,
    });

    localUser = newUser;
  } else {
    // Update FusionAuth ID if it's missing
    if (!localUser.fusionAuthId) {
      await db.update(users)
        .set({ fusionAuthId: fusionAuthUser.id })
        .where(eq(users.id, localUser.id));

      localUser.fusionAuthId = fusionAuthUser.id;
    }
  }

  if (!localUser.isActive) {
    throw new Error('User account is deactivated');
  }

  return localUser;
}

console.log('🔐 Auth middleware initialized and ready');

export const authMiddleware = new Elysia()
  .derive(async ({ headers, set, request }) => {
    try {
      console.log('🔐 Auth middleware EXECUTING for:', request.method, request.url);
      console.log('Auth middleware - headers.authorization:', headers.authorization ? 'Present' : 'Missing');
      if (headers.authorization) {
        console.log('Auth middleware - token preview:', headers.authorization.substring(0, 30) + '...');
      }

      const user = await getUserFromHeaders(headers);
      console.log('Auth middleware - user found:', user ? `id: ${user.id}, email: ${user.email}` : 'null');

      if (!user) {
        console.log('Auth middleware - user is null/undefined');
        set.status = 401;
        throw new Error('User not found');
      }

      return { user };
    } catch (error: any) {
      console.log('Auth middleware - error:', error.message);
      console.log('Auth middleware - error details:', error);
      set.status = 401;
      throw new Error(error.message || 'Authentication failed');
    }
  });

export const requireRole = (requiredRoles: string[]) => {
  return new Elysia()
    .derive(async ({ headers, set }) => {
      try {
        const user = await getUserFromHeaders(headers);

        if (!requiredRoles.includes(user.role)) {
          set.status = 403;
          throw new Error('Insufficient permissions');
        }

        return { user };
      } catch (error: any) {
        console.log('Role requirement middleware - error:', error.message);
        if (error.message === 'Insufficient permissions') {
          set.status = 403;
        } else {
          set.status = 401;
        }
        throw error;
      }
    });
};