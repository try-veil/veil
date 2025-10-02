import { eq, and, gte, lt, sum, count } from 'drizzle-orm';
import { db, apiKeys, usageRecords, apiSubscriptions } from '../db';

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  resetTime: Date;
  unlimited: boolean;
}

export interface QuotaCheck {
  allowed: boolean;
  quota: QuotaInfo;
  message?: string;
}

export interface BillingPeriod {
  start: Date;
  end: Date;
  type: 'monthly' | 'daily' | 'hourly';
}

export class QuotaService {
  /**
   * Check if API key has quota remaining for requests
   */
  async checkQuota(
    apiKeyId: number,
    requestCount: number = 1
  ): Promise<QuotaCheck> {
    try {
      // Get API key with subscription details
      const [apiKeyData] = await db
        .select({
          id: apiKeys.id,
          keyHash: apiKeys.keyHash,
          subscriptionId: apiKeys.subscriptionId,
          subscription: {
            tier: apiSubscriptions.tier,
            quotaRequests: apiSubscriptions.quotaRequests,
            quotaPeriod: apiSubscriptions.quotaPeriod,
          },
        })
        .from(apiKeys)
        .leftJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
        .where(eq(apiKeys.id, apiKeyId))
        .limit(1);

      if (!apiKeyData || !apiKeyData.subscription) {
        return {
          allowed: false,
          quota: {
            used: 0,
            limit: 0,
            remaining: 0,
            resetTime: new Date(),
            unlimited: false,
          },
          message: 'API key not found or no active subscription'
        };
      }

      const subscription = apiKeyData.subscription;
      
      // Check if unlimited quota
      if (subscription.quotaRequests === null || subscription.quotaRequests === -1) {
        return {
          allowed: true,
          quota: {
            used: 0,
            limit: Infinity,
            remaining: Infinity,
            resetTime: this.getNextResetTime(subscription.quotaPeriod || 'monthly'),
            unlimited: true,
          }
        };
      }

      // Calculate current billing period
      const billingPeriod = this.getCurrentBillingPeriod(subscription.quotaPeriod || 'monthly');
      
      // Get usage for current billing period
      const [usage] = await db
        .select({
          totalRequests: count(usageRecords.id),
        })
        .from(usageRecords)
        .where(
          and(
            eq(usageRecords.apiKeyId, apiKeyId),
            gte(usageRecords.timestamp, billingPeriod.start),
            lt(usageRecords.timestamp, billingPeriod.end)
          )
        );

      const used = usage?.totalRequests || 0;
      const limit = subscription.quotaRequests || 0;
      const remaining = Math.max(0, limit - used);

      const quota: QuotaInfo = {
        used,
        limit,
        remaining,
        resetTime: billingPeriod.end,
        unlimited: false,
      };

      const allowed = remaining >= requestCount;

      return {
        allowed,
        quota,
        ...((!allowed) && { 
          message: `Quota exceeded. Used ${used}/${limit} requests in current billing period.` 
        })
      };
    } catch (error) {
      console.error('Quota check failed:', error);
      // Fail closed - deny on error
      return {
        allowed: false,
        quota: {
          used: 0,
          limit: 0,
          remaining: 0,
          resetTime: new Date(),
          unlimited: false,
        },
        message: 'Quota check failed'
      };
    }
  }

  /**
   * Get quota information for an API key
   */
  async getQuotaInfo(apiKeyId: number): Promise<QuotaInfo> {
    const quotaCheck = await this.checkQuota(apiKeyId, 0);
    return quotaCheck.quota;
  }

  /**
   * Get quota usage by API for an API key
   */
  async getQuotaUsageByApi(
    apiKeyId: number,
    billingPeriod?: BillingPeriod
  ): Promise<Array<{
    apiId: number;
    apiName: string;
    requests: number;
    percentage: number;
  }>> {
    try {
      const period = billingPeriod || this.getCurrentBillingPeriod('monthly');

      const results = await db.execute(sql`
        SELECT 
          ur.api_id,
          a.name as api_name,
          COUNT(*) as requests,
          (COUNT(*) * 100.0 / (
            SELECT COUNT(*) 
            FROM usage_records ur2 
            WHERE ur2.api_key_id = ${apiKeyId}
              AND ur2.timestamp >= ${period.start}
              AND ur2.timestamp < ${period.end}
          )) as percentage
        FROM usage_records ur
        LEFT JOIN apis a ON ur.api_id = a.id
        WHERE ur.api_key_id = ${apiKeyId}
          AND ur.timestamp >= ${period.start}
          AND ur.timestamp < ${period.end}
        GROUP BY ur.api_id, a.name
        ORDER BY requests DESC
      `);

      return (results.rows || []).map((row: any) => ({
        apiId: parseInt(row.api_id),
        apiName: row.api_name || 'Unknown API',
        requests: parseInt(row.requests),
        percentage: parseFloat(row.percentage) || 0,
      }));
    } catch (error) {
      console.error('Failed to get quota usage by API:', error);
      return [];
    }
  }

