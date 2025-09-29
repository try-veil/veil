import { z } from 'zod';

// Marketplace query parameters
export const marketplaceQuerySchema = z.object({
  // Pagination
  page: z.string()
    .optional()
    .transform((val) => val ? Math.max(1, parseInt(val, 10)) : 1),
  limit: z.string()
    .optional()
    .transform((val) => val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20),
  
  // Search and filters
  search: z.string()
    .max(100, 'Search query must be less than 100 characters')
    .trim()
    .optional(),
  category: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : undefined),
  pricing_model: z.enum(['per_request', 'monthly', 'yearly', 'free'])
    .optional(),
  min_price: z.string()
    .optional()
    .transform((val) => val ? Math.max(0, parseFloat(val)) : undefined),
  max_price: z.string()
    .optional()
    .transform((val) => val ? Math.max(0, parseFloat(val)) : undefined),
  min_rating: z.string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const rating = parseFloat(val);
      return rating >= 1 && rating <= 5 ? rating : undefined;
    }),
  
  // Sorting
  sort: z.enum(['popularity', 'rating', 'price_low', 'price_high', 'newest'])
    .default('popularity')
    .optional(),
});

// API UID parameter validation
export const apiUidParamSchema = z.object({
  uid: z.string()
    .uuid('API UID must be a valid UUID'),
});

// Search query validation
export const searchQuerySchema = z.object({
  q: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be less than 100 characters')
    .trim(),
  ...marketplaceQuerySchema.omit({ search: true }).shape,
});

// Featured APIs query
export const featuredQuerySchema = z.object({
  limit: z.string()
    .optional()
    .transform((val) => val ? Math.min(50, Math.max(1, parseInt(val, 10))) : 10),
});

// Category filter validation
export const categoryFilterSchema = z.object({
  category_id: z.string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, 'Category ID must be a positive integer'),
  ...marketplaceQuerySchema.omit({ category: true }).shape,
});

// Price range validation
export const priceRangeSchema = z.object({
  min_price: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val >= 0, 'Min price must be a non-negative number'),
  max_price: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val >= 0, 'Max price must be a non-negative number'),
})
.refine((data) => data.max_price >= data.min_price, {
  message: 'Max price must be greater than or equal to min price',
  path: ['max_price'],
});

// API rating validation
export const ratingQuerySchema = z.object({
  min_rating: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 5, 'Rating must be between 1 and 5'),
  ...marketplaceQuerySchema.omit({ min_rating: true }).shape,
});

// Sort options validation
export const sortOptionsSchema = z.object({
  sort_by: z.enum(['popularity', 'rating', 'price_low', 'price_high', 'newest', 'name'])
    .default('popularity'),
  sort_order: z.enum(['asc', 'desc'])
    .default('desc'),
});

// Type exports
export type MarketplaceQuery = z.infer<typeof marketplaceQuerySchema>;
export type APIUidParam = z.infer<typeof apiUidParamSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type FeaturedQuery = z.infer<typeof featuredQuerySchema>;
export type CategoryFilter = z.infer<typeof categoryFilterSchema>;
export type PriceRange = z.infer<typeof priceRangeSchema>;
export type RatingQuery = z.infer<typeof ratingQuerySchema>;
export type SortOptions = z.infer<typeof sortOptionsSchema>;