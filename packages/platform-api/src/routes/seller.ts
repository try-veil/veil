import { Elysia, t } from 'elysia';
import { db, apis, users, apiCategories, apiSubscriptions, apiUsageAnalytics } from '../db';
import { fusionAuthService } from '../services/fusionauth-service';
import { createApiSchema, updateApiSchema, paginationSchema } from '../validation/schemas';
import { eq, and, desc, count, sum, avg } from 'drizzle-orm';
import { GatewayService } from '../services/gateway-service';

// Helper to extract and validate user from headers
async function getUserFromHeaders(headers: any): Promise<any> {
  const token = headers.authorization?.startsWith('Bearer ')
    ? headers.authorization.substring(7)
    : null;

  if (!token) {
    throw new Error('No token provided');
  }

  const validationResult = await fusionAuthService.validateToken(token);

  if (!validationResult.valid || !validationResult.user) {
    throw new Error('Invalid or expired token');
  }

  const fusionAuthUser = validationResult.user;

  let [localUser] = await db.select({
    id: users.id,
    uid: users.uid,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
    isActive: users.isActive,
    fusionAuthId: users.fusionAuthId,
  }).from(users)
    .where(eq(users.email, fusionAuthUser.email))
    .limit(1);

  if (!localUser) {
    const [newUser] = await db.insert(users).values({
      email: fusionAuthUser.email,
      firstName: fusionAuthUser.firstName,
      lastName: fusionAuthUser.lastName,
      role: fusionAuthUser.roles[0] || 'user',
      fusionAuthId: fusionAuthUser.id,
      isActive: true,
      password: '',
    }).returning({
      id: users.id,
      uid: users.uid,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      fusionAuthId: users.fusionAuthId,
    });
    localUser = newUser;
  } else if (!localUser.fusionAuthId) {
    await db.update(users)
      .set({ fusionAuthId: fusionAuthUser.id })
      .where(eq(users.id, localUser.id));
    localUser.fusionAuthId = fusionAuthUser.id || null;
  }

  if (!localUser.isActive) {
    throw new Error('User account is deactivated');
  }

  if (!localUser.id || !localUser.email) {
    throw new Error('User data is incomplete');
  }

  return localUser;
}

