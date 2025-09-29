import { z } from 'zod';

// Base analytics query schema
export const analyticsQuerySchema = z.object({
  from_date: z.string()
    .datetime('From date must be a valid ISO datetime')
    .optional(),
  to_date: z.string()
    .datetime('To date must be a valid ISO datetime')
    .optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year'])
    .default('day')
    .optional(),
  timezone: z.string()
    .default('UTC')
    .optional(),
});

// API usage analytics schema
export const apiUsageAnalyticsSchema = analyticsQuerySchema.extend({
  api_uid: z.string()
    .uuid('API UID must be a valid UUID')
    .optional(),
  subscription_uid: z.string()
    .uuid('Subscription UID must be a valid UUID')
    .optional(),
  status_codes: z.array(z.number().int().min(100).max(599))
    .optional(),
  group_by: z.enum(['api', 'user', 'subscription', 'status_code', 'country', 'device'])
    .optional(),
  metrics: z.array(z.enum([
    'total_requests',
    'unique_users',
    'response_time_avg',
    'response_time_p95',
    'success_rate',
    'error_rate',
    'bandwidth_used',
    'cache_hit_rate'
  ]))
    .default(['total_requests', 'success_rate'])
    .optional(),
});

// Revenue analytics schema
export const revenueAnalyticsSchema = analyticsQuerySchema.extend({
  currency: z.string()
    .length(3, 'Currency must be 3-letter code')
    .default('USD')
    .optional(),
  subscription_plan: z.enum(['basic', 'pro', 'enterprise', 'custom'])
    .optional(),
  payment_provider: z.enum(['stripe', 'paypal', 'razorpay', 'square', 'coinbase'])
    .optional(),
  group_by: z.enum(['plan', 'provider', 'api', 'user', 'country'])
    .optional(),
  metrics: z.array(z.enum([
    'total_revenue',
    'mrr', // Monthly Recurring Revenue
    'arr', // Annual Recurring Revenue
    'average_order_value',
    'customer_lifetime_value',
    'churn_rate',
    'conversion_rate',
    'refund_rate'
  ]))
    .default(['total_revenue', 'mrr'])
    .optional(),
});

// User analytics schema
export const userAnalyticsSchema = analyticsQuerySchema.extend({
  user_type: z.enum(['consumer', 'provider', 'admin', 'all'])
    .default('all')
    .optional(),
  registration_source: z.enum(['web', 'mobile', 'api', 'referral', 'all'])
    .default('all')
    .optional(),
  group_by: z.enum(['registration_date', 'country', 'source', 'plan', 'activity_level'])
    .optional(),
  metrics: z.array(z.enum([
    'new_users',
    'active_users',
    'returning_users',
    'user_retention',
    'session_duration',
    'page_views',
    'bounce_rate',
    'conversion_rate'
  ]))
    .default(['new_users', 'active_users'])
    .optional(),
});

// Subscription analytics schema
export const subscriptionAnalyticsSchema = analyticsQuerySchema.extend({
  plan_type: z.enum(['basic', 'pro', 'enterprise', 'custom'])
    .optional(),
  status: z.enum(['active', 'suspended', 'cancelled', 'all'])
    .default('all')
    .optional(),
  api_uid: z.string()
    .uuid('API UID must be a valid UUID')
    .optional(),
  group_by: z.enum(['plan', 'api', 'status', 'creation_date', 'country'])
    .optional(),
  metrics: z.array(z.enum([
    'new_subscriptions',
    'cancelled_subscriptions',
    'subscription_growth_rate',
    'churn_rate',
    'upgrade_rate',
    'downgrade_rate',
    'usage_rate',
    'api_adoption_rate'
  ]))
    .default(['new_subscriptions', 'churn_rate'])
    .optional(),
});

// Performance analytics schema
export const performanceAnalyticsSchema = analyticsQuerySchema.extend({
  api_uid: z.string()
    .uuid('API UID must be a valid UUID')
    .optional(),
  endpoint: z.string()
    .optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    .optional(),
  percentiles: z.array(z.number().min(1).max(99))
    .default([50, 95, 99])
    .optional(),
  metrics: z.array(z.enum([
    'response_time',
    'throughput',
    'error_rate',
    'availability',
    'apdex_score',
    'memory_usage',
    'cpu_usage',
    'disk_io'
  ]))
    .default(['response_time', 'throughput', 'error_rate'])
    .optional(),
});

// Geographic analytics schema
export const geographicAnalyticsSchema = analyticsQuerySchema.extend({
  country_codes: z.array(z.string().length(2))
    .optional(),
  region: z.enum(['NA', 'EU', 'APAC', 'SA', 'AF', 'ME'])
    .optional(),
  metrics: z.array(z.enum([
    'request_volume',
    'unique_users',
    'revenue',
    'response_time',
    'conversion_rate',
    'bounce_rate'
  ]))
    .default(['request_volume', 'unique_users'])
    .optional(),
});

