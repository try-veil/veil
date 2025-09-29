import { z } from 'zod';

// Create API key schema
export const createAPIKeySchema = z.object({
  subscriptionUid: z.string()
    .uuid('Subscription UID must be a valid UUID'),
  name: z.string()
    .min(1, 'API key name is required')
    .max(100, 'API key name must be less than 100 characters')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'API key name can only contain letters, numbers, spaces, hyphens, underscores, and dots'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),
  expiresAt: z.string()
    .datetime('Expiration date must be a valid ISO datetime')
    .optional()
    .refine((date) => {
      if (!date) return true;
      return new Date(date) > new Date();
    }, 'Expiration date must be in the future'),
  permissions: z.array(z.enum(['read', 'write', 'admin']))
    .default(['read'])
    .optional()
});

// Update API key schema
export const updateAPIKeySchema = z.object({
  name: z.string()
    .min(1, 'API key name is required')
    .max(100, 'API key name must be less than 100 characters')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'API key name can only contain letters, numbers, spaces, hyphens, underscores, and dots')
    .optional(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),
  isActive: z.boolean()
    .optional(),
  expiresAt: z.string()
    .datetime('Expiration date must be a valid ISO datetime')
    .nullable()
    .optional()
    .refine((date) => {
      if (!date) return true;
      return new Date(date) > new Date();
    }, 'Expiration date must be in the future'),
  permissions: z.array(z.enum(['read', 'write', 'admin']))
    .optional()
});

// API key parameters
export const apiKeyParamsSchema = z.object({
  uid: z.string()
    .uuid('API key UID must be a valid UUID'),
});

// API key query parameters
export const apiKeyQuerySchema = z.object({
  page: z.string()
    .optional()
    .transform((val) => val ? Math.max(1, parseInt(val, 10)) : 1),
  limit: z.string()
    .optional()
    .transform((val) => val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20),
  subscription_uid: z.string()
    .uuid('Subscription UID must be a valid UUID')
    .optional(),
  status: z.enum(['active', 'inactive', 'expired', 'all'])
    .default('all')
    .optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'name', 'last_used', 'expires_at'])
    .default('created_at')
    .optional(),
  sort_order: z.enum(['asc', 'desc'])
    .default('desc')
    .optional()
});

// Regenerate API key schema
export const regenerateAPIKeySchema = z.object({
  reason: z.string()
    .min(1, 'Reason is required for key regeneration')
    .max(500, 'Reason must be less than 500 characters')
    .trim()
});

// Revoke API key schema
export const revokeAPIKeySchema = z.object({
  reason: z.string()
    .max(500, 'Reason must be less than 500 characters')
    .trim()
    .optional()
});

// Bulk API key operations
export const bulkAPIKeySchema = z.object({
  api_key_uids: z.array(z.string().uuid())
    .min(1, 'At least one API key UID is required')
    .max(50, 'Cannot process more than 50 API keys at once'),
  action: z.enum(['activate', 'deactivate', 'delete']),
  reason: z.string()
    .max(500, 'Reason must be less than 500 characters')
    .trim()
    .optional()
});

// API key usage query
export const apiKeyUsageQuerySchema = z.object({
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

// API key rotation schema
export const rotateAPIKeySchema = z.object({
  rotation_period_days: z.number()
    .int('Rotation period must be an integer')
    .min(1, 'Rotation period must be at least 1 day')
    .max(365, 'Rotation period cannot exceed 365 days')
    .optional(),
  auto_rotate: z.boolean()
    .default(false)
    .optional(),
  notification_days: z.number()
    .int('Notification days must be an integer')
    .min(1, 'Notification days must be at least 1')
    .max(30, 'Notification days cannot exceed 30')
    .default(7)
    .optional()
});

// API key filters schema
export const apiKeyFiltersSchema = z.object({
  subscription_id: z.number()
    .int('Subscription ID must be an integer')
    .positive('Subscription ID must be positive')
    .optional(),
  user_id: z.number()
    .int('User ID must be an integer')
    .positive('User ID must be positive')
    .optional(),
  is_active: z.boolean()
    .optional(),
  is_expired: z.boolean()
    .optional(),
  created_after: z.string()
    .datetime('Created after date must be a valid ISO datetime')
    .optional(),
  created_before: z.string()
    .datetime('Created before date must be a valid ISO datetime')
    .optional(),
  last_used_after: z.string()
    .datetime('Last used after date must be a valid ISO datetime')
    .optional(),
  last_used_before: z.string()
    .datetime('Last used before date must be a valid ISO datetime')
    .optional()
});

// Type exports
export type CreateAPIKeyRequest = z.infer<typeof createAPIKeySchema>;
export type UpdateAPIKeyRequest = z.infer<typeof updateAPIKeySchema>;
export type APIKeyParams = z.infer<typeof apiKeyParamsSchema>;
export type APIKeyQuery = z.infer<typeof apiKeyQuerySchema>;
export type RegenerateAPIKeyRequest = z.infer<typeof regenerateAPIKeySchema>;
export type RevokeAPIKeyRequest = z.infer<typeof revokeAPIKeySchema>;
export type BulkAPIKeyRequest = z.infer<typeof bulkAPIKeySchema>;
export type APIKeyUsageQuery = z.infer<typeof apiKeyUsageQuerySchema>;
export type RotateAPIKeyRequest = z.infer<typeof rotateAPIKeySchema>;
export type APIKeyFilters = z.infer<typeof apiKeyFiltersSchema>;