export const sellerRoutes = new Elysia({ prefix: '/seller' })
  .derive(async ({ headers, set }) => {
    console.log('🔐 Seller auth - headers.authorization:', headers.authorization ? 'Present' : 'Missing');
    try {
      const user = await getUserFromHeaders(headers);
      console.log('✅ Seller auth - user authenticated:', user.email);
      return { user };
    } catch (error: any) {
      console.error('🔴 Seller auth - error:', error.message);
      set.status = 401;
      throw error;
    }
  })
  .get('/dashboard', async ({ user, set }) => {
    try {
      console.log('Dashboard - user from context:', JSON.stringify(user, null, 2));

      if (!user) {
        console.error('Dashboard - user is undefined!');
        set.status = 401;
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      if (!user.id) {
        console.error('Dashboard - user.id is undefined!', user);
        set.status = 401;
        return {
          success: false,
          message: 'User ID not found in authentication context'
        };
      }

      const authenticatedUser = user;

      // Get seller's API count
      console.log('Dashboard - Fetching API count for seller ID:', authenticatedUser.id);
      const apiCountResults = await db.select({ count: count() })
        .from(apis)
        .where(eq(apis.sellerId, authenticatedUser.id));
      console.log('Dashboard - API count results:', apiCountResults);
      const apiCountResult = apiCountResults[0] || { count: 0 };
      const totalApis = Number(apiCountResult.count) || 0;
      console.log('Dashboard - Total APIs:', totalApis);

      // Get total subscriptions across all APIs
      console.log('Dashboard - Fetching subscriptions count');
      const subscriptionCountResults = await db.select({ count: count() })
        .from(apiSubscriptions)
        .innerJoin(apis, eq(apiSubscriptions.apiId, apis.id))
        .where(and(
          eq(apis.sellerId, authenticatedUser.id),
          eq(apiSubscriptions.status, 'active')
        ));
      console.log('Dashboard - Subscription count results:', subscriptionCountResults);
      const subscriptionCountResult = subscriptionCountResults[0] || { count: 0 };
      const totalSubscriptions = Number(subscriptionCountResult.count) || 0;
      console.log('Dashboard - Total subscriptions:', totalSubscriptions);

      // Get total revenue (this would need payment integration)
      const totalRevenue = '0.00'; // Placeholder

      // Get recent APIs
      console.log('Dashboard - Fetching recent APIs');
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
      .where(eq(apis.sellerId, authenticatedUser.id))
      .orderBy(desc(apis.createdAt))
      .limit(5);
      console.log('Dashboard - Recent APIs count:', recentApis.length);

      return {
        success: true,
        data: {
          stats: {
            totalApis,
            totalSubscriptions,
            totalRevenue,
          },
          recentApis,
        }
      };
    } catch (error: any) {
      console.error('Dashboard endpoint error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('User context:', { userId: user?.id, userEmail: user?.email, userRole: user?.role });
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch dashboard data',
        error: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  })
  .get('/apis', async ({ query, user, set }) => {
    try {
      console.log('GET /apis - user from context:', JSON.stringify(user, null, 2));

      if (!user) {
        console.error('GET /apis - user is undefined!');
        set.status = 401;
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      if (!user.id) {
        console.error('GET /apis - user.id is undefined!', user);
        set.status = 401;
        return {
          success: false,
          message: 'User ID not found in authentication context'
        };
      }

      const authenticatedUser = user;
      const { page = 1, limit = 10 } = paginationSchema.parse(query);
      const offset = (page - 1) * limit;

      console.log('GET /apis - Fetching APIs for seller ID:', authenticatedUser.id);

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
      .where(eq(apis.sellerId, authenticatedUser.id))
      .orderBy(desc(apis.createdAt))
      .limit(limit)
      .offset(offset);

      const [totalResult] = await db.select({ count: count() })
        .from(apis)
        .where(eq(apis.sellerId, authenticatedUser.id));

      const total = totalResult.count;
      const totalPages = Math.ceil(total / limit);

      console.log('GET /apis - Successfully fetched', apiList.length, 'APIs. Total:', total);

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
      console.error('GET /apis - Error occurred:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('User context:', { userId: user?.id, userEmail: user?.email, userRole: user?.role });
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Failed to fetch APIs',
        errors: error.errors || undefined
      };
    }
  })
  .post('/apis', async ({ body, user, set }) => {
    try {
      if (!user || !user.id) {
        set.status = 401;
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      const authenticatedUser = user;
      const validatedData = createApiSchema.parse(body);

      const [newApi] = await db.insert(apis).values({
        sellerId: authenticatedUser.id,
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
        isActive: true, // APIs are now active by default
      }).returning();

      // Register API with Veil Gateway
      try {
        const gatewayService = new GatewayService();
        await gatewayService.registerAPI({
          uid: newApi.uid,
          name: newApi.name,
          endpoint: newApi.endpoint,
          baseUrl: newApi.baseUrl,
          methods: ['GET', 'POST'], // Default methods, can be configured later
          requiredHeaders: [] // No required headers by default
        });
        console.log(`API ${newApi.name} (${newApi.uid}) registered with Veil gateway successfully`);
      } catch (gatewayError) {
        console.error('Failed to register API with gateway:', gatewayError);
        // Note: We don't fail the API creation if gateway registration fails
        // The API still exists in the platform and can be manually synced later
      }

      set.status = 201;
      return {
        success: true,
        message: 'API created successfully and is now live in the marketplace.',
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
      if (!user || !user.id) {
        set.status = 401;
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      const authenticatedUser = user;
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
        eq(apis.sellerId, authenticatedUser.id)
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
      if (!user || !user.id) {
        set.status = 401;
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      const authenticatedUser = user;
      const validatedData = updateApiSchema.parse(body);

      // Check if API exists and belongs to user
      const [existingApi] = await db.select()
        .from(apis)
        .where(and(
          eq(apis.uid, uid),
          eq(apis.sellerId, authenticatedUser.id)
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
      if (!user || !user.id) {
        set.status = 401;
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      const authenticatedUser = user;
      // Check if API exists and belongs to user
      const [existingApi] = await db.select()
        .from(apis)
        .where(and(
          eq(apis.uid, uid),
          eq(apis.sellerId, authenticatedUser.id)
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
  .patch('/apis/:uid/toggle-status', async ({ params: { uid }, user, set }) => {
    try {
      if (!user || !user.id) {
        set.status = 401;
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      const authenticatedUser = user;

      // Check if API exists and belongs to user
      const [existingApi] = await db.select()
        .from(apis)
        .where(and(
          eq(apis.uid, uid),
          eq(apis.sellerId, authenticatedUser.id)
        ))
        .limit(1);

      if (!existingApi) {
        set.status = 404;
        return {
          success: false,
          message: 'API not found'
        };
      }

      // Toggle the isActive status
      const [updatedApi] = await db.update(apis)
        .set({
          isActive: !existingApi.isActive,
          updatedAt: new Date(),
        })
        .where(eq(apis.uid, uid))
        .returning();

      const statusMessage = updatedApi.isActive ? 'activated' : 'deactivated';

      return {
        success: true,
        message: `API ${statusMessage} successfully`,
        data: {
          api: {
            uid: updatedApi.uid,
            name: updatedApi.name,
            isActive: updatedApi.isActive
          }
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to toggle API status'
      };
    }
  })
  .get('/apis/:uid/analytics', async ({ params: { uid }, user, query, set }) => {
    try {
      if (!user || !user.id) {
        set.status = 401;
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      const authenticatedUser = user;

      const { page = 1, limit = 30 } = paginationSchema.parse(query);
      const offset = (page - 1) * limit;

      // Check if API exists and belongs to user
      const [api] = await db.select()
        .from(apis)
        .where(and(
          eq(apis.uid, uid),
          eq(apis.sellerId, authenticatedUser.id)
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