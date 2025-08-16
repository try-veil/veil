import { Elysia } from 'elysia';
import { AuthUtils, extractBearerToken, JWTPayload } from '../utils/auth';
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
  };
}

// Helper function to get user from token
async function getUserFromHeaders(headers: any): Promise<AuthContext['user']> {
  const token = extractBearerToken(headers.authorization);
  
  if (!token) {
    throw new Error('No token provided');
  }

  const payload = AuthUtils.verifyToken(token);
  if (!payload) {
    throw new Error('Invalid or expired token');
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
  }).from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user || !user.isActive) {
    throw new Error('User not found or deactivated');
  }

  return user;
}

export const authMiddleware = new Elysia()
  .derive(async ({ headers, set }) => {
    try {
      const user = await getUserFromHeaders(headers);
      return { user };
    } catch (error: any) {
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
        if (error.message === 'Insufficient permissions') {
          set.status = 403;
        } else {
          set.status = 401;
        }
        throw error;
      }
    });
};