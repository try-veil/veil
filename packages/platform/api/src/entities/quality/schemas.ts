import { z } from 'zod';
import { QualityMetricType } from './types';

export const qualityMetricSchema = z.object({
  id: z.string().uuid(),
  apiId: z.string().uuid(),
  type: z.nativeEnum(QualityMetricType),
  score: z.number().min(0).max(100),
  details: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const qualityThresholdSchema = z.object({
  id: z.string().uuid(),
  metricType: z.nativeEnum(QualityMetricType),
  minScore: z.number().min(0),
  maxScore: z.number().max(100),
  warningThreshold: z.number(),
  criticalThreshold: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const qualityAlertSchema = z.object({
  id: z.string().uuid(),
  apiId: z.string().uuid(),
  metricType: z.nativeEnum(QualityMetricType),
  score: z.number().min(0).max(100),
  threshold: z.number(),
  severity: z.enum(['WARNING', 'CRITICAL']),
  message: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
