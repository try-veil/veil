import { Elysia, t } from 'elysia';
import { db, apiKeys, apiSubscriptions, apis, users } from '../db';
import { authMiddleware } from '../middleware/auth';
import { createApiKeySchema, updateApiKeySchema, paginationSchema } from '../validation/schemas';
import { AuthUtils } from '../utils/auth';
import { eq, and, desc, count } from 'drizzle-orm';

export const apiKeyRoutes = new Elysia({ prefix: '/api-keys' })
  .use(authMiddleware)
  .get('/', async ({ query, headers, set }) => {
    try {
      // Get user from headers directly
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return { success: false, message: 'No token provided' };
      }

      const payload = AuthUtils.verifyToken(token);
      if (!payload) {
        set.status = 401;
        return { success: false, message: 'Invalid token' };
      }

      const [user] = await db.select({
        id: users.id,
        role: users.role,
      }).from(users).where(eq(users.id, payload.userId)).limit(1);

      if (!user) {
        set.status = 401;
        return { success: false, message: 'User not found' };
      }

      const { page = 1, limit = 10 } = paginationSchema.parse(query);
      const offset = (page - 1) * limit;

      const keyList = await db.select({
        id: apiKeys.id,
        uid: apiKeys.uid,
        keyValue: apiKeys.keyValue,
        name: apiKeys.name,
        isActive: apiKeys.isActive,
        lastUsed: apiKeys.lastUsed,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        subscription: {
          id: apiSubscriptions.id,
          uid: apiSubscriptions.uid,
          status: apiSubscriptions.status,
          requestsUsed: apiSubscriptions.requestsUsed,
          requestsLimit: apiSubscriptions.requestsLimit,
        },
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          endpoint: apis.endpoint,
        },
      })
      .from(apiKeys)
      .innerJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
      .innerJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .where(eq(apiSubscriptions.userId, user.id))
      .orderBy(desc(apiKeys.createdAt))
      .limit(limit)
      .offset(offset);

      const [totalResult] = await db.select({ count: count() })
        .from(apiKeys)
        .innerJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
        .where(eq(apiSubscriptions.userId, user.id));

      const total = totalResult.count;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          apiKeys: keyList,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          }
        }
      };
    } catch (error: any) {
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Failed to fetch API keys',
        errors: error.errors || undefined
      };
    }
  })
  .post('/subscription/:subscriptionUid', async ({ params: { subscriptionUid }, body, headers, set }) => {
    try {
      // Get user from headers directly
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return { success: false, message: 'No token provided' };
      }

      const payload = AuthUtils.verifyToken(token);
      if (!payload) {
        set.status = 401;
        return { success: false, message: 'Invalid token' };
      }

      const [user] = await db.select({
        id: users.id,
        role: users.role,
      }).from(users).where(eq(users.id, payload.userId)).limit(1);

      if (!user) {
        set.status = 401;
        return { success: false, message: 'User not found' };
      }

      const validatedData = createApiKeySchema.parse(body);

      // Find the subscription and verify ownership
      const [subscription] = await db.select({
        id: apiSubscriptions.id,
        userId: apiSubscriptions.userId,
        apiId: apiSubscriptions.apiId,
        status: apiSubscriptions.status,
      })
      .from(apiSubscriptions)
      .where(and(
        eq(apiSubscriptions.uid, subscriptionUid),
        eq(apiSubscriptions.userId, user.id)
      ))
      .limit(1);

      if (!subscription) {
        set.status = 404;
        return {
          success: false,
          message: 'Subscription not found'
        };
      }

      if (subscription.status !== 'active') {
        set.status = 400;
        return {
          success: false,
          message: 'Can only create keys for active subscriptions'
        };
      }

      // Check API key limit (max 5 keys per subscription)
      const [keyCount] = await db.select({ count: count() })
        .from(apiKeys)
        .where(eq(apiKeys.subscriptionId, subscription.id));

      if (keyCount.count >= 5) {
        set.status = 400;
        return {
          success: false,
          message: 'Maximum of 5 API keys allowed per subscription'
        };
      }

      // Generate API key
      const keyValue = AuthUtils.generateApiKey();

      const [newApiKey] = await db.insert(apiKeys).values({
        subscriptionId: subscription.id,
        keyValue,
        name: validatedData.name,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
      }).returning({
        id: apiKeys.id,
        uid: apiKeys.uid,
        keyValue: apiKeys.keyValue,
        name: apiKeys.name,
        isActive: apiKeys.isActive,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      });

      set.status = 201;
      return {
        success: true,
        message: 'API key created successfully',
        data: { apiKey: newApiKey }
      };
    } catch (error: any) {
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Failed to create API key',
        errors: error.errors || undefined
      };
    }
  }, {
    body: t.Object({
      name: t.String(),
      expiresAt: t.Optional(t.String())
    })
  })
  .get('/:uid', async ({ params: { uid }, user, set }) => {
    try {
      const [apiKey] = await db.select({
        id: apiKeys.id,
        uid: apiKeys.uid,
        keyValue: apiKeys.keyValue,
        name: apiKeys.name,
        isActive: apiKeys.isActive,
        lastUsed: apiKeys.lastUsed,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
        subscription: {
          id: apiSubscriptions.id,
          uid: apiSubscriptions.uid,
          status: apiSubscriptions.status,
          requestsUsed: apiSubscriptions.requestsUsed,
          requestsLimit: apiSubscriptions.requestsLimit,
        },
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          description: apis.description,
          endpoint: apis.endpoint,
          baseUrl: apis.baseUrl,
          documentation: apis.documentation,
        },
      })
      .from(apiKeys)
      .innerJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
      .innerJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .where(and(
        eq(apiKeys.uid, uid),
        eq(apiSubscriptions.userId, user.id)
      ))
      .limit(1);

      if (!apiKey) {
        set.status = 404;
        return {
          success: false,
          message: 'API key not found'
        };
      }

      return {
        success: true,
        data: { apiKey }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch API key details'
      };
    }
  })
  .put('/:uid', async ({ params: { uid }, body, user, set }) => {
    try {
      const validatedData = updateApiKeySchema.parse(body);

      // Check if API key exists and belongs to user
      const [existingKey] = await db.select({
        id: apiKeys.id,
        subscriptionId: apiKeys.subscriptionId,
      })
      .from(apiKeys)
      .innerJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
      .where(and(
        eq(apiKeys.uid, uid),
        eq(apiSubscriptions.userId, user.id)
      ))
      .limit(1);

      if (!existingKey) {
        set.status = 404;
        return {
          success: false,
          message: 'API key not found'
        };
      }

      const updateData: any = {
        ...validatedData,
        updatedAt: new Date(),
      };

      if (validatedData.expiresAt) {
        updateData.expiresAt = new Date(validatedData.expiresAt);
      }

      const [updatedApiKey] = await db.update(apiKeys)
        .set(updateData)
        .where(eq(apiKeys.uid, uid))
        .returning({
          id: apiKeys.id,
          uid: apiKeys.uid,
          keyValue: apiKeys.keyValue,
          name: apiKeys.name,
          isActive: apiKeys.isActive,
          expiresAt: apiKeys.expiresAt,
          updatedAt: apiKeys.updatedAt,
        });

      return {
        success: true,
        message: 'API key updated successfully',
        data: { apiKey: updatedApiKey }
      };
    } catch (error: any) {
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Failed to update API key',
        errors: error.errors || undefined
      };
    }
  })
  .delete('/:uid', async ({ params: { uid }, user, set }) => {
    try {
      // Check if API key exists and belongs to user
      const [existingKey] = await db.select({
        id: apiKeys.id,
      })
      .from(apiKeys)
      .innerJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
      .where(and(
        eq(apiKeys.uid, uid),
        eq(apiSubscriptions.userId, user.id)
      ))
      .limit(1);

      if (!existingKey) {
        set.status = 404;
        return {
          success: false,
          message: 'API key not found'
        };
      }

      await db.delete(apiKeys).where(eq(apiKeys.uid, uid));

      return {
        success: true,
        message: 'API key deleted successfully'
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to delete API key'
      };
    }
  })
  .post('/:uid/regenerate', async ({ params: { uid }, user, set }) => {
    try {
      // Check if API key exists and belongs to user
      const [existingKey] = await db.select({
        id: apiKeys.id,
        name: apiKeys.name,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .innerJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
      .where(and(
        eq(apiKeys.uid, uid),
        eq(apiSubscriptions.userId, user.id)
      ))
      .limit(1);

      if (!existingKey) {
        set.status = 404;
        return {
          success: false,
          message: 'API key not found'
        };
      }

      // Generate new API key value
      const newKeyValue = AuthUtils.generateApiKey();

      const [regeneratedKey] = await db.update(apiKeys)
        .set({
          keyValue: newKeyValue,
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.uid, uid))
        .returning({
          id: apiKeys.id,
          uid: apiKeys.uid,
          keyValue: apiKeys.keyValue,
          name: apiKeys.name,
          isActive: apiKeys.isActive,
          expiresAt: apiKeys.expiresAt,
          updatedAt: apiKeys.updatedAt,
        });

      return {
        success: true,
        message: 'API key regenerated successfully',
        data: { apiKey: regeneratedKey }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to regenerate API key'
      };
    }
  });