// Real-time analytics schema
export const realTimeAnalyticsSchema = z.object({
  duration_minutes: z.number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 minute')
    .max(1440, 'Duration cannot exceed 1440 minutes (24 hours)')
    .default(60),
  metrics: z.array(z.enum([
    'active_requests',
    'requests_per_second',
    'active_users',
    'error_rate',
    'response_time',
    'queue_length'
  ]))
    .default(['active_requests', 'requests_per_second'])
    .optional(),
  api_uid: z.string()
    .uuid('API UID must be a valid UUID')
    .optional(),
});

// Custom report schema
export const customReportSchema = z.object({
  name: z.string()
    .min(1, 'Report name is required')
    .max(100, 'Report name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  query: z.object({
    type: z.enum(['api_usage', 'revenue', 'user', 'subscription', 'performance', 'geographic']),
    parameters: z.record(z.string(), z.any()),
    filters: z.record(z.string(), z.any()).optional(),
    groupBy: z.array(z.string()).optional(),
    metrics: z.array(z.string()).min(1, 'At least one metric is required'),
  }),
  schedule: z.object({
    enabled: z.boolean().default(false),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format').optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(), // 0 = Sunday
    dayOfMonth: z.number().int().min(1).max(31).optional(),
  }).optional(),
  recipients: z.array(z.string().email()).optional(),
  format: z.enum(['json', 'csv', 'pdf', 'excel'])
    .default('json')
    .optional(),
});

// Alert configuration schema
export const alertConfigSchema = z.object({
  name: z.string()
    .min(1, 'Alert name is required')
    .max(100, 'Alert name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  metric: z.string()
    .min(1, 'Metric is required'),
  threshold: z.object({
    operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'ne']),
    value: z.number(),
    unit: z.string().optional(),
  }),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'contains', 'in', 'not_in']),
    value: z.any(),
  })).optional(),
  duration_minutes: z.number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 minute')
    .default(5),
  severity: z.enum(['low', 'medium', 'high', 'critical'])
    .default('medium'),
  channels: z.array(z.object({
    type: z.enum(['email', 'webhook', 'slack', 'sms', 'pagerduty']),
    config: z.record(z.string(), z.any()),
  })).min(1, 'At least one notification channel is required'),
  enabled: z.boolean().default(true),
});

// Export dashboard schema
export const exportDashboardSchema = z.object({
  dashboard_uid: z.string()
    .uuid('Dashboard UID must be a valid UUID'),
  format: z.enum(['json', 'pdf', 'png']),
  date_range: z.object({
    from: z.string().datetime('From date must be a valid ISO datetime'),
    to: z.string().datetime('To date must be a valid ISO datetime'),
  }),
  include_data: z.boolean().default(true),
  compress: z.boolean().default(false),
});

// A/B test analytics schema
export const abTestAnalyticsSchema = analyticsQuerySchema.extend({
  test_id: z.string().min(1, 'Test ID is required'),
  variant: z.string().optional(),
  confidence_level: z.number()
    .min(0.8)
    .max(0.99)
    .default(0.95),
  metrics: z.array(z.enum([
    'conversion_rate',
    'revenue_per_user',
    'engagement_rate',
    'retention_rate',
    'bounce_rate',
    'session_duration'
  ]))
    .default(['conversion_rate'])
    .optional(),
});

// Cohort analysis schema
export const cohortAnalysisSchema = analyticsQuerySchema.extend({
  cohort_type: z.enum(['registration', 'first_purchase', 'first_api_call'])
    .default('registration'),
  cohort_size: z.enum(['daily', 'weekly', 'monthly'])
    .default('monthly'),
  periods: z.number()
    .int('Periods must be an integer')
    .min(1, 'Periods must be at least 1')
    .max(24, 'Periods cannot exceed 24')
    .default(12),
  metric: z.enum(['retention', 'revenue', 'activity'])
    .default('retention'),
});

// Type exports
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type APIUsageAnalyticsQuery = z.infer<typeof apiUsageAnalyticsSchema>;
export type RevenueAnalyticsQuery = z.infer<typeof revenueAnalyticsSchema>;
export type UserAnalyticsQuery = z.infer<typeof userAnalyticsSchema>;
export type SubscriptionAnalyticsQuery = z.infer<typeof subscriptionAnalyticsSchema>;
export type PerformanceAnalyticsQuery = z.infer<typeof performanceAnalyticsSchema>;
export type GeographicAnalyticsQuery = z.infer<typeof geographicAnalyticsSchema>;
export type RealTimeAnalyticsQuery = z.infer<typeof realTimeAnalyticsSchema>;
export type CustomReportRequest = z.infer<typeof customReportSchema>;
export type AlertConfigRequest = z.infer<typeof alertConfigSchema>;
export type ExportDashboardRequest = z.infer<typeof exportDashboardSchema>;
export type ABTestAnalyticsQuery = z.infer<typeof abTestAnalyticsSchema>;
export type CohortAnalysisQuery = z.infer<typeof cohortAnalysisSchema>;