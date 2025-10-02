import { z } from 'zod';

// HTTP methods validation
const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

// Pricing model validation
const pricingModelSchema = z.enum(['per_request', 'monthly', 'yearly', 'free']);

// Price validation (decimal with up to 2 decimal places)
const priceSchema = z.string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal with up to 2 decimal places')
  .transform((val) => {
    const num = parseFloat(val);
    if (num < 0) {
      throw new Error('Price cannot be negative');
    }
    return val;
  });

// Required header schema
const requiredHeaderSchema = z.object({
  name: z.string()
    .min(1, 'Header name is required')
    .max(100, 'Header name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Header name can only contain letters, numbers, hyphens, and underscores'),
  value: z.string()
    .max(255, 'Header value must be less than 255 characters')
    .optional(),
  isStatic: z.boolean()
    .default(false)
    .optional(),
  description: z.string()
    .max(500, 'Header description must be less than 500 characters')
    .optional()
});

// Create API schema
export const createAPISchema = z.object({
  name: z.string()
    .min(1, 'API name is required')
    .max(200, 'API name must be less than 200 characters')
    .trim(),
  description: z.string()
    .min(1, 'API description is required')
    .max(2000, 'API description must be less than 2000 characters')
    .trim(),
  version: z.string()
    .max(50, 'Version must be less than 50 characters')
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/, 'Version must follow semantic versioning (e.g., 1.0.0)')
    .default('1.0.0')
    .optional(),
  endpoint: z.string()
    .min(1, 'API endpoint is required')
    .max(500, 'API endpoint must be less than 500 characters')
    .regex(/^\/[a-zA-Z0-9\-_\/]*$/, 'Endpoint must start with / and contain only valid URL characters')
    .trim(),
  baseUrl: z.string()
    .min(1, 'Base URL is required')
    .max(500, 'Base URL must be less than 500 characters')
    .url('Base URL must be a valid URL')
    .trim(),
  categoryId: z.number()
    .int('Category ID must be an integer')
    .positive('Category ID must be positive')
    .optional(),
  documentation: z.string()
    .url('Documentation must be a valid URL')
    .max(500, 'Documentation URL must be less than 500 characters')
    .optional(),
  price: priceSchema
    .default('0.00')
    .optional(),
  pricingModel: pricingModelSchema
    .default('per_request')
    .optional(),
  requestLimit: z.number()
    .int('Request limit must be an integer')
    .min(1, 'Request limit must be at least 1')
    .max(1000000, 'Request limit cannot exceed 1,000,000')
    .default(1000)
    .optional(),
  isPublic: z.boolean()
    .default(true)
    .optional(),
  methods: z.array(httpMethodSchema)
    .min(1, 'At least one HTTP method is required')
    .max(7, 'Too many HTTP methods specified'),
  requiredHeaders: z.array(requiredHeaderSchema)
    .max(20, 'Cannot have more than 20 required headers')
    .default([])
    .optional()
});

// Update API schema (all fields optional except validation rules)
export const updateAPISchema = z.object({
  name: z.string()
    .min(1, 'API name is required')
    .max(200, 'API name must be less than 200 characters')
    .trim()
    .optional(),
  description: z.string()
    .min(1, 'API description is required')
    .max(2000, 'API description must be less than 2000 characters')
    .trim()
    .optional(),
  version: z.string()
    .max(50, 'Version must be less than 50 characters')
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/, 'Version must follow semantic versioning (e.g., 1.0.0)')
    .optional(),
  endpoint: z.string()
    .min(1, 'API endpoint is required')
    .max(500, 'API endpoint must be less than 500 characters')
    .regex(/^\/[a-zA-Z0-9\-_\/]*$/, 'Endpoint must start with / and contain only valid URL characters')
    .trim()
    .optional(),
  baseUrl: z.string()
    .min(1, 'Base URL is required')
    .max(500, 'Base URL must be less than 500 characters')
    .url('Base URL must be a valid URL')
    .trim()
    .optional(),
  categoryId: z.number()
    .int('Category ID must be an integer')
    .positive('Category ID must be positive')
    .optional(),
  documentation: z.string()
    .url('Documentation must be a valid URL')
    .max(500, 'Documentation URL must be less than 500 characters')
    .optional(),
  price: priceSchema.optional(),
  pricingModel: pricingModelSchema.optional(),
  requestLimit: z.number()
    .int('Request limit must be an integer')
    .min(1, 'Request limit must be at least 1')
    .max(1000000, 'Request limit cannot exceed 1,000,000')
    .optional(),
  isPublic: z.boolean().optional(),
  methods: z.array(httpMethodSchema)
    .min(1, 'At least one HTTP method is required')
    .max(7, 'Too many HTTP methods specified')
    .optional(),
  requiredHeaders: z.array(requiredHeaderSchema)
    .max(20, 'Cannot have more than 20 required headers')
    .optional()
});

// API params validation
export const apiParamsSchema = z.object({
  uid: z.string()
    .uuid('API UID must be a valid UUID'),
});

export const apiIdParamsSchema = z.object({
  id: z.string().transform((val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error('ID must be a positive integer');
    }
    return parsed;
  })
});

// Query parameters for listing APIs
export const apiQuerySchema = z.object({
  page: z.string()
    .optional()
    .transform((val) => val ? Math.max(1, parseInt(val, 10)) : 1),
  limit: z.string()
    .optional()
    .transform((val) => val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20),
  search: z.string()
    .max(100, 'Search query must be less than 100 characters')
    .trim()
    .optional(),
  categoryId: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : undefined),
  pricingModel: pricingModelSchema.optional(),
  status: z.enum(['active', 'inactive', 'pending', 'all'])
    .default('all')
    .optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'rating', 'subscriptions'])
    .default('createdAt')
    .optional(),
  sortOrder: z.enum(['asc', 'desc'])
    .default('desc')
    .optional()
});

// Type exports
export type CreateAPIRequest = z.infer<typeof createAPISchema>;
export type UpdateAPIRequest = z.infer<typeof updateAPISchema>;
export type APIParams = z.infer<typeof apiParamsSchema>;
export type APIIdParams = z.infer<typeof apiIdParamsSchema>;
export type APIQuery = z.infer<typeof apiQuerySchema>;