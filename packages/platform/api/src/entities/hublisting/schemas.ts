import { z } from 'zod';
import { LoadBalancerStrategy } from './types';

export const planConfigSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean(),
  pricePerMonth: z.number().nonnegative(),
  requestQuotaPerMonth: z.number().nonnegative(),
  hardLimitQuota: z.number().nonnegative(),
});

export const hubListingSchema = z.object({
  id: z.string().uuid(),
  logo: z.string().optional(),
  category: z.string(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  website: z.string().url().nullable(),
  termsOfUse: z.string().optional(),
  visibleToPublic: z.boolean(),
  loadBalancer: z.nativeEnum(LoadBalancerStrategy),
  healthCheckUrl: z.string().url().optional(),
  apiDocumentation: z.string().optional(),
  proxySecret: z.string().optional(),
  requestSizeLimitMb: z.number().int().min(0).max(50).optional(),
  proxyTimeoutSeconds: z.number().int().min(0).max(180).optional(),

  basicPlanId: z.string().uuid().optional(),
  basicPlan: planConfigSchema.optional(),

  proPlanId: z.string().uuid().optional(),
  proPlan: planConfigSchema.optional(),

  ultraPlanId: z.string().uuid().optional(),
  ultraPlan: planConfigSchema.optional(),

  projectId: z.number().int(),
});
