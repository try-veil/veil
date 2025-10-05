import { Elysia } from 'elysia';
import { bearer } from '@elysiajs/bearer';
import { jwt } from '@elysiajs/jwt';
import { config } from '../config';

export const authMiddleware = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: config.jwt.secret,
    })
  )
  .use(bearer())
  .derive(async ({ bearer, jwt, set }) => {
    if (!bearer) {
      set.status = 401;
      throw new Error('Missing authorization token');
    }

    const payload = await jwt.verify(bearer);
    if (!payload) {
      set.status = 401;
      throw new Error('Invalid or expired token');
    }

    return {
      user: payload as { id: number; userId?: number; email: string; role?: string },
    };
  });

export const optionalAuth = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: config.jwt.secret,
    })
  )
  .use(bearer())
  .derive(async ({ bearer, jwt }) => {
    if (!bearer) {
      return { user: null };
    }

    const payload = await jwt.verify(bearer);
    if (!payload) {
      return { user: null };
    }

    return {
      user: payload as { id: number; userId?: number; email: string; role?: string },
    };
  });

// Admin-only middleware
export const adminMiddleware = new Elysia()
  .use(authMiddleware)
  .derive(({ user, set }) => {
    if (!user.role || user.role !== 'admin') {
      set.status = 403;
      throw new Error('Admin access required');
    }

    return { user };
  });
