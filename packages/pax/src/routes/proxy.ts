import { Elysia, t } from 'elysia';
import { proxyService } from '../services/proxy-service';
import { proxyApiRepository } from '../repositories/proxy-api-repository';
import { userRateLimitMiddleware } from '../middleware/rate-limit';

/**
 * Main proxy endpoint
 * Route: ALL /proxy/:apiSlug/*
 */
export const proxyRoutes = new Elysia({ prefix: '/proxy' })
  .get('/:apiSlug/health', async ({ params, set }) => {
    try {
      const api = await proxyApiRepository.findBySlug(params.apiSlug);
      if (!api) {
        set.status = 404;
        return {
          success: false,
          message: 'API not found',
          healthy: false,
        };
      }

      if (!api.isActive) {
        set.status = 503;
        return {
          success: false,
          message: 'API is not active',
          healthy: false,
        };
      }

      // Try to fetch the upstream URL with a simple HEAD request
      const startTime = Date.now();
      try {
        const response = await fetch(api.upstreamUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        const duration = Date.now() - startTime;

        return {
          success: true,
          healthy: response.ok,
          api: {
            slug: api.slug,
            name: api.name,
            upstreamUrl: api.upstreamUrl,
          },
          upstream: {
            status: response.status,
            statusText: response.statusText,
            responseTime: duration,
          },
        };
      } catch (error: any) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          healthy: false,
          api: {
            slug: api.slug,
            name: api.name,
            upstreamUrl: api.upstreamUrl,
          },
          upstream: {
            error: error.message,
            responseTime: duration,
          },
        };
      }
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: error.message,
        healthy: false,
      };
    }
  }, {
    params: t.Object({
      apiSlug: t.String(),
    }),
    detail: {
      tags: ['Proxy'],
      summary: 'Check upstream API health',
      description: 'Check if the upstream API is reachable and healthy',
    },
  })
  .guard({}, (app) =>
    app
      .use(userRateLimitMiddleware)
      .resolve(async ({ headers, query, set }) => {
        // Extract API key from header or query
        const apiKey =
          headers['x-api-key'] ||
          (query as any).api_key;

        if (!apiKey) {
          set.status = 401;
          throw new Error('Missing API key. Provide via X-API-Key header or api_key query parameter');
        }

        // Mock API key format: sk_live_userid_keyid
        const keyParts = (apiKey as string).split('_');
        if (keyParts.length < 4 || keyParts[0] !== 'sk' || (keyParts[1] !== 'live' && keyParts[1] !== 'test')) {
          set.status = 401;
          throw new Error('Invalid API key format');
        }

        const userId = parseInt(keyParts[2]);
        if (isNaN(userId)) {
          set.status = 401;
          throw new Error('Invalid API key');
        }

        return {
          apiKey: apiKey as string,
          userId,
          subscriptionId: undefined as number | undefined,
          apiKeyId: undefined as number | undefined,
        };
      })
      .all('/:apiSlug/*', async ({ params, request, apiKey, userId, subscriptionId, apiKeyId, set }) => {
        console.log(`📍 Proxy request received - apiSlug: ${params.apiSlug}, path: ${params['*']}, userId: ${userId}`);
        try {
          const apiSlug = params.apiSlug;
          const path = params['*'] || '';

          // Prepare proxy context
          const context = await proxyService.prepareProxyContext(
            apiSlug,
            request.method,
            `/${path}`,
            userId,
            subscriptionId,
            apiKeyId
          );

          // Get request headers
          const requestHeaders: Record<string, string> = {};
          request.headers.forEach((value, key) => {
            requestHeaders[key] = value;
          });

          // Get request body
          let body: any;
          const contentType = requestHeaders['content-type'];
          if (contentType?.includes('application/json')) {
            try {
              body = await request.json();
            } catch {
              body = undefined;
            }
          } else if (request.method !== 'GET' && request.method !== 'HEAD') {
            try {
              body = await request.text();
            } catch {
              body = undefined;
            }
          }

          // Execute proxy request
          const result = await proxyService.executeProxyRequest(context, {
            method: request.method,
            path: `/${path}`,
            headers: requestHeaders,
            body,
          });

          // Set response headers
          Object.entries(result.headers).forEach(([key, value]) => {
            set.headers[key] = value;
          });

          // Add cost header for transparency
          set.headers['x-pax-cost'] = result.cost.actualCost.toFixed(6);
          set.headers['x-pax-duration'] = result.metrics.duration?.toString() || '0';

          set.status = result.statusCode;

          // Try to parse JSON response
          try {
            return JSON.parse(result.body);
          } catch {
            return result.body;
          }
        } catch (error: any) {
          set.status = error.message.includes('not found') ? 404 :
                       error.message.includes('not active') ? 503 :
                       error.message.includes('credits') ? 402 :
                       error.message.includes('timeout') ? 504 : 500;

          return {
            success: false,
            error: error.message,
          };
        }
      }, {
        detail: {
          tags: ['Proxy'],
          summary: 'Proxy API request',
          description: 'Proxy a request to an upstream API with usage metering',
        },
      })
  );
