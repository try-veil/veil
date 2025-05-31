import { z } from 'zod';
import { GatewayServiceStatus, GatewayStatus, GatewayType } from './types';

export const gatewayServiceStatusSchema = z.nativeEnum(GatewayServiceStatus);
export const gatewayStatusSchema = z.nativeEnum(GatewayStatus);
export const gatewayTypeSchema = z.nativeEnum(GatewayType);

export const gatewaySchema = z.object({
  id: z.string().uuid(),
  dns: z.string(),
  serviceStatus: gatewayServiceStatusSchema,
  type: gatewayTypeSchema,
  status: gatewayStatusSchema,
  isDefault: z.boolean(),
  tenantId: z.string().uuid(),
});

export const gatewayTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  urlPattern: z.string(),
});

export const gatewayHeaderSchema = z.object({
  id: z.string().uuid(),
  gatewayTemplateId: z.string().uuid(),
  paramName: z.string(),
  paramValue: z.string(),
  paramDescription: z.string(),
});

export const tenantSchema = z.object({
  id: z.string().uuid(),
  domain: z.string(),
  name: z.string(),
  slugifiedKey: z.string(),
});
