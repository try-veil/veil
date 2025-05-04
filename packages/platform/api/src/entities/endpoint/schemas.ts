import { z } from 'zod';

// Import route parameter schema but don't re-export directly to avoid conflicts
// We'll use it via the export from endpoint/index.ts instead
import '../parameter/schemas';

export const externalDocsSchema = z.object({
  description: z.string(),
  url: z.string().url(),
});

export const endpointSchema = z.object({
  id: z.string().uuid(),
  index: z.number().int().nonnegative(),
  groupId: z.string().uuid(),
  method: z.string(),
  name: z.string(),
  route: z.string(),
  description: z.string().optional(),
  isGraphQL: z.boolean(),
  security: z.array(z.any()).optional(),
  externalDocs: externalDocsSchema.optional(),
  graphQLSchema: z.any().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