  /**
   * Get quota alerts for API keys approaching limits
   */
  async getQuotaAlerts(
    userId: number,
    thresholds: number[] = [80, 90, 95]
  ): Promise<Array<{
    apiKeyId: number;
    keyName: string;
    usagePercentage: number;
    threshold: number;
    quota: QuotaInfo;
    severity: 'warning' | 'critical';
  }>> {
    try {
      // Get user's API keys
      const userApiKeys = await db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          subscriptionId: apiKeys.subscriptionId,
        })
        .from(apiKeys)
        .where(eq(apiKeys.userId, userId));

      const alerts = [];

      for (const apiKey of userApiKeys) {
        const quotaInfo = await this.getQuotaInfo(apiKey.id);
        
        if (quotaInfo.unlimited || quotaInfo.limit === 0) {
          continue;
        }

        const usagePercentage = (quotaInfo.used / quotaInfo.limit) * 100;
        
        for (const threshold of thresholds) {
          if (usagePercentage >= threshold) {
            alerts.push({
              apiKeyId: apiKey.id,
              keyName: apiKey.name || `API Key ${apiKey.id}`,
              usagePercentage,
              threshold,
              quota: quotaInfo,
              severity: threshold >= 90 ? 'critical' : 'warning',
            });
            break; // Only add one alert per API key (highest threshold exceeded)
          }
        }
      }

      return alerts.sort((a, b) => b.usagePercentage - a.usagePercentage);
    } catch (error) {
      console.error('Failed to get quota alerts:', error);
      return [];
    }
  }

  /**
   * Estimate when quota will be exhausted based on current usage rate
   */
  async estimateQuotaExhaustion(apiKeyId: number): Promise<{
    exhaustionDate: Date | null;
    daysRemaining: number | null;
    currentRate: number; // requests per day
  }> {
    try {
      const quotaInfo = await this.getQuotaInfo(apiKeyId);
      
      if (quotaInfo.unlimited || quotaInfo.remaining === Infinity) {
        return {
          exhaustionDate: null,
          daysRemaining: null,
          currentRate: 0,
        };
      }

      // Calculate usage rate over last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [recentUsage] = await db
        .select({
          requests: count(usageRecords.id),
        })
        .from(usageRecords)
        .where(
          and(
            eq(usageRecords.apiKeyId, apiKeyId),
            gte(usageRecords.timestamp, sevenDaysAgo)
          )
        );

      const requestsInLast7Days = recentUsage?.requests || 0;
      const dailyRate = requestsInLast7Days / 7;

      if (dailyRate === 0) {
        return {
          exhaustionDate: null,
          daysRemaining: null,
          currentRate: 0,
        };
      }

      const daysUntilExhaustion = quotaInfo.remaining / dailyRate;
      const exhaustionDate = new Date();
      exhaustionDate.setDate(exhaustionDate.getDate() + daysUntilExhaustion);

      return {
        exhaustionDate,
        daysRemaining: Math.ceil(daysUntilExhaustion),
        currentRate: Math.round(dailyRate),
      };
    } catch (error) {
      console.error('Failed to estimate quota exhaustion:', error);
      return {
        exhaustionDate: null,
        daysRemaining: null,
        currentRate: 0,
      };
    }
  }

  // Private helper methods

  private getCurrentBillingPeriod(quotaPeriod: string): BillingPeriod {
    const now = new Date();
    
    switch (quotaPeriod) {
      case 'hourly':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0),
          type: 'hourly',
        };
      
      case 'daily':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0),
          type: 'daily',
        };
      
      case 'monthly':
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0),
          type: 'monthly',
        };
    }
  }

  private getNextResetTime(quotaPeriod: string): Date {
    const period = this.getCurrentBillingPeriod(quotaPeriod);
    return period.end;
  }
}

// SQL import for raw queries
import { sql } from 'drizzle-orm';