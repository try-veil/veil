import { Elysia } from 'elysia';

// In-memory rate limit store
// Format: {key: {count: number, resetAt: number}}
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

/**
 * Create a rate limiter
 * @param config Rate limit configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowMs, keyPrefix = 'ratelimit' } = config;

  return (key: string): { allowed: boolean; limit: number; remaining: number; resetAt: number } => {
    const rateLimitKey = `${keyPrefix}:${key}`;
    const now = Date.now();

    const existing = rateLimitStore.get(rateLimitKey);

    if (!existing || existing.resetAt < now) {
      // Create new rate limit window
      const resetAt = now + windowMs;
      rateLimitStore.set(rateLimitKey, {
        count: 1,
        resetAt,
      });

      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        resetAt,
      };
    }

    // Increment counter
    existing.count++;
    rateLimitStore.set(rateLimitKey, existing);

    const allowed = existing.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - existing.count);

    return {
      allowed,
      limit: maxRequests,
      remaining,
      resetAt: existing.resetAt,
    };
  };
}

/**
 * Per-user rate limiting middleware
 * Default: 100 requests per minute per user
 */
export const userRateLimitMiddleware = new Elysia({ name: 'user-rate-limit' })
  .derive(({ headers, query }) => {
    // Extract user ID from context (will be set by auth middleware)
    // For now, we'll use IP address as a fallback
    const forwarded = headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : headers['x-real-ip'] || 'unknown';
    return { clientIp: ip };
  })
  .onBeforeHandle(({ clientIp, set }) => {
    const rateLimiter = createRateLimiter({
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
      keyPrefix: 'user',
    });

    const result = rateLimiter(clientIp);

    // Set rate limit headers
    set.headers['x-ratelimit-limit'] = result.limit.toString();
    set.headers['x-ratelimit-remaining'] = result.remaining.toString();
    set.headers['x-ratelimit-reset'] = new Date(result.resetAt).toISOString();

    if (!result.allowed) {
      set.status = 429;
      return {
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: new Date(result.resetAt).toISOString(),
      };
    }
  });

/**
 * Per-API rate limiting (configurable per API)
 * @param apiId API identifier
 * @param rateLimitPerMinute Max requests per minute for this API
 */
export function createApiRateLimiter(apiId: number, rateLimitPerMinute: number) {
  return new Elysia({ name: `api-rate-limit-${apiId}` })
    .derive(({ headers }) => {
      const forwarded = headers['x-forwarded-for'];
      const ip = forwarded ? forwarded.split(',')[0] : headers['x-real-ip'] || 'unknown';
      return { clientIp: ip };
    })
    .onBeforeHandle(({ clientIp, set }) => {
      const rateLimiter = createRateLimiter({
        maxRequests: rateLimitPerMinute,
        windowMs: 60 * 1000, // 1 minute
        keyPrefix: `api:${apiId}`,
      });

      const result = rateLimiter(clientIp);

      // Set rate limit headers
      set.headers['x-api-ratelimit-limit'] = result.limit.toString();
      set.headers['x-api-ratelimit-remaining'] = result.remaining.toString();
      set.headers['x-api-ratelimit-reset'] = new Date(result.resetAt).toISOString();

      if (!result.allowed) {
        set.status = 429;
        return {
          success: false,
          message: 'API rate limit exceeded',
          retryAfter: new Date(result.resetAt).toISOString(),
        };
      }
    });
}
