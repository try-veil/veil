import { z } from 'zod';
import { UserType } from './types';

export const userTypeSchema = z.nativeEnum(UserType);

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string(),
  email: z.string().email(),
  slugifiedName: z.string(),
  type: userTypeSchema,
  description: z.string().nullable(),
  bio: z.string().nullable(),
  thumbnail: z.string().url().nullable(),
});

export const userAttributeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  attributeName: z.string(),
  attributeValue: z.string(),
});

export const userMetadataSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  attributeName: z.string(),
  attributeValue: z.string(),
});

export const userAuthorizationSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  applicationId: z.string(),
  status: z.string(),
  authorizationType: z.string(),
  grantType: z.string().nullable(),
  authorizationValues: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
