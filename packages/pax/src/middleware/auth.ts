import { Elysia } from 'elysia';
import { bearer } from '@elysiajs/bearer';
import { jwt } from '@elysiajs/jwt';
import { config } from '../config';

export const authMiddleware = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: config.jwt.secret,
    })
  )
  .use(bearer())
  .onBeforeHandle(async ({ bearer, jwt, set, request }: any) => {
    console.log('🔍 Auth middleware executing');
    console.log('🔍 Bearer present:', bearer ? 'YES' : 'NO');
    console.log('🔍 Auth header:', request.headers.get('authorization'));

    if (!bearer) {
      set.status = 401;
      console.log('❌ No bearer token - returning 401');
      return {
        success: false,
        error: 'Unauthorized',
        message: 'Missing authorization token'
      };
    }

    console.log('🔑 Verifying JWT token...');
    const payload = await jwt.verify(bearer);
    console.log('📦 JWT payload result:', payload);

    if (!payload) {
      set.status = 401;
      console.log('❌ JWT verification failed - returning 401');
      return {
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      };
    }

    console.log('✅ JWT verified successfully!');
  })
  .resolve(async ({ bearer, jwt }: any) => {
    console.log('🔄 Resolve middleware - extracting user');
    if (!bearer) {
      console.log('⚠️ No bearer in resolve');
      return { user: null };
    }

    const payload = await jwt.verify(bearer);
    console.log('👤 User payload in resolve:', payload);

    return {
      user: payload ? (payload as { id: number; userId?: number; email: string; role?: string }) : null
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
  .onBeforeHandle(({ user, set }) => {
    if (!user || !user.role || user.role !== 'admin') {
      set.status = 403;
      return {
        success: false,
        error: 'Forbidden',
        message: 'Admin access required'
      };
    }
  });
