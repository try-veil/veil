import { Elysia, t } from 'elysia';
import { rateLimitingService } from '../middleware/rate-limit';
import { authMiddleware } from '../middleware/auth';
import { paginationSchema } from '../validation/schemas';
import { db, apis, apiSubscriptions, apiUsageAnalytics, apiKeys } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { usageTrackingService } from '../services/usage-tracking-service';

interface UsageEvent {
  id: string;
  api_path: string;
  subscription_key: string;
  method: string;
  response_time_ms: number;
  status_code: number;
  success: boolean;
  timestamp: string;
  request_size: number;
  response_size: number;
}

export const usageRoutes = new Elysia({ prefix: '/usage' })
  // Events endpoint - no auth middleware for Veil proxy
  .post('/events', async ({ body, set }) => {
    try {
      const { events } = body as { events: UsageEvent[] };

      if (!events || !Array.isArray(events) || events.length === 0) {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid events payload'
        };
      }

      console.log(`Received ${events.length} usage events for processing`);

      let processedCount = 0;
      let errorCount = 0;

      for (const event of events) {
        try {
          console.log(`Processing event for path: ${event.api_path}, subscription key: ${event.subscription_key}`);

          // Find the API key first using the subscription key
          const [apiKey] = await db.select({
            id: apiKeys.id,
            subscriptionId: apiKeys.subscriptionId,
            isActive: apiKeys.isActive,
          })
          .from(apiKeys)
          .where(eq(apiKeys.keyValue, event.subscription_key))
          .limit(1);

          if (!apiKey || !apiKey.isActive) {
            console.warn(`API key not found or inactive for subscription key: ${event.subscription_key}`);
            errorCount++;
            continue;
          }

          // Find the subscription and API details
          const [subscriptionData] = await db.select({
            subscriptionId: apiSubscriptions.id,
            apiId: apiSubscriptions.apiId,
            requestsUsed: apiSubscriptions.requestsUsed,
            requestsLimit: apiSubscriptions.requestsLimit,
            apiName: apis.name,
            apiEndpoint: apis.endpoint,
          })
          .from(apiSubscriptions)
          .innerJoin(apis, eq(apiSubscriptions.apiId, apis.id))
          .where(and(
            eq(apiSubscriptions.id, apiKey.subscriptionId),
            eq(apiSubscriptions.status, 'active')
          ))
          .limit(1);

          if (!subscriptionData) {
            console.warn(`No active subscription found for API key: ${event.subscription_key}`);
            errorCount++;
            continue;
          }

          console.log(`Found subscription ${subscriptionData.subscriptionId} for API ${subscriptionData.apiName} (${subscriptionData.apiEndpoint})`);

          // Check quota enforcement for successful requests
          if (event.success) {
            try {
              const quotaCheck = await usageTrackingService.checkQuotaStatus(subscriptionData.subscriptionId);

              if (quotaCheck.isOverQuota) {
                console.warn(`Subscription ${subscriptionData.subscriptionId} has exceeded quota`);
                // Record the event but mark it as quota exceeded
                // In a real system, this would have been caught at the gateway level
              }

              // Check for quota warnings (80%, 90%, etc.)
              if (quotaCheck.warnings && quotaCheck.warnings.length > 0) {
                for (const warning of quotaCheck.warnings) {
                  console.warn(`Quota warning for subscription ${subscriptionData.subscriptionId}: ${warning}`);
                  // TODO: Send notification to user about approaching quota limit
                }
              }
            } catch (quotaError) {
              console.error('Failed to check quota:', quotaError);
              // Continue processing even if quota check fails
            }
          }

          // Update subscription usage only for successful requests
          if (event.success) {
            await db.update(apiSubscriptions)
              .set({
                requestsUsed: sql`${apiSubscriptions.requestsUsed} + 1`,
                updatedAt: new Date()
              })
              .where(eq(apiSubscriptions.id, subscriptionData.subscriptionId));

            console.log(`Updated usage count for subscription ${subscriptionData.subscriptionId}`);
          }

          // Insert usage analytics record
          await db.insert(apiUsageAnalytics).values({
            subscriptionId: subscriptionData.subscriptionId,
            date: new Date(event.timestamp),
            requestCount: 1,
            successfulRequests: event.success ? 1 : 0,
            failedRequests: event.success ? 0 : 1,
            avgResponseTime: event.response_time_ms,
            totalDataTransferred: (event.request_size || 0) + (event.response_size || 0),
          });

          console.log(`Inserted analytics record for subscription ${subscriptionData.subscriptionId}`);

          // Update billing period usage if one exists
          try {
            await usageTrackingService.updateBillingPeriodUsage(
              subscriptionData.subscriptionId,
              {
                requests: 1,
                successfulRequests: event.success ? 1 : 0,
                failedRequests: event.success ? 0 : 1,
                dataTransferredBytes: (event.request_size || 0) + (event.response_size || 0)
              }
            );
          } catch (billingError) {
            // Don't fail event processing if billing update fails
            console.error('Failed to update billing period:', billingError);
          }

          processedCount++;

        } catch (eventError: any) {
          console.error('Error processing individual event:', eventError);
          errorCount++;
        }
      }

      console.log(`Usage events processed: ${processedCount} successful, ${errorCount} errors`);

      return {
        success: true,
        message: `Processed ${processedCount} events successfully`,
        processed: processedCount,
        errors: errorCount
      };

    } catch (error: any) {
      console.error('Failed to process usage events:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Failed to process usage events',
        error: error.message
      };
    }
  }, {
    body: t.Object({
      events: t.Array(t.Object({
        id: t.String(),
        api_path: t.String(),
        subscription_key: t.String(),
        method: t.String(),
        response_time_ms: t.Number(),
        status_code: t.Number(),
        success: t.Boolean(),
        timestamp: t.String(),
        request_size: t.Number(),
        response_size: t.Number(),
      }))
    })
  })
  .use(authMiddleware)
  
  // Get usage statistics for current user's API keys
  .get('/stats', async ({ query, user, set }) => {
    try {
      const { 
        period = 'day', 
        api_id,
        timeframe = 'day' 
      } = query as { 
        period?: 'hour' | 'day' | 'month';
        api_id?: string;
        timeframe?: 'day' | 'week' | 'month';
      };

      // For now using placeholder API key ID
      // In real implementation, get user's API keys from database
      const apiKeyId = 1;
      const apiId = api_id ? parseInt(api_id) : undefined;

      const stats = await rateLimitingService.getUsageStats(
        apiKeyId,
        period,
        apiId
      );

      return {
        success: true,
        data: {
          stats,
          period,
          timeframe,
          ...(apiId && { apiId })
        },
        meta: {
          timestamp: new Date().toISOString(),
          userId: user.id
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch usage statistics',
        error: error.message
      };
    }
  }, {
    query: t.Object({
      period: t.Optional(t.Union([
        t.Literal('hour'),
        t.Literal('day'), 
        t.Literal('month')
      ])),
      api_id: t.Optional(t.String()),
      timeframe: t.Optional(t.Union([
        t.Literal('day'),
        t.Literal('week'),
        t.Literal('month')
      ]))
    })
  })
  
  // Get usage trends over time
  .get('/trends', async ({ query, user, set }) => {
    try {
      const { 
        timeframe = 'day',
        granularity = 'hour',
        api_key_id 
      } = query as {
        timeframe?: 'day' | 'week' | 'month';
        granularity?: 'hour' | 'day';
        api_key_id?: string;
      };

      // For now using placeholder API key ID
      const apiKeyId = api_key_id ? parseInt(api_key_id) : 1;

      const trends = await rateLimitingService.getUsageTrends(
        apiKeyId,
        timeframe,
        granularity
      );

      return {
        success: true,
        data: {
          trends,
          timeframe,
          granularity,
          apiKeyId
        },
        meta: {
          timestamp: new Date().toISOString(),
          userId: user.id,
          dataPoints: trends.length
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch usage trends',
        error: error.message
      };
    }
  }, {
    query: t.Object({
      timeframe: t.Optional(t.Union([
        t.Literal('day'),
        t.Literal('week'),
        t.Literal('month')
      ])),
      granularity: t.Optional(t.Union([
        t.Literal('hour'),
        t.Literal('day')
      ])),
      api_key_id: t.Optional(t.String())
    })
  })
  
  // Get top performing APIs
  .get('/top-apis', async ({ query, set }) => {
    try {
      const { 
        timeframe = 'day',
        limit = 10 
      } = query as {
        timeframe?: 'day' | 'week' | 'month';
        limit?: number;
      };

      const topApis = await rateLimitingService.getTopApisByUsage(
        timeframe,
        limit
      );

      return {
        success: true,
        data: {
          apis: topApis,
          timeframe,
          limit
        },
        meta: {
          timestamp: new Date().toISOString(),
          totalResults: topApis.length
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch top APIs',
        error: error.message
      };
    }
  }, {
    query: t.Object({
      timeframe: t.Optional(t.Union([
        t.Literal('day'),
        t.Literal('week'),
        t.Literal('month')
      ])),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 }))
    })
  })
  
  // Get rate limit status for API key
  .get('/rate-limits', async ({ query, user, set }) => {
    try {
      const { api_key_id } = query as { api_key_id?: string };
      
      // For now using placeholder values
      const apiKeyId = api_key_id ? parseInt(api_key_id) : 1;
      const apiId = 1;
      const endpoint = '/api/v1/test';

      const rateLimitResult = await rateLimitingService.checkRateLimit(
        apiKeyId,
        apiId,
        endpoint
      );

      return {
        success: true,
        data: {
          apiKeyId,
          rateLimit: {
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
            allowed: rateLimitResult.allowed,
            ...(rateLimitResult.retryAfter && { 
              retryAfter: rateLimitResult.retryAfter 
            })
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          userId: user.id
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to check rate limits',
        error: error.message
      };
    }
  }, {
    query: t.Object({
      api_key_id: t.Optional(t.String())
    })
  })
  
  // Get usage summary for dashboard
  .get('/summary', async ({ query, user, set }) => {
    try {
      const { timeframe = 'day' } = query as { timeframe?: 'day' | 'week' | 'month' };
      
      // For now using placeholder API key ID
      const apiKeyId = 1;

      // Get current period stats
      const [currentStats] = await rateLimitingService.getUsageStats(
        apiKeyId,
        timeframe === 'week' ? 'day' : timeframe
      );

      // Get trends for the period
      const trends = await rateLimitingService.getUsageTrends(
        apiKeyId,
        timeframe,
        timeframe === 'day' ? 'hour' : 'day'
      );

      // Get top APIs
      const topApis = await rateLimitingService.getTopApisByUsage(timeframe, 5);

      // Calculate percentage changes (simplified)
      const currentRequests = currentStats?.requests || 0;
      const previousPeriodRequests = trends.length > 1 
        ? trends[trends.length - 2]?.requests || 0 
        : 0;
      
      const requestsChange = previousPeriodRequests > 0 
        ? ((currentRequests - previousPeriodRequests) / previousPeriodRequests) * 100
        : 0;

      return {
        success: true,
        data: {
          summary: {
            totalRequests: currentRequests,
            requestsChange,
            rateLimitUsage: currentStats ? {
              used: currentStats.requests,
              limit: currentStats.limit,
              percentage: currentStats.limit !== Infinity 
                ? (currentStats.requests / currentStats.limit) * 100
                : 0
            } : null,
            topApis: topApis.slice(0, 3), // Top 3 for summary
            trends: trends.slice(-24), // Last 24 data points
          },
          timeframe
        },
        meta: {
          timestamp: new Date().toISOString(),
          userId: user.id
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch usage summary',
        error: error.message
      };
    }
  }, {
    query: t.Object({
      timeframe: t.Optional(t.Union([
        t.Literal('day'),
        t.Literal('week'),
        t.Literal('month')
      ]))
    })
  })
  
  // Export usage data
  .get('/export', async ({ query, user, set }) => {
    try {
      const { 
        format = 'json',
        timeframe = 'month',
        api_id 
      } = query as {
        format?: 'json' | 'csv';
        timeframe?: 'day' | 'week' | 'month';
        api_id?: string;
      };

      // For now using placeholder API key ID
      const apiKeyId = 1;
      const apiId = api_id ? parseInt(api_id) : undefined;

      const trends = await rateLimitingService.getUsageTrends(
        apiKeyId,
        timeframe,
        'day'
      );

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeader = 'timestamp,requests,errors,avg_response_time\n';
        const csvData = trends
          .map(trend => 
            `${trend.timestamp.toISOString()},${trend.requests},${trend.errors},${trend.avgResponseTime}`
          )
          .join('\n');
        
        set.headers = {
          ...set.headers,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="usage-export-${timeframe}.csv"`
        };

        return csvHeader + csvData;
      }

      // JSON format
      set.headers = {
        ...set.headers,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="usage-export-${timeframe}.json"`
      };

      return {
        success: true,
        data: {
          export: {
            timeframe,
            exportedAt: new Date().toISOString(),
            userId: user.id,
            apiKeyId,
            ...(apiId && { apiId }),
            usage: trends
          }
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to export usage data',
        error: error.message
      };
    }
  }, {
    query: t.Object({
      format: t.Optional(t.Union([
        t.Literal('json'),
        t.Literal('csv')
      ])),
      timeframe: t.Optional(t.Union([
        t.Literal('day'),
        t.Literal('week'),
        t.Literal('month')
      ])),
      api_id: t.Optional(t.String())
    })
  });