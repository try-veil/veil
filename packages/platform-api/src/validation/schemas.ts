import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['user', 'seller', 'admin']).optional().default('user'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// API schemas
export const createApiSchema = z.object({
  name: z.string().min(1, 'API name is required').max(200),
  description: z.string().min(1, 'Description is required'),
  version: z.string().default('1.0.0'),
  endpoint: z.string().url('Invalid endpoint URL'),
  baseUrl: z.string().url('Invalid base URL'),
  categoryId: z.number().int().positive().optional(),
  documentation: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format').default('0.00'),
  pricingModel: z.enum(['per_request', 'monthly', 'yearly']).default('per_request'),
  requestLimit: z.number().int().positive().default(1000),
  isPublic: z.boolean().default(true),
});

export const updateApiSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  version: z.string().optional(),
  endpoint: z.string().url().optional(),
  baseUrl: z.string().url().optional(),
  categoryId: z.number().int().positive().optional(),
  documentation: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  pricingModel: z.enum(['per_request', 'monthly', 'yearly']).optional(),
  requestLimit: z.number().int().positive().optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// API Key schemas
export const createApiKeySchema = z.object({
  name: z.string().min(1, 'Key name is required').max(100),
  expiresAt: z.string().datetime().optional(),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
});

// Subscription schemas
export const createSubscriptionSchema = z.object({
  apiId: z.number().int().positive(),
  requestsLimit: z.number().int().positive().optional(),
});

// Rating schemas
export const createRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().optional(),
});

// Query schemas
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
});

export const apiSearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  pricingModel: z.enum(['per_request', 'monthly', 'yearly']).optional(),
  sortBy: z.enum(['name', 'price', 'rating', 'created_at']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
}).merge(paginationSchema);

// Profile update schema
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// Category schema
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateApiInput = z.infer<typeof createApiSchema>;
export type UpdateApiInput = z.infer<typeof updateApiSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type CreateRatingInput = z.infer<typeof createRatingSchema>;
export type ApiSearchInput = z.infer<typeof apiSearchSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;