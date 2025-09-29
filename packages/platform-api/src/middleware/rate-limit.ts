import { Elysia } from 'elysia';
import { RateLimitingService } from '../services/rate-limiting-service';

const rateLimitingService = new RateLimitingService();

export interface RateLimitHeaders {
  'X-RateLimit-Limit': number;
  'X-RateLimit-Remaining': number;
  'X-RateLimit-Reset': string;
  'Retry-After'?: number;
}

/**
 * Rate limiting middleware for API endpoints
 * Requires authentication middleware to be applied first
 */
export const rateLimit = () =>
  new Elysia({ name: 'rate-limit' })
    .derive({ as: 'global' }, async ({ headers, set, path, request }) => {
      // Skip rate limiting for health checks and non-API routes
      if (path === '/health' || !path.startsWith('/api/')) {
        return {};
      }

      try {
        // Extract API key from Authorization header or X-API-Key header
        const apiKey = headers['x-api-key'] || 
          (headers['authorization']?.startsWith('Bearer ') 
            ? headers['authorization'].slice(7) 
            : null);

        if (!apiKey) {
          // No API key provided - let auth middleware handle this
          return {};
        }

        // For now, we'll use placeholder values since we need to integrate with auth
        // In real implementation, these would come from validated auth context
        const apiKeyId = 1; // This should come from auth middleware
        const apiId = 1; // This should be determined from the endpoint
        const endpoint = path;

        // Check rate limit
        const rateLimitResult = await rateLimitingService.checkRateLimit(
          apiKeyId,
          apiId,
          endpoint
        );

        // Set rate limit headers
        set.headers = {
          ...set.headers,
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': Math.floor(rateLimitResult.resetTime.getTime() / 1000).toString(),
        };

        if (!rateLimitResult.allowed) {
          set.status = 429;
          if (rateLimitResult.retryAfter) {
            set.headers['Retry-After'] = rateLimitResult.retryAfter.toString();
          }
          
          return {
            success: false,
            message: 'Rate limit exceeded',
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              limit: rateLimitResult.limit,
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime.toISOString(),
              retryAfter: rateLimitResult.retryAfter,
            }
          };
        }

        // Record the request for usage tracking
        const startTime = Date.now();
        const requestSize = parseInt(headers['content-length'] || '0');

        // Store request metadata for post-processing
        return {
          _rateLimitContext: {
            apiKeyId,
            apiId,
            endpoint,
            startTime,
            requestSize,
            method: request.method,
            userAgent: headers['user-agent'],
            ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'],
          }
        };
      } catch (error) {
        console.error('Rate limiting error:', error);
        // Fail open - don't block requests on rate limiting errors
        return {};
      }
    })
    .onAfterResponse({ as: 'global' }, async ({ _rateLimitContext, set, response }) => {
      // Record usage after response is sent
      if (_rateLimitContext) {
        try {
          const endTime = Date.now();
          const responseTime = endTime - _rateLimitContext.startTime;
          
          // Estimate response size
          let responseSize = 0;
          if (typeof response === 'string') {
            responseSize = Buffer.byteLength(response, 'utf8');
          } else if (response && typeof response === 'object') {
            responseSize = Buffer.byteLength(JSON.stringify(response), 'utf8');
          }

          await rateLimitingService.recordUsage(
            _rateLimitContext.apiKeyId,
            _rateLimitContext.apiId,
            {
              endpoint: _rateLimitContext.endpoint,
              method: _rateLimitContext.method,
              userAgent: _rateLimitContext.userAgent,
              ipAddress: _rateLimitContext.ipAddress,
              requestSize: _rateLimitContext.requestSize,
            },
            {
              statusCode: set.status || 200,
              responseTime,
              responseSize,
            }
          );
        } catch (error) {
          console.error('Failed to record API usage:', error);
          // Don't throw - usage recording shouldn't affect the response
        }
      }
    });

/**
 * Simple rate limiting middleware for public endpoints
 * Uses IP-based rate limiting without API key requirements
 */
export const publicRateLimit = (
  requests: number = 100,
  windowMinutes: number = 15
) => {
  const windowMs = windowMinutes * 60 * 1000;
  const ipStore = new Map<string, { count: number; resetTime: number }>();

  // Clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of ipStore.entries()) {
      if (entry.resetTime <= now) {
        ipStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  return new Elysia({ name: 'public-rate-limit' })
    .derive({ as: 'global' }, ({ headers, set }) => {
      const clientIp = headers['x-forwarded-for'] || 
                       headers['x-real-ip'] || 
                       'unknown';

      const now = Date.now();
      const resetTime = Math.ceil(now / windowMs) * windowMs;
      
      let entry = ipStore.get(clientIp);
      
      if (!entry || entry.resetTime <= now) {
        // First request in window or window expired
        entry = { count: 1, resetTime: resetTime + windowMs };
        ipStore.set(clientIp, entry);
      } else {
        // Increment counter
        entry.count++;
        ipStore.set(clientIp, entry);
      }

      // Set rate limit headers
      set.headers = {
        ...set.headers,
        'X-RateLimit-Limit': requests.toString(),
        'X-RateLimit-Remaining': Math.max(0, requests - entry.count).toString(),
        'X-RateLimit-Reset': Math.floor(entry.resetTime / 1000).toString(),
      };

      if (entry.count > requests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        set.status = 429;
        set.headers['Retry-After'] = retryAfter.toString();
        
        return {
          success: false,
          message: 'Rate limit exceeded',
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            limit: requests,
            remaining: 0,
            resetTime: new Date(entry.resetTime).toISOString(),
            retryAfter,
          }
        };
      }

      return {};
    });
};

export { rateLimitingService };