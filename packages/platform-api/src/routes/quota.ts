import { Elysia, t } from 'elysia';
import { QuotaService } from '../services/quota-service';
import { authMiddleware } from '../middleware/auth';

const quotaService = new QuotaService();

export const quotaRoutes = new Elysia({ prefix: '/quota' })
  .use(authMiddleware)
  
  // Get quota information for API key
  .get('/:apiKeyId', async ({ params, user, set }) => {
    try {
      const apiKeyId = parseInt(params.apiKeyId);
      
      // TODO: Verify user owns this API key
      const quotaInfo = await quotaService.getQuotaInfo(apiKeyId);

      return {
        success: true,
        data: {
          apiKeyId,
          quota: quotaInfo
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
        message: 'Failed to fetch quota information',
        error: error.message
      };
    }
  }, {
    params: t.Object({
      apiKeyId: t.String()
    })
  })
  
  // Check quota availability
  .post('/:apiKeyId/check', async ({ params, body, user, set }) => {
    try {
      const apiKeyId = parseInt(params.apiKeyId);
      const { requestCount = 1 } = body as { requestCount?: number };
      
      // TODO: Verify user owns this API key
      const quotaCheck = await quotaService.checkQuota(apiKeyId, requestCount);

      return {
        success: true,
        data: {
          apiKeyId,
          ...quotaCheck
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
        message: 'Failed to check quota',
        error: error.message
      };
    }
  }, {
    params: t.Object({
      apiKeyId: t.String()
    }),
    body: t.Object({
      requestCount: t.Optional(t.Integer({ minimum: 1 }))
    })
  })
  
  // Get quota usage breakdown by API
  .get('/:apiKeyId/usage-by-api', async ({ params, user, set }) => {
    try {
      const apiKeyId = parseInt(params.apiKeyId);
      
      // TODO: Verify user owns this API key
      const usageBreakdown = await quotaService.getQuotaUsageByApi(apiKeyId);

      return {
        success: true,
        data: {
          apiKeyId,
          usage: usageBreakdown,
          totalApis: usageBreakdown.length
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
        message: 'Failed to fetch quota usage breakdown',
        error: error.message
      };
    }
  }, {
    params: t.Object({
      apiKeyId: t.String()
    })
  })
  
  // Get quota alerts for user's API keys
  .get('/alerts', async ({ query, user, set }) => {
    try {
      const { 
        thresholds = [80, 90, 95]
      } = query as { 
        thresholds?: number[];
      };
      
      const alerts = await quotaService.getQuotaAlerts(user.id, thresholds);

      return {
        success: true,
        data: {
          alerts,
          totalAlerts: alerts.length,
          criticalAlerts: alerts.filter(alert => alert.severity === 'critical').length,
          warningAlerts: alerts.filter(alert => alert.severity === 'warning').length
        },
        meta: {
          timestamp: new Date().toISOString(),
          userId: user.id,
          thresholds
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch quota alerts',
        error: error.message
      };
    }
  })
  
  // Get quota exhaustion estimate
  .get('/:apiKeyId/exhaustion-estimate', async ({ params, user, set }) => {
    try {
      const apiKeyId = parseInt(params.apiKeyId);
      
      // TODO: Verify user owns this API key
      const estimate = await quotaService.estimateQuotaExhaustion(apiKeyId);

      return {
        success: true,
        data: {
          apiKeyId,
          estimate: {
            exhaustionDate: estimate.exhaustionDate?.toISOString() || null,
            daysRemaining: estimate.daysRemaining,
            currentDailyRate: estimate.currentRate,
            status: estimate.daysRemaining !== null 
              ? (estimate.daysRemaining <= 7 ? 'urgent' : 'normal')
              : 'unlimited'
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
        message: 'Failed to estimate quota exhaustion',
        error: error.message
      };
    }
  }, {
    params: t.Object({
      apiKeyId: t.String()
    })
  })
  
  // Get quota summary for dashboard
  .get('/summary', async ({ user, set }) => {
    try {
      // TODO: Get user's API keys and calculate summary
      const alerts = await quotaService.getQuotaAlerts(user.id);
      
      // Mock data for now - would calculate from user's actual API keys
      const summary = {
        totalApiKeys: 3,
        quotaUsage: {
          totalUsed: 15420,
          totalLimit: 50000,
          percentageUsed: 30.84
        },
        alerts: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          warning: alerts.filter(a => a.severity === 'warning').length
        },
        topConsumers: [
          { apiKeyName: 'Production API', used: 8500, limit: 20000 },
          { apiKeyName: 'Development API', used: 4200, limit: 15000 },
          { apiKeyName: 'Testing API', used: 2720, limit: 15000 }
        ],
        trends: {
          dailyAverage: 850,
          weeklyGrowth: 12.5, // percentage
          projectedMonthlyUsage: 25500
        }
      };

      return {
        success: true,
        data: summary,
        meta: {
          timestamp: new Date().toISOString(),
          userId: user.id
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch quota summary',
        error: error.message
      };
    }
  });