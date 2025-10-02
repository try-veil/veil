import { z } from 'zod';

// Payment method schema
export const paymentMethodSchema = z.object({
  type: z.enum(['card', 'bank_account', 'wallet', 'crypto']),
  provider: z.enum(['stripe', 'paypal', 'razorpay', 'square', 'coinbase']),
  details: z.record(z.string(), z.any()).optional(), // Flexible object for provider-specific data
});

// Create payment record schema
export const createPaymentSchema = z.object({
  subscriptionUid: z.string()
    .uuid('Subscription UID must be a valid UUID'),
  amount: z.number()
    .positive('Amount must be positive')
    .max(100000, 'Amount cannot exceed 100,000'),
  currency: z.string()
    .length(3, 'Currency must be a 3-letter code')
    .toUpperCase()
    .default('USD'),
  paymentMethod: paymentMethodSchema,
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Process payment schema
export const processPaymentSchema = z.object({
  paymentRecordUid: z.string()
    .uuid('Payment record UID must be a valid UUID'),
  paymentToken: z.string()
    .min(1, 'Payment token is required'),
  billingAddress: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    addressLine1: z.string().min(1, 'Address line 1 is required'),
    addressLine2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().length(2, 'Country must be 2-letter code'),
  }),
  savePaymentMethod: z.boolean().default(false),
});

// Refund payment schema
export const refundPaymentSchema = z.object({
  paymentRecordUid: z.string()
    .uuid('Payment record UID must be a valid UUID'),
  amount: z.number()
    .positive('Refund amount must be positive')
    .optional(), // If not provided, full refund
  reason: z.string()
    .min(1, 'Reason is required for refunds')
    .max(500, 'Reason must be less than 500 characters'),
  notifyCustomer: z.boolean().default(true),
});

// Payment query schema
export const paymentQuerySchema = z.object({
  page: z.string()
    .optional()
    .transform((val) => val ? Math.max(1, parseInt(val, 10)) : 1),
  limit: z.string()
    .optional()
    .transform((val) => val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'all'])
    .default('all')
    .optional(),
  payment_provider: z.enum(['stripe', 'paypal', 'razorpay', 'square', 'coinbase', 'all'])
    .default('all')
    .optional(),
  subscription_uid: z.string()
    .uuid('Subscription UID must be a valid UUID')
    .optional(),
  from_date: z.string()
    .datetime('From date must be a valid ISO datetime')
    .optional(),
  to_date: z.string()
    .datetime('To date must be a valid ISO datetime')
    .optional(),
  min_amount: z.string()
    .optional()
    .transform((val) => val ? parseFloat(val) : undefined),
  max_amount: z.string()
    .optional()
    .transform((val) => val ? parseFloat(val) : undefined),
  sort_by: z.enum(['created_at', 'updated_at', 'amount', 'status'])
    .default('created_at')
    .optional(),
  sort_order: z.enum(['asc', 'desc'])
    .default('desc')
    .optional(),
});

// Payment parameters schema
export const paymentParamsSchema = z.object({
  uid: z.string()
    .uuid('Payment UID must be a valid UUID'),
});

// Webhook validation schema
export const webhookSchema = z.object({
  provider: z.enum(['stripe', 'paypal', 'razorpay', 'square', 'coinbase']),
  eventType: z.string().min(1, 'Event type is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  data: z.record(z.string(), z.any()),
  signature: z.string().optional(),
  timestamp: z.number().optional(),
});

// Payment analytics schema
export const paymentAnalyticsQuerySchema = z.object({
  from_date: z.string()
    .datetime('From date must be a valid ISO datetime')
    .optional(),
  to_date: z.string()
    .datetime('To date must be a valid ISO datetime')
    .optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month'])
    .default('day')
    .optional(),
  metrics: z.array(z.enum([
    'total_revenue',
    'successful_payments',
    'failed_payments',
    'refund_amount',
    'average_transaction_value',
    'conversion_rate'
  ]))
    .default(['total_revenue', 'successful_payments'])
    .optional(),
  group_by: z.enum(['provider', 'currency', 'subscription_plan', 'user'])
    .optional(),
});

// Subscription pricing calculation schema
export const pricingCalculationSchema = z.object({
  apiUid: z.string()
    .uuid('API UID must be a valid UUID'),
  planType: z.enum(['basic', 'pro', 'enterprise', 'custom'])
    .default('basic'),
  billingCycle: z.enum(['monthly', 'yearly', 'one_time'])
    .default('monthly'),
  requestsLimit: z.number()
    .int('Request limit must be an integer')
    .min(1, 'Request limit must be at least 1')
    .max(10000000, 'Request limit cannot exceed 10,000,000')
    .optional(),
  features: z.array(z.string()).optional(),
  discountCode: z.string()
    .max(50, 'Discount code must be less than 50 characters')
    .optional(),
  quantity: z.number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .default(1),
});

// Payment method management schemas
export const savePaymentMethodSchema = z.object({
  type: z.enum(['card', 'bank_account', 'wallet']),
  provider: z.enum(['stripe', 'paypal', 'razorpay', 'square']),
  token: z.string().min(1, 'Payment method token is required'),
  isDefault: z.boolean().default(false),
  billingAddress: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    addressLine1: z.string().min(1, 'Address line 1 is required'),
    addressLine2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().length(2, 'Country must be 2-letter code'),
  }),
});

export const updatePaymentMethodSchema = z.object({
  isDefault: z.boolean().optional(),
  billingAddress: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    addressLine1: z.string().min(1, 'Address line 1 is required'),
    addressLine2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().length(2, 'Country must be 2-letter code'),
  }).optional(),
});

// Invoice schema
export const invoiceQuerySchema = z.object({
  page: z.string()
    .optional()
    .transform((val) => val ? Math.max(1, parseInt(val, 10)) : 1),
  limit: z.string()
    .optional()
    .transform((val) => val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'all'])
    .default('all')
    .optional(),
  from_date: z.string()
    .datetime('From date must be a valid ISO datetime')
    .optional(),
  to_date: z.string()
    .datetime('To date must be a valid ISO datetime')
    .optional(),
});

// Tax calculation schema
export const taxCalculationSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3-letter code'),
  customerLocation: z.object({
    country: z.string().length(2, 'Country must be 2-letter code'),
    state: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
  }),
  productType: z.enum(['digital_service', 'software_license', 'api_access'])
    .default('api_access'),
});

// Type exports
export type CreatePaymentRequest = z.infer<typeof createPaymentSchema>;
export type ProcessPaymentRequest = z.infer<typeof processPaymentSchema>;
export type RefundPaymentRequest = z.infer<typeof refundPaymentSchema>;
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;
export type PaymentParams = z.infer<typeof paymentParamsSchema>;
export type WebhookEvent = z.infer<typeof webhookSchema>;
export type PaymentAnalyticsQuery = z.infer<typeof paymentAnalyticsQuerySchema>;
export type PricingCalculationRequest = z.infer<typeof pricingCalculationSchema>;
export type SavePaymentMethodRequest = z.infer<typeof savePaymentMethodSchema>;
export type UpdatePaymentMethodRequest = z.infer<typeof updatePaymentMethodSchema>;
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;
export type TaxCalculationRequest = z.infer<typeof taxCalculationSchema>;