import { Elysia, t } from 'elysia';
import { AnalyticsService } from '../services/analytics-service';
import {
  analyticsQuerySchema,
  apiUsageAnalyticsSchema,
  revenueAnalyticsSchema,
  userAnalyticsSchema,
  subscriptionAnalyticsSchema,
  performanceAnalyticsSchema,
  geographicAnalyticsSchema,
  realTimeAnalyticsSchema,
  customReportSchema,
  alertConfigSchema,
  exportDashboardSchema,
  abTestAnalyticsSchema,
  cohortAnalysisSchema,
  type AnalyticsQuery,
  type APIUsageAnalyticsQuery,
  type RevenueAnalyticsQuery,
  type UserAnalyticsQuery,
  type SubscriptionAnalyticsQuery,
  type PerformanceAnalyticsQuery,
  type GeographicAnalyticsQuery,
  type RealTimeAnalyticsQuery,
  type CustomReportRequest,
  type AlertConfigRequest,
  type ExportDashboardRequest,
  type ABTestAnalyticsQuery,
  type CohortAnalysisQuery
} from '../validation/analytics-validation';

const analyticsService = new AnalyticsService();

export const analyticsRoutes = new Elysia({ prefix: '/analytics' })
  // Get comprehensive dashboard
  .get('/dashboard', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const dashboard = await analyticsService.getUserDashboard(userId);

      return {
        success: true,
        data: dashboard,
        meta: {
          timestamp: new Date().toISOString(),
          generatedFor: userId,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch dashboard data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get API usage analytics
  .get('/api-usage', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedQuery = apiUsageAnalyticsSchema.parse(query);
      
      const analytics = await analyticsService.getAPIUsageAnalytics(
        userId,
        validatedQuery.api_uid,
        validatedQuery.from_date ? new Date(validatedQuery.from_date) : undefined,
        validatedQuery.to_date ? new Date(validatedQuery.to_date) : undefined,
        validatedQuery.granularity,
        validatedQuery.metrics
      );

      return {
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch API usage analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get revenue analytics
  .get('/revenue', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedQuery = revenueAnalyticsSchema.parse(query);
      
      const analytics = await analyticsService.getRevenueAnalytics(
        userId,
        validatedQuery.from_date ? new Date(validatedQuery.from_date) : undefined,
        validatedQuery.to_date ? new Date(validatedQuery.to_date) : undefined,
        validatedQuery.granularity,
        validatedQuery.currency
      );

      return {
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch revenue analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get user analytics
  .get('/users', async ({ query, set }) => {
    try {
      const validatedQuery = userAnalyticsSchema.parse(query);
      
      const analytics = await analyticsService.getUserAnalytics(
        validatedQuery.from_date ? new Date(validatedQuery.from_date) : undefined,
        validatedQuery.to_date ? new Date(validatedQuery.to_date) : undefined,
        validatedQuery.granularity,
        validatedQuery.user_type
      );

      return {
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch user analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get subscription analytics
  .get('/subscriptions', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedQuery = subscriptionAnalyticsSchema.parse(query);
      
      const analytics = await analyticsService.getSubscriptionAnalytics(
        userId,
        validatedQuery.from_date ? new Date(validatedQuery.from_date) : undefined,
        validatedQuery.to_date ? new Date(validatedQuery.to_date) : undefined,
        validatedQuery.granularity
      );

      return {
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch subscription analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get real-time metrics
  .get('/real-time', async ({ query, set }) => {
    try {
      const validatedQuery = realTimeAnalyticsSchema.parse(query);
      
      const metrics = await analyticsService.getRealTimeMetrics(
        validatedQuery.duration_minutes,
        validatedQuery.metrics,
        validatedQuery.api_uid
      );

      return {
        success: true,
        data: metrics,
        meta: {
          timestamp: new Date().toISOString(),
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch real-time metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get performance analytics for specific API
  .get('/performance/:apiUid', async ({ params, query, set }) => {
    try {
      const { apiUid } = params;
      const validatedQuery = performanceAnalyticsSchema.parse(query);
      
      const analytics = await analyticsService.getPerformanceAnalytics(
        apiUid,
        validatedQuery.from_date ? new Date(validatedQuery.from_date) : undefined,
        validatedQuery.to_date ? new Date(validatedQuery.to_date) : undefined,
        validatedQuery.percentiles
      );

      return {
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          apiUid,
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch performance analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get geographic analytics
  .get('/geographic', async ({ query, set }) => {
    try {
      const validatedQuery = geographicAnalyticsSchema.parse(query);
      
      const analytics = await analyticsService.getGeographicAnalytics(
        validatedQuery.from_date ? new Date(validatedQuery.from_date) : undefined,
        validatedQuery.to_date ? new Date(validatedQuery.to_date) : undefined,
        validatedQuery.country_codes,
        validatedQuery.metrics
      );

      return {
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch geographic analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Generate custom report
  .post('/reports', async ({ body, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedData = customReportSchema.parse(body);
      
      const report = await analyticsService.generateCustomReport(userId, {
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.query.type,
        parameters: validatedData.query.parameters,
        metrics: validatedData.query.metrics
      });

      set.status = 201;
      return {
        success: true,
        message: 'Custom report generated successfully',
        data: report,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to generate custom report',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      description: t.Optional(t.String({ maxLength: 500 })),
      query: t.Object({
        type: t.Union([
          t.Literal('api_usage'),
          t.Literal('revenue'),
          t.Literal('user'),
          t.Literal('subscription'),
          t.Literal('performance'),
          t.Literal('geographic')
        ]),
        parameters: t.Record(t.String(), t.Any()),
        filters: t.Optional(t.Record(t.String(), t.Any())),
        groupBy: t.Optional(t.Array(t.String())),
        metrics: t.Array(t.String(), { minItems: 1 })
      }),
      schedule: t.Optional(t.Object({
        enabled: t.Optional(t.Boolean()),
        frequency: t.Optional(t.Union([
          t.Literal('daily'),
          t.Literal('weekly'),
          t.Literal('monthly')
        ])),
        time: t.Optional(t.String()),
        dayOfWeek: t.Optional(t.Integer({ minimum: 0, maximum: 6 })),
        dayOfMonth: t.Optional(t.Integer({ minimum: 1, maximum: 31 }))
      })),
      recipients: t.Optional(t.Array(t.String({ format: 'email' }))),
      format: t.Optional(t.Union([
        t.Literal('json'),
        t.Literal('csv'),
        t.Literal('pdf'),
        t.Literal('excel')
      ]))
    })
  })

  // Create alert configuration
  .post('/alerts', async ({ body, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedData = alertConfigSchema.parse(body);
      
      const alert = await analyticsService.createAlert(userId, validatedData);

      set.status = 201;
      return {
        success: true,
        message: 'Alert configuration created successfully',
        data: alert,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to create alert configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      description: t.Optional(t.String({ maxLength: 500 })),
      metric: t.String({ minLength: 1 }),
      threshold: t.Object({
        operator: t.Union([
          t.Literal('gt'),
          t.Literal('gte'),
          t.Literal('lt'),
          t.Literal('lte'),
          t.Literal('eq'),
          t.Literal('ne')
        ]),
        value: t.Number(),
        unit: t.Optional(t.String())
      }),
      conditions: t.Optional(t.Array(t.Object({
        field: t.String(),
        operator: t.Union([
          t.Literal('eq'),
          t.Literal('ne'),
          t.Literal('contains'),
          t.Literal('in'),
          t.Literal('not_in')
        ]),
        value: t.Any()
      }))),
      duration_minutes: t.Optional(t.Integer({ minimum: 1 })),
      severity: t.Optional(t.Union([
        t.Literal('low'),
        t.Literal('medium'),
        t.Literal('high'),
        t.Literal('critical')
      ])),
      channels: t.Array(t.Object({
        type: t.Union([
          t.Literal('email'),
          t.Literal('webhook'),
          t.Literal('slack'),
          t.Literal('sms'),
          t.Literal('pagerduty')
        ]),
        config: t.Record(t.String(), t.Any())
      }), { minItems: 1 })
    })
  })

  // Export dashboard
  .post('/export', async ({ body, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedData = exportDashboardSchema.parse(body);
      
      const exportResult = await analyticsService.exportDashboard(
        userId,
        validatedData.dashboard_uid,
        validatedData.format,
        {
          from: new Date(validatedData.date_range.from),
          to: new Date(validatedData.date_range.to)
        },
        validatedData.include_data
      );

      return {
        success: true,
        message: 'Dashboard export initiated successfully',
        data: exportResult,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to export dashboard',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      dashboard_uid: t.String({ format: 'uuid' }),
      format: t.Union([
        t.Literal('json'),
        t.Literal('pdf'),
        t.Literal('png')
      ]),
      date_range: t.Object({
        from: t.String({ format: 'date-time' }),
        to: t.String({ format: 'date-time' })
      }),
      include_data: t.Optional(t.Boolean()),
      compress: t.Optional(t.Boolean())
    })
  })

  // Get A/B test analytics
  .get('/ab-test/:testId', async ({ params, query, set }) => {
    try {
      const { testId } = params;
      const validatedQuery = abTestAnalyticsSchema.parse(query);
      
      const results = await analyticsService.calculateABTestResults(
        testId,
        validatedQuery.confidence_level,
        validatedQuery.metrics
      );

      return {
        success: true,
        data: results,
        meta: {
          timestamp: new Date().toISOString(),
          testId,
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch A/B test analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get cohort analysis
  .get('/cohort', async ({ query, set }) => {
    try {
      const validatedQuery = cohortAnalysisSchema.parse(query);
      
      const analysis = await analyticsService.performCohortAnalysis(
        validatedQuery.cohort_type,
        validatedQuery.cohort_size,
        validatedQuery.periods,
        validatedQuery.metric
      );

      return {
        success: true,
        data: analysis,
        meta: {
          timestamp: new Date().toISOString(),
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to perform cohort analysis',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get trending APIs
  .get('/trending-apis', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      // Mock trending APIs data
      const trendingAPIs = [
        {
          apiUid: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Weather API',
          category: 'Weather & Climate',
          requests: 125000,
          growth: 45.2,
          rating: 4.8,
          subscribers: 1250
        },
        {
          apiUid: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Payment Processing API',
          category: 'Finance & Payments',
          requests: 98000,
          growth: 32.1,
          rating: 4.9,
          subscribers: 890
        },
        {
          apiUid: '550e8400-e29b-41d4-a716-446655440003',
          name: 'User Analytics API',
          category: 'Analytics',
          requests: 87000,
          growth: 28.7,
          rating: 4.7,
          subscribers: 756
        }
      ];

      return {
        success: true,
        data: trendingAPIs,
        meta: {
          timestamp: new Date().toISOString(),
          period: 'last_30_days',
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch trending APIs',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get API leaderboard
  .get('/leaderboard', async ({ query, set }) => {
    try {
      const metric = query.metric || 'requests';
      const period = query.period || '30d';
      
      // Mock leaderboard data
      const leaderboard = [
        { rank: 1, apiName: 'Weather API', value: 125000, change: 12 },
        { rank: 2, apiName: 'Payment API', value: 98000, change: 8 },
        { rank: 3, apiName: 'Analytics API', value: 87000, change: 15 },
        { rank: 4, apiName: 'Maps API', value: 76000, change: -3 },
        { rank: 5, apiName: 'Image API', value: 65000, change: 22 }
      ];

      return {
        success: true,
        data: {
          leaderboard,
          metric,
          period
        },
        meta: {
          timestamp: new Date().toISOString(),
          totalAPIs: 25,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch API leaderboard',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// Note: Admin analytics routes will be added to admin routes