import { eq, and, gte, lt, count, sum, desc } from 'drizzle-orm';
import { db, apiKeys, usageRecords, apiSubscriptions, apis } from '../db';

export interface RateLimit {
  requests: number;
  window: number; // in seconds
  burst?: number;
}

export interface UsageStats {
  period: 'hour' | 'day' | 'month';
  requests: number;
  limit: number;
  remaining: number;
  resetTime: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface ApiUsageRecord {
  id: number;
  apiKeyId: number;
  apiId: number;
  timestamp: Date;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  userAgent?: string;
  ipAddress?: string;
}

export class RateLimitingService {
  private readonly redisStore = new Map<string, { count: number; resetTime: number }>();

  constructor() {
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000);
  }

  /**
   * Check rate limit for API key
   */
  async checkRateLimit(
    apiKeyId: number,
    apiId: number,
    endpoint: string
  ): Promise<RateLimitResult> {
    try {
      // Get API key details with subscription
      const [apiKeyData] = await db
        .select({
          id: apiKeys.id,
          keyHash: apiKeys.keyHash,
          subscriptionId: apiKeys.subscriptionId,
          subscription: {
            tier: apiSubscriptions.tier,
            rateLimits: apiSubscriptions.rateLimits,
          },
        })
        .from(apiKeys)
        .leftJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
        .where(eq(apiKeys.id, apiKeyId))
        .limit(1);

      if (!apiKeyData || !apiKeyData.subscription) {
        return {
          allowed: false,
          limit: 0,
          remaining: 0,
          resetTime: new Date(),
          retryAfter: 3600,
        };
      }

      // Parse rate limits from subscription
      const rateLimits = this.parseRateLimits(apiKeyData.subscription.rateLimits);
      const rateLimit = this.selectApplicableRateLimit(rateLimits, endpoint);

      if (!rateLimit) {
        // No rate limit configured, allow request
        return {
          allowed: true,
          limit: Infinity,
          remaining: Infinity,
          resetTime: new Date(Date.now() + 3600000), // 1 hour from now
        };
      }

      // Check current usage
      const windowStart = Date.now() - (rateLimit.window * 1000);
      const key = `${apiKeyId}:${apiId}:${rateLimit.window}`;
      
      const current = this.redisStore.get(key);
      const now = Date.now();
      const resetTime = Math.ceil(now / (rateLimit.window * 1000)) * (rateLimit.window * 1000);

      if (!current || current.resetTime <= now) {
        // First request in window or window expired
        this.redisStore.set(key, {
          count: 1,
          resetTime: resetTime + (rateLimit.window * 1000),
        });

        return {
          allowed: true,
          limit: rateLimit.requests,
          remaining: rateLimit.requests - 1,
          resetTime: new Date(resetTime + (rateLimit.window * 1000)),
        };
      }

      // Check if limit exceeded
      if (current.count >= rateLimit.requests) {
        const retryAfter = Math.ceil((current.resetTime - now) / 1000);
        return {
          allowed: false,
          limit: rateLimit.requests,
          remaining: 0,
          resetTime: new Date(current.resetTime),
          retryAfter,
        };
      }

      // Increment counter
      current.count++;
      this.redisStore.set(key, current);

      return {
        allowed: true,
        limit: rateLimit.requests,
        remaining: rateLimit.requests - current.count,
        resetTime: new Date(current.resetTime),
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request on error
      return {
        allowed: true,
        limit: 1000,
        remaining: 999,
        resetTime: new Date(Date.now() + 3600000),
      };
    }
  }

  /**
   * Record API usage for analytics and billing
   */
  async recordUsage(
    apiKeyId: number,
    apiId: number,
    request: {
      endpoint: string;
      method: string;
      userAgent?: string;
      ipAddress?: string;
      requestSize: number;
    },
    response: {
      statusCode: number;
      responseTime: number;
      responseSize: number;
    }
  ): Promise<void> {
    try {
      await db.insert(usageRecords).values({
        apiKeyId,
        apiId,
        timestamp: new Date(),
        endpoint: request.endpoint,
        method: request.method,
        statusCode: response.statusCode,
        responseTime: response.responseTime,
        requestSize: request.requestSize,
        responseSize: response.responseSize,
        userAgent: request.userAgent,
        ipAddress: request.ipAddress,
      });
    } catch (error) {
      console.error('Failed to record usage:', error);
      // Don't throw - usage recording shouldn't break the request
    }
  }

  /**
   * Get usage statistics for API key
   */
  async getUsageStats(
    apiKeyId: number,
    period: 'hour' | 'day' | 'month' = 'day',
    apiId?: number
  ): Promise<UsageStats[]> {
    try {
      const periodStart = this.getPeriodStart(period);
      const periodEnd = new Date();

      let query = db
        .select({
          requests: count(usageRecords.id),
          totalResponseTime: sum(usageRecords.responseTime),
          avgResponseTime: sql<number>`AVG(${usageRecords.responseTime})`,
          totalDataTransfer: sum(sql<number>`${usageRecords.requestSize} + ${usageRecords.responseSize}`),
          errorCount: count(sql<number>`CASE WHEN ${usageRecords.statusCode} >= 400 THEN 1 END`),
        })
        .from(usageRecords)
        .where(
          and(
            eq(usageRecords.apiKeyId, apiKeyId),
            gte(usageRecords.timestamp, periodStart),
            lt(usageRecords.timestamp, periodEnd),
            apiId ? eq(usageRecords.apiId, apiId) : undefined
          )
        );

      const [stats] = await query;

      // Get rate limit for comparison
      const [apiKeyData] = await db
        .select({
          subscription: {
            rateLimits: apiSubscriptions.rateLimits,
          },
        })
        .from(apiKeys)
        .leftJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
        .where(eq(apiKeys.id, apiKeyId))
        .limit(1);

      const rateLimits = apiKeyData?.subscription?.rateLimits
        ? this.parseRateLimits(apiKeyData.subscription.rateLimits)
        : [];

      const applicableLimit = rateLimits.find(limit => 
        (period === 'hour' && limit.window === 3600) ||
        (period === 'day' && limit.window === 86400) ||
        (period === 'month' && limit.window === 2592000)
      );

      const limit = applicableLimit?.requests || Infinity;
      const requests = stats?.requests || 0;

      return [{
        period,
        requests,
        limit,
        remaining: Math.max(0, limit - requests),
        resetTime: this.getNextPeriodStart(period),
      }];
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      throw new Error('Failed to retrieve usage statistics');
    }
  }

  /**
   * Get top APIs by usage
   */
  async getTopApisByUsage(
    timeframe: 'day' | 'week' | 'month' = 'day',
    limit: number = 10
  ): Promise<Array<{
    apiId: number;
    apiName: string;
    requestCount: number;
    errorRate: number;
    avgResponseTime: number;
  }>> {
    try {
      const periodStart = this.getPeriodStart(timeframe === 'week' ? 'day' : timeframe);
      if (timeframe === 'week') {
        periodStart.setDate(periodStart.getDate() - 6); // 7 days total
      }

      const results = await db
        .select({
          apiId: usageRecords.apiId,
          apiName: apis.name,
          requestCount: count(usageRecords.id),
          errorCount: count(sql<number>`CASE WHEN ${usageRecords.statusCode} >= 400 THEN 1 END`),
          avgResponseTime: sql<number>`AVG(${usageRecords.responseTime})`,
        })
        .from(usageRecords)
        .leftJoin(apis, eq(usageRecords.apiId, apis.id))
        .where(gte(usageRecords.timestamp, periodStart))
        .groupBy(usageRecords.apiId, apis.name)
        .orderBy(desc(count(usageRecords.id)))
        .limit(limit);

      return results.map(row => ({
        apiId: row.apiId,
        apiName: row.apiName || 'Unknown API',
        requestCount: row.requestCount,
        errorRate: row.requestCount > 0 ? (row.errorCount / row.requestCount) * 100 : 0,
        avgResponseTime: Math.round(row.avgResponseTime || 0),
      }));
    } catch (error) {
      console.error('Failed to get top APIs:', error);
      throw new Error('Failed to retrieve API usage statistics');
    }
  }

  /**
   * Get usage trends over time
   */
  async getUsageTrends(
    apiKeyId: number,
    timeframe: 'day' | 'week' | 'month' = 'day',
    granularity: 'hour' | 'day' = 'hour'
  ): Promise<Array<{
    timestamp: Date;
    requests: number;
    errors: number;
    avgResponseTime: number;
  }>> {
    try {
      const periodStart = this.getPeriodStart(timeframe);
      if (timeframe === 'week') {
        periodStart.setDate(periodStart.getDate() - 6);
      }

      const timeFormat = granularity === 'hour' 
        ? "date_trunc('hour', timestamp)"
        : "date_trunc('day', timestamp)";

      const results = await db.execute(sql`
        SELECT 
          ${sql.raw(timeFormat)} as time_bucket,
          COUNT(*) as requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors,
          AVG(response_time) as avg_response_time
        FROM usage_records
        WHERE api_key_id = ${apiKeyId}
          AND timestamp >= ${periodStart}
        GROUP BY time_bucket
        ORDER BY time_bucket
      `);

      return (results.rows || []).map((row: any) => ({
        timestamp: new Date(row.time_bucket),
        requests: parseInt(row.requests),
        errors: parseInt(row.errors),
        avgResponseTime: Math.round(parseFloat(row.avg_response_time) || 0),
      }));
    } catch (error) {
      console.error('Failed to get usage trends:', error);
      throw new Error('Failed to retrieve usage trends');
    }
  }

  // Private helper methods

  private parseRateLimits(rateLimitsJson: string | null): RateLimit[] {
    if (!rateLimitsJson) return [];
    
    try {
      const parsed = JSON.parse(rateLimitsJson);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }

  private selectApplicableRateLimit(
    rateLimits: RateLimit[],
    endpoint: string
  ): RateLimit | null {
    // For now, use the most restrictive rate limit
    // In a real implementation, you might have endpoint-specific limits
    if (rateLimits.length === 0) return null;
    
    return rateLimits.reduce((most, current) => {
      const mostRate = most.requests / most.window;
      const currentRate = current.requests / current.window;
      return currentRate < mostRate ? current : most;
    });
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.redisStore.entries()) {
      if (entry.resetTime <= now) {
        this.redisStore.delete(key);
      }
    }
  }

  private getPeriodStart(period: 'hour' | 'day' | 'month'): Date {
    const now = new Date();
    
    switch (period) {
      case 'hour':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
  }

  private getNextPeriodStart(period: 'hour' | 'day' | 'month'): Date {
    const now = new Date();
    
    switch (period) {
      case 'hour':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
      case 'day':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0, 0);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      default:
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        return new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 0, 0, 0, 0);
    }
  }
}

// SQL import for raw queries
import { sql } from 'drizzle-orm';