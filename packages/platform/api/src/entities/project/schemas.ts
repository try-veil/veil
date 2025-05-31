import { z } from 'zod';
import { ProjectRole, ProjectStatus } from './types';

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus),
  ownerId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const projectAclSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.nativeEnum(ProjectRole),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const projectAllowedAPISchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  apiId: z.string().uuid(),
  billingPlanVersionId: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
