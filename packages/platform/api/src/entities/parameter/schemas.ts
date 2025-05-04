import { z } from 'zod';
import { ParameterType, ParameterCondition, ParameterStatus } from './types';

export const parameterTypeSchema = z.nativeEnum(ParameterType);
export const parameterConditionSchema = z.nativeEnum(ParameterCondition);
export const parameterStatusSchema = z.nativeEnum(ParameterStatus);

export const externalDocsSchema = z.object({
  description: z.string().optional(),
  url: z.string().url().optional(),
});

export const parameterSchemaSchema = z.object({
  type: z.string(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  externalDocs: externalDocsSchema.optional(),
});

export const routeParameterSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  endpointId: z.string().uuid(),
  index: z.number().int().min(0),
  paramType: parameterTypeSchema,
  condition: parameterConditionSchema,
  status: parameterStatusSchema,
  querystring: z.boolean(),
  description: z.string().optional(),
  defaultValue: z.string().optional(),
  value: z.string().optional(),
  options: z.array(z.string()).optional(),
  schema: parameterSchemaSchema.optional(),
  schemaDefinition: parameterSchemaSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
