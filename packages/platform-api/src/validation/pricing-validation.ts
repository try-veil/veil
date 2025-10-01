import { z } from 'zod';

/**
 * Pricing Model Validation Schemas
 */

// Query schema for listing pricing models
export const pricingModelQuerySchema = z.object({
  type: z.enum(['usage_based', 'subscription', 'freemium', 'hybrid', 'all']).optional().default('all'),
  billing_cycle: z.enum(['monthly', 'yearly', 'one_time', 'all']).optional().default('all'),
  is_active: z.enum(['true', 'false', 'all']).optional().default('true'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type PricingModelQuery = z.infer<typeof pricingModelQuerySchema>;

// Params schema for getting a specific pricing model
export const pricingModelParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type PricingModelParams = z.infer<typeof pricingModelParamsSchema>;

/**
 * Price Calculation Schemas
 */

export const calculatePriceSchema = z.object({
  apiUid: z.string().uuid('Invalid API UID'),
  pricingModelId: z.number().int().positive('Pricing model ID must be positive'),
  usage: z.object({
    subscriptionId: z.number().int().positive(),
    totalRequests: z.number().int().min(0, 'Total requests must be non-negative'),
    successfulRequests: z.number().int().min(0, 'Successful requests must be non-negative'),
    failedRequests: z.number().int().min(0, 'Failed requests must be non-negative'),
    dataTransferredBytes: z.number().int().min(0, 'Data transferred must be non-negative'),
    dataTransferredGB: z.number().min(0, 'Data transferred GB must be non-negative'),
  }),
  promotionCode: z.string().min(1).max(50).optional(),
});

export type CalculatePriceRequest = z.infer<typeof calculatePriceSchema>;

/**
 * Promotion Validation Schemas
 */

// Validate promotion code
export const validatePromotionSchema = z.object({
  code: z.string().min(1, 'Promotion code is required').max(50),
});

export type ValidatePromotionRequest = z.infer<typeof validatePromotionSchema>;

// Apply promotion to subscription
export const applyPromotionSchema = z.object({
  subscriptionUid: z.string().uuid('Invalid subscription UID'),
  code: z.string().min(1, 'Promotion code is required').max(50),
});

export type ApplyPromotionRequest = z.infer<typeof applyPromotionSchema>;

/**
 * Invoice Validation Schemas
 */

// Query schema for listing invoices
export const invoiceQuerySchema = z.object({
  subscription_uid: z.string().uuid().optional(),
  status: z.enum(['draft', 'pending', 'paid', 'overdue', 'cancelled', 'all']).optional().default('all'),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  min_amount: z.coerce.number().min(0).optional(),
  max_amount: z.coerce.number().min(0).optional(),
  sort_by: z.enum(['issue_date', 'due_date', 'amount', 'status']).optional().default('issue_date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;

// Params schema for getting a specific invoice
export const invoiceParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type InvoiceParams = z.infer<typeof invoiceParamsSchema>;

// Mark invoice as paid
export const markInvoicePaidSchema = z.object({
  paidDate: z.string().datetime().optional(),
  paymentMethod: z.string().min(1).max(100).optional(),
  transactionId: z.string().min(1).max(200).optional(),
  notes: z.string().max(500).optional(),
});

export type MarkInvoicePaidRequest = z.infer<typeof markInvoicePaidSchema>;

/**
 * Billing Period Validation Schemas
 */

// Query schema for listing billing periods
export const billingPeriodQuerySchema = z.object({
  subscription_uid: z.string().uuid('Invalid subscription UID'),
  status: z.enum(['active', 'closed', 'cancelled', 'all']).optional().default('all'),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type BillingPeriodQuery = z.infer<typeof billingPeriodQuerySchema>;

// Get current billing period for subscription
export const currentBillingPeriodParamsSchema = z.object({
  subscription_uid: z.string().uuid('Invalid subscription UID'),
});

export type CurrentBillingPeriodParams = z.infer<typeof currentBillingPeriodParamsSchema>;

/**
 * Subscription Upgrade Schemas
 */

export const upgradeSubscriptionSchema = z.object({
  newPricingModelId: z.number().int().positive('Pricing model ID must be positive'),
  effectiveDate: z.string().datetime().optional(), // If not provided, upgrade immediately
  prorationCredit: z.boolean().optional().default(true), // Whether to credit prorated amount
  notes: z.string().max(500).optional(),
});

export type UpgradeSubscriptionRequest = z.infer<typeof upgradeSubscriptionSchema>;

export const upgradeSubscriptionParamsSchema = z.object({
  subscription_uid: z.string().uuid('Invalid subscription UID'),
});

export type UpgradeSubscriptionParams = z.infer<typeof upgradeSubscriptionParamsSchema>;

/**
 * Admin Pricing Model Management Schemas
 */

// Create pricing model (admin only)
export const createPricingModelSchema = z.object({
  uid: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['usage_based', 'subscription', 'freemium', 'hybrid']),
  billingCycle: z.enum(['monthly', 'yearly', 'one_time']),
  currency: z.string().length(3, 'Currency must be a 3-letter code').default('USD'),
  basePrice: z.number().min(0).optional(),
  config: z.object({
    includedUsage: z.object({
      requests: z.number().int().min(0),
      dataTransferGB: z.number().min(0).optional(),
      features: z.array(z.string()).optional(),
    }).optional(),
    tiers: z.array(z.object({
      name: z.string().min(1).max(100),
      limitRequests: z.number().int().positive().optional(),
      pricePerUnit: z.number().min(0),
      baseFee: z.number().min(0).default(0),
      features: z.array(z.string()).optional(),
    })).optional(),
    quotas: z.object({
      requestsPerMonth: z.number().int().positive().optional(),
      requestsPerHour: z.number().int().positive().optional(),
      requestsPerDay: z.number().int().positive().optional(),
      dataTransferGB: z.number().min(0).optional(),
      concurrentRequests: z.number().int().positive().optional(),
    }).optional(),
    overage: z.object({
      enabled: z.boolean(),
      requestsPricePerUnit: z.number().min(0),
      dataPricePerGB: z.number().min(0).optional(),
      graceRequests: z.number().int().min(0).optional(),
    }).optional(),
  }),
  isActive: z.boolean().optional().default(true),
});

export type CreatePricingModelRequest = z.infer<typeof createPricingModelSchema>;

// Update pricing model (admin only)
export const updatePricingModelSchema = createPricingModelSchema.partial().omit({ uid: true });

export type UpdatePricingModelRequest = z.infer<typeof updatePricingModelSchema>;

/**
 * Admin Promotion Management Schemas
 */

// Create promotion (admin only)
export const createPromotionSchema = z.object({
  uid: z.string().uuid().optional(),
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['percentage_discount', 'fixed_discount', 'tier_upgrade', 'free_trial']),
  value: z.number().min(0, 'Value must be non-negative'),
  maxUses: z.number().int().positive().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional(),
  conditions: z.array(z.object({
    type: z.enum(['first_subscription', 'usage_threshold', 'user_created_after', 'api_category', 'custom']),
    metric: z.string().optional(),
    value: z.union([z.string(), z.number()]).optional(),
    operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']).optional(),
  })).optional().default([]),
  priority: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export type CreatePromotionRequest = z.infer<typeof createPromotionSchema>;

// Update promotion (admin only)
export const updatePromotionSchema = createPromotionSchema.partial().omit({ uid: true });

export type UpdatePromotionRequest = z.infer<typeof updatePromotionSchema>;

export const promotionParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type PromotionParams = z.infer<typeof promotionParamsSchema>;

/**
 * Revenue Analytics Schemas
 */

export const revenueStatsQuerySchema = z.object({
  from_date: z.string().datetime(),
  to_date: z.string().datetime(),
  group_by: z.enum(['day', 'week', 'month']).optional().default('month'),
});

export type RevenueStatsQuery = z.infer<typeof revenueStatsQuerySchema>;