import { z } from 'zod';
import { ApiPricing, ApiVisibility, ApiStatus } from './types';

export const apiPricingSchema = z.nativeEnum(ApiPricing);
export const apiVisibilitySchema = z.nativeEnum(ApiVisibility);
export const apiStatusSchema = z.nativeEnum(ApiStatus);

export const apiCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string(),
});

export const apiScoreSchema = z.object({
  avgServiceLevel: z.number().min(0).max(100),
  avgLatency: z.number().min(0),
  avgSuccessRate: z.number().min(0).max(100),
  popularityScore: z.number().min(0).max(10),
});

export const apiVersionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  apiId: z.string().uuid(),
  current: z.boolean(),
  createdAt: z.date(),
  versionStatus: z.string(),
  apiSubType: z.enum(['rest', 'graphql', 'soap']),
  tags: z.array(z.string()),
});

export const apiQualitySchema = z.object({
  score: z.number().nullable(),
});

export const apiSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  title: z.string(),
  description: z.string(),
  longDescription: z.string(),
  visibility: apiVisibilitySchema,
  slugifiedName: z.string(),
  pricing: apiPricingSchema,
  status: apiStatusSchema,
  categoryId: z.string().uuid(),
  category: apiCategorySchema,
  thumbnail: z.string().url().optional(),
  apiType: z.enum(['http', 'websocket', 'grpc']),
  createdAt: z.date(),
  updatedAt: z.date(),
  score: apiScoreSchema,
  gatewayIds: z.array(z.string().uuid()),
  allowedContext: z.array(z.string()),
  isCtxSubscriber: z.boolean(),
  quality: apiQualitySchema.optional(),
});

export const apiGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  apiId: z.string().uuid(),
  index: z.number().int().min(0),
  description: z.string().optional(),
});

export const apiEndpointSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  groupId: z.string().uuid(),
  method: z.string(),
  route: z.string(),
  description: z.string(),
  index: z.number().int().min(0),
  isGraphQL: z.boolean(),
  security: z.array(z.any()),
  externalDocs: z
    .object({
      description: z.string(),
      url: z.string().url(),
    })
    .optional(),
  graphQLSchema: z.string().optional(),
  createdAt: z.date(),
});
