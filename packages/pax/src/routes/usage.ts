import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth';
import { usageAnalyticsService } from '../services/usage-analytics-service';

export const usageRoutes = new Elysia({ prefix: '/api/v1/usage' })
  .use(authMiddleware)
  .get('/records', async ({ user, query }) => {
    const filters: any = {
      userId: user.id,
    };

    if (query.apiId) filters.apiId = parseInt(query.apiId);
    if (query.fromDate) filters.fromDate = new Date(query.fromDate);
    if (query.toDate) filters.toDate = new Date(query.toDate);
    if (query.limit) filters.limit = parseInt(query.limit);
    if (query.offset) filters.offset = parseInt(query.offset);

    const records = await usageAnalyticsService.getUsageRecords(filters);

    return {
      success: true,
      data: records,
    };
  }, {
    query: t.Object({
      apiId: t.Optional(t.String()),
      fromDate: t.Optional(t.String()),
      toDate: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Usage'],
      summary: 'Get usage records',
      description: 'Get usage history for the authenticated user',
    },
  })
  .get('/summary', async ({ user, query }) => {
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (query.fromDate) fromDate = new Date(query.fromDate);
    if (query.toDate) toDate = new Date(query.toDate);

    const summary = await usageAnalyticsService.getUserSummary(user.id, fromDate, toDate);

    return {
      success: true,
      data: summary,
    };
  }, {
    query: t.Object({
      fromDate: t.Optional(t.String()),
      toDate: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Usage'],
      summary: 'Get usage summary',
      description: 'Get aggregated usage statistics',
    },
  })
  .get('/analytics', async ({ user, query }) => {
    const filters: any = {
      userId: user.id,
    };

    if (query.apiId) filters.apiId = parseInt(query.apiId);
    if (query.fromDate) filters.fromDate = new Date(query.fromDate);
    if (query.toDate) filters.toDate = new Date(query.toDate);

    const analytics = await usageAnalyticsService.getUsageAnalytics(filters);

    return {
      success: true,
      data: analytics,
    };
  }, {
    query: t.Object({
      apiId: t.Optional(t.String()),
      fromDate: t.Optional(t.String()),
      toDate: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Usage'],
      summary: 'Get usage analytics',
      description: 'Get detailed usage analytics and insights',
    },
  });
