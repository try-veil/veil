import { z } from 'zod';

// Create subscription schema
export const createSubscriptionSchema = z.object({
  apiUid: z.string()
    .uuid('API UID must be a valid UUID'),
  requestsLimit: z.number()
    .int('Request limit must be an integer')
    .min(1, 'Request limit must be at least 1')
    .max(1000000, 'Request limit cannot exceed 1,000,000')
    .optional(),
  keyName: z.string()
    .min(1, 'Key name is required')
    .max(100, 'Key name must be less than 100 characters')
    .trim()
    .optional(),
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .trim()
    .optional()
});

// Update subscription schema
export const updateSubscriptionSchema = z.object({
  requestsLimit: z.number()
    .int('Request limit must be an integer')
    .min(1, 'Request limit must be at least 1')
    .max(1000000, 'Request limit cannot exceed 1,000,000')
    .optional(),
  status: z.enum(['active', 'suspended', 'cancelled'])
    .optional()
});

// Subscription parameters
export const subscriptionParamsSchema = z.object({
  uid: z.string()
    .uuid('Subscription UID must be a valid UUID'),
});

// Subscription query parameters
export const subscriptionQuerySchema = z.object({
  page: z.string()
    .optional()
    .transform((val) => val ? Math.max(1, parseInt(val, 10)) : 1),
  limit: z.string()
    .optional()
    .transform((val) => val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20),
  status: z.enum(['active', 'suspended', 'cancelled', 'all'])
    .default('all')
    .optional(),
  api_uid: z.string()
    .uuid('API UID must be a valid UUID')
    .optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'api_name', 'status', 'usage'])
    .default('created_at')
    .optional(),
  sort_order: z.enum(['asc', 'desc'])
    .default('desc')
    .optional()
});

// Cancel subscription schema
export const cancelSubscriptionSchema = z.object({
  reason: z.string()
    .max(500, 'Cancellation reason must be less than 500 characters')
    .trim()
    .optional()
});

// Usage update schema (for internal use)
export const updateUsageSchema = z.object({
  requests_used: z.number()
    .int('Requests used must be an integer')
    .min(0, 'Requests used cannot be negative'),
  increment: z.number()
    .int('Increment must be an integer')
    .min(1, 'Increment must be at least 1')
    .default(1)
    .optional()
});

// Subscription filters schema
export const subscriptionFiltersSchema = z.object({
  status: z.enum(['active', 'suspended', 'cancelled'])
    .optional(),
  api_id: z.number()
    .int('API ID must be an integer')
    .positive('API ID must be positive')
    .optional(),
  user_id: z.number()
    .int('User ID must be an integer')
    .positive('User ID must be positive')
    .optional(),
  from_date: z.string()
    .datetime('From date must be a valid ISO datetime')
    .optional(),
  to_date: z.string()
    .datetime('To date must be a valid ISO datetime')
    .optional()
});

// Admin subscription operations
export const adminSubscriptionActionSchema = z.object({
  action: z.enum(['suspend', 'reactivate', 'cancel']),
  reason: z.string()
    .max(500, 'Reason must be less than 500 characters')
    .trim()
    .optional()
});

// Bulk subscription operations
export const bulkSubscriptionSchema = z.object({
  subscription_uids: z.array(z.string().uuid())
    .min(1, 'At least one subscription UID is required')
    .max(100, 'Cannot process more than 100 subscriptions at once'),
  action: z.enum(['suspend', 'reactivate', 'cancel']),
  reason: z.string()
    .max(500, 'Reason must be less than 500 characters')
    .trim()
    .optional()
});

// Usage analytics query
export const usageAnalyticsQuerySchema = z.object({
  from_date: z.string()
    .datetime('From date must be a valid ISO datetime')
    .optional(),
  to_date: z.string()
    .datetime('To date must be a valid ISO datetime')
    .optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month'])
    .default('day')
    .optional(),
  include_details: z.boolean()
    .default(false)
    .optional()
});

// Subscription renewal schema
export const renewSubscriptionSchema = z.object({
  duration_months: z.number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 month')
    .max(24, 'Duration cannot exceed 24 months')
    .default(1)
    .optional(),
  auto_renew: z.boolean()
    .default(false)
    .optional()
});

// Type exports
export type CreateSubscriptionRequest = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionRequest = z.infer<typeof updateSubscriptionSchema>;
export type SubscriptionParams = z.infer<typeof subscriptionParamsSchema>;
export type SubscriptionQuery = z.infer<typeof subscriptionQuerySchema>;
export type CancelSubscriptionRequest = z.infer<typeof cancelSubscriptionSchema>;
export type UpdateUsageRequest = z.infer<typeof updateUsageSchema>;
export type SubscriptionFilters = z.infer<typeof subscriptionFiltersSchema>;
export type AdminSubscriptionAction = z.infer<typeof adminSubscriptionActionSchema>;
export type BulkSubscriptionRequest = z.infer<typeof bulkSubscriptionSchema>;
export type UsageAnalyticsQuery = z.infer<typeof usageAnalyticsQuerySchema>;
export type RenewSubscriptionRequest = z.infer<typeof renewSubscriptionSchema>;