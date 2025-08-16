import { Elysia, t } from 'elysia';
import { db, apis, users, apiCategories, apiSubscriptions, apiUsageAnalytics } from '../db';
import { requireRole } from '../middleware/auth';
import { AuthUtils } from '../utils/auth';
import { createApiSchema, updateApiSchema, paginationSchema } from '../validation/schemas';
import { eq, and, desc, count, sum, avg } from 'drizzle-orm';

export const sellerRoutes = new Elysia({ prefix: '/seller' })
  .use(requireRole(['seller', 'admin']))
  .get('/dashboard', async ({ headers, set }) => {
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

      // Get seller's API count
      const [apiCountResult] = await db.select({ count: count() })
        .from(apis)
        .where(eq(apis.sellerId, user.id));

      // Get total subscriptions across all APIs
      const [subscriptionCountResult] = await db.select({ count: count() })
        .from(apiSubscriptions)
        .innerJoin(apis, eq(apiSubscriptions.apiId, apis.id))
        .where(and(
          eq(apis.sellerId, user.id),
          eq(apiSubscriptions.status, 'active')
        ));

      // Get total revenue (this would need payment integration)
      const totalRevenue = '0.00'; // Placeholder

      // Get recent APIs
      const recentApis = await db.select({
        id: apis.id,
        uid: apis.uid,
        name: apis.name,
        isActive: apis.isActive,
        totalSubscriptions: apis.totalSubscriptions,
        averageRating: apis.averageRating,
        createdAt: apis.createdAt,
      })
      .from(apis)
      .where(eq(apis.sellerId, user.id))
      .orderBy(desc(apis.createdAt))
      .limit(5);

      return {
        success: true,
        data: {
          stats: {
            totalApis: apiCountResult.count,
            totalSubscriptions: subscriptionCountResult.count,
            totalRevenue,
          },
          recentApis,
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch dashboard data'
      };
    }
  })
  .get('/apis', async ({ query, headers, set }) => {
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

      const apiList = await db.select({
        id: apis.id,
        uid: apis.uid,
        name: apis.name,
        description: apis.description,
        version: apis.version,
        endpoint: apis.endpoint,
        price: apis.price,
        pricingModel: apis.pricingModel,
        isActive: apis.isActive,
        isPublic: apis.isPublic,
        averageRating: apis.averageRating,
        totalRatings: apis.totalRatings,
        totalSubscriptions: apis.totalSubscriptions,
        createdAt: apis.createdAt,
        category: {
          id: apiCategories.id,
          name: apiCategories.name,
        },
      })
      .from(apis)
      .leftJoin(apiCategories, eq(apis.categoryId, apiCategories.id))
      .where(eq(apis.sellerId, user.id))
      .orderBy(desc(apis.createdAt))
      .limit(limit)
      .offset(offset);

      const [totalResult] = await db.select({ count: count() })
        .from(apis)
        .where(eq(apis.sellerId, user.id));

      const total = totalResult.count;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          apis: apiList,
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
        message: error.message || 'Failed to fetch APIs',
        errors: error.errors || undefined
      };
    }
  })
  .post('/apis', async ({ body, headers, set }) => {
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

      const validatedData = createApiSchema.parse(body);

      const [newApi] = await db.insert(apis).values({
        sellerId: user.id,
        name: validatedData.name,
        description: validatedData.description,
        version: validatedData.version,
        endpoint: validatedData.endpoint,
        baseUrl: validatedData.baseUrl,
        categoryId: validatedData.categoryId,
        documentation: validatedData.documentation,
        price: validatedData.price,
        pricingModel: validatedData.pricingModel,
        requestLimit: validatedData.requestLimit,
        isPublic: validatedData.isPublic,
        isActive: false, // APIs start inactive until reviewed
      }).returning();

      set.status = 201;
      return {
        success: true,
        message: 'API created successfully. It will be reviewed before going live.',
        data: { api: newApi }
      };
    } catch (error: any) {
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Failed to create API',
        errors: error.errors || undefined
      };
    }
  }, {
    body: t.Object({
      name: t.String(),
      description: t.String(),
      version: t.Optional(t.String()),
      endpoint: t.String(),
      baseUrl: t.String(),
      categoryId: t.Optional(t.Number()),
      documentation: t.Optional(t.String()),
      price: t.Optional(t.String()),
      pricingModel: t.Optional(t.Union([
        t.Literal('per_request'),
        t.Literal('monthly'),
        t.Literal('yearly')
      ])),
      requestLimit: t.Optional(t.Number()),
      isPublic: t.Optional(t.Boolean()),
    })
  })
  .get('/apis/:uid', async ({ params: { uid }, user, set }) => {
    try {
      const [api] = await db.select({
        id: apis.id,
        uid: apis.uid,
        name: apis.name,
        description: apis.description,
        version: apis.version,
        endpoint: apis.endpoint,
        baseUrl: apis.baseUrl,
        documentation: apis.documentation,
        price: apis.price,
        pricingModel: apis.pricingModel,
        requestLimit: apis.requestLimit,
        isActive: apis.isActive,
        isPublic: apis.isPublic,
        averageRating: apis.averageRating,
        totalRatings: apis.totalRatings,
        totalSubscriptions: apis.totalSubscriptions,
        createdAt: apis.createdAt,
        updatedAt: apis.updatedAt,
        category: {
          id: apiCategories.id,
          name: apiCategories.name,
        },
      })
      .from(apis)
      .leftJoin(apiCategories, eq(apis.categoryId, apiCategories.id))
      .where(and(
        eq(apis.uid, uid),
        eq(apis.sellerId, user.id)
      ))
      .limit(1);

      if (!api) {
        set.status = 404;
        return {
          success: false,
          message: 'API not found'
        };
      }

      return {
        success: true,
        data: { api }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch API details'
      };
    }
  })
  .put('/apis/:uid', async ({ params: { uid }, body, user, set }) => {
    try {
      const validatedData = updateApiSchema.parse(body);

      // Check if API exists and belongs to user
      const [existingApi] = await db.select()
        .from(apis)
        .where(and(
          eq(apis.uid, uid),
          eq(apis.sellerId, user.id)
        ))
        .limit(1);

      if (!existingApi) {
        set.status = 404;
        return {
          success: false,
          message: 'API not found'
        };
      }

      const [updatedApi] = await db.update(apis)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(apis.uid, uid))
        .returning();

      return {
        success: true,
        message: 'API updated successfully',
        data: { api: updatedApi }
      };
    } catch (error: any) {
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Failed to update API',
        errors: error.errors || undefined
      };
    }
  })
  .delete('/apis/:uid', async ({ params: { uid }, user, set }) => {
    try {
      // Check if API exists and belongs to user
      const [existingApi] = await db.select()
        .from(apis)
        .where(and(
          eq(apis.uid, uid),
          eq(apis.sellerId, user.id)
        ))
        .limit(1);

      if (!existingApi) {
        set.status = 404;
        return {
          success: false,
          message: 'API not found'
        };
      }

      // Check if API has active subscriptions
      const [activeSubscriptions] = await db.select({ count: count() })
        .from(apiSubscriptions)
        .where(and(
          eq(apiSubscriptions.apiId, existingApi.id),
          eq(apiSubscriptions.status, 'active')
        ));

      if (activeSubscriptions.count > 0) {
        set.status = 409;
        return {
          success: false,
          message: 'Cannot delete API with active subscriptions'
        };
      }

      await db.delete(apis).where(eq(apis.uid, uid));

      return {
        success: true,
        message: 'API deleted successfully'
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to delete API'
      };
    }
  })
  .get('/apis/:uid/analytics', async ({ params: { uid }, user, query, set }) => {
    try {
      const { page = 1, limit = 30 } = paginationSchema.parse(query);
      const offset = (page - 1) * limit;

      // Check if API exists and belongs to user
      const [api] = await db.select()
        .from(apis)
        .where(and(
          eq(apis.uid, uid),
          eq(apis.sellerId, user.id)
        ))
        .limit(1);

      if (!api) {
        set.status = 404;
        return {
          success: false,
          message: 'API not found'
        };
      }

      // Get usage analytics
      const analytics = await db.select({
        date: apiUsageAnalytics.date,
        requestCount: apiUsageAnalytics.requestCount,
        successfulRequests: apiUsageAnalytics.successfulRequests,
        failedRequests: apiUsageAnalytics.failedRequests,
        avgResponseTime: apiUsageAnalytics.avgResponseTime,
      })
      .from(apiUsageAnalytics)
      .innerJoin(apiSubscriptions, eq(apiUsageAnalytics.subscriptionId, apiSubscriptions.id))
      .where(eq(apiSubscriptions.apiId, api.id))
      .orderBy(desc(apiUsageAnalytics.date))
      .limit(limit)
      .offset(offset);

      // Get summary stats
      const [summaryStats] = await db.select({
        totalRequests: sum(apiUsageAnalytics.requestCount),
        totalSuccessful: sum(apiUsageAnalytics.successfulRequests),
        totalFailed: sum(apiUsageAnalytics.failedRequests),
        avgResponseTime: avg(apiUsageAnalytics.avgResponseTime),
      })
      .from(apiUsageAnalytics)
      .innerJoin(apiSubscriptions, eq(apiUsageAnalytics.subscriptionId, apiSubscriptions.id))
      .where(eq(apiSubscriptions.apiId, api.id));

      return {
        success: true,
        data: {
          analytics,
          summary: summaryStats,
          pagination: {
            page,
            limit,
            hasNext: analytics.length === limit,
            hasPrev: page > 1,
          }
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch analytics'
      };
    }
  });