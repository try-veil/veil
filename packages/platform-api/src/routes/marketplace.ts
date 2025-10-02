import { Elysia, t } from 'elysia';
import { z } from 'zod';
import { MarketplaceService } from '../services/marketplace-service';
import { authMiddleware } from '../middleware/auth';
import { apiSearchSchema, createSubscriptionSchema, createRatingSchema } from '../validation/schemas';
import {
  marketplaceQuerySchema,
  apiUidParamSchema,
  featuredQuerySchema,
  type MarketplaceQuery,
  type APIUidParam,
  type FeaturedQuery
} from '../validation/marketplace-validation';
import { db, apis, apiSubscriptions, apiRatings } from '../db';
import { eq, and, sql, avg } from 'drizzle-orm';

const marketplaceService = new MarketplaceService();

export const marketplaceRoutes = new Elysia({ prefix: '/marketplace' })
  // Get all marketplace APIs
  .get('/apis', async ({ query, set }) => {
    try {
      const validatedQuery = apiSearchSchema.parse(query);
      const { page, limit, sortBy, sortOrder, query: searchQuery, category, minPrice, maxPrice, pricingModel } = validatedQuery;

      const filters = {
        search: searchQuery,
        categoryId: category ? parseInt(category) : undefined,
        pricingModel,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        sortBy: sortBy as any,
      };

      const pagination = { page, limit };
      const result = await marketplaceService.getMarketplaceAPIs(filters, pagination);

      const totalPages = Math.ceil(result.total / limit);

      return {
        success: true,
        data: {
          apis: result.apis,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: error.message || 'Failed to fetch APIs',
        errors: error.errors || undefined
      };
    }
  })

  // Get featured APIs
  .get('/featured', async ({ query, set }) => {
    try {
      const validatedQuery = featuredQuerySchema.parse(query);
      const featuredAPIs = await marketplaceService.getFeaturedAPIs(validatedQuery.limit);

      return {
        success: true,
        data: {
          apis: featuredAPIs,
          count: featuredAPIs.length,
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: error.message || 'Failed to fetch featured APIs'
      };
    }
  })

  // Get trending APIs
  .get('/trending', async ({ query, set }) => {
    try {
      const validatedQuery = featuredQuerySchema.parse(query);
      const trendingAPIs = await marketplaceService.getTrendingAPIs(validatedQuery.limit);

      return {
        success: true,
        data: {
          apis: trendingAPIs,
          count: trendingAPIs.length,
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: error.message || 'Failed to fetch trending APIs'
      };
    }
  })

  // Search APIs
  .get('/search', async ({ query, set }) => {
    try {
      const q = query.q as string;
      if (!q || q.trim().length === 0) {
        set.status = 400;
        return {
          success: false,
          message: 'Search query is required'
        };
      }

      const validatedQuery = apiSearchSchema.parse({
        ...query,
        query: q
      });

      const filters = {
        pricingModel: validatedQuery.pricingModel,
        minPrice: validatedQuery.minPrice ? parseFloat(validatedQuery.minPrice) : undefined,
        maxPrice: validatedQuery.maxPrice ? parseFloat(validatedQuery.maxPrice) : undefined,
        sortBy: validatedQuery.sortBy as any,
      };

      const pagination = { page: validatedQuery.page, limit: validatedQuery.limit };
      const result = await marketplaceService.searchAPIs(q, filters, pagination);

      const totalPages = Math.ceil(result.total / validatedQuery.limit);

      return {
        success: true,
        data: {
          apis: result.apis,
          pagination: {
            page: validatedQuery.page,
            limit: validatedQuery.limit,
            total: result.total,
            totalPages,
            hasNext: validatedQuery.page < totalPages,
            hasPrev: validatedQuery.page > 1,
          }
        },
        meta: {
          query: q,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: error.message || 'Failed to search APIs'
      };
    }
  })

  // Get API details by UID
  .get('/apis/:uid', async ({ params, set }) => {
    try {
      const { uid } = apiUidParamSchema.parse(params);
      const apiDetails = await marketplaceService.getAPIDetails(uid);

      return {
        success: true,
        data: { api: apiDetails },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error: any) {
      if (error.message === 'API not found') {
        set.status = 404;
        return {
          success: false,
          message: 'API not found'
        };
      }

      set.status = 500;
      return {
        success: false,
        message: error.message || 'Failed to fetch API details'
      };
    }
  })

  // Get all categories
  .get('/categories', async ({ set }) => {
    try {
      const categories = await marketplaceService.getCategories();

      return {
        success: true,
        data: { categories },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error: any) {
      console.error('Categories endpoint error:', error);
      set.status = 500;
      return {
        success: false,
        message: error.message || 'Failed to fetch categories'
      };
    }
  })

  // Authenticated routes
  .use(authMiddleware)
  .post('/apis/:uid/subscribe', async ({ params: { uid }, body, user, set }) => {
    try {
      console.log('Subscribe route - user object:', user);
      console.log('Subscribe route - user.id:', user?.id);

      // Create a schema without apiId since we get it from the URL
      const marketplaceSubscriptionSchema = z.object({
        requestsLimit: z.number().int().positive().optional(),
      });
      const validatedData = marketplaceSubscriptionSchema.parse(body);

      // Find the API
      const [api] = await db.select()
        .from(apis)
        .where(and(
          eq(apis.uid, uid),
          eq(apis.isActive, true),
          eq(apis.isPublic, true)
        ))
        .limit(1);

      if (!api) {
        set.status = 404;
        return {
          success: false,
          message: 'API not found'
        };
      }

      // Check if user already has an active subscription
      const [existingSubscription] = await db.select()
        .from(apiSubscriptions)
        .where(and(
          eq(apiSubscriptions.userId, user.id),
          eq(apiSubscriptions.apiId, api.id),
          eq(apiSubscriptions.status, 'active')
        ))
        .limit(1);

      if (existingSubscription) {
        set.status = 409;
        return {
          success: false,
          message: 'You already have an active subscription to this API'
        };
      }

      // Create subscription
      const requestsLimit = validatedData.requestsLimit || api.requestLimit;
      const [newSubscription] = await db.insert(apiSubscriptions).values({
        userId: user.id,
        apiId: api.id,
        requestsLimit,
        status: 'active',
      }).returning();

      // Update API total subscriptions
      await db.update(apis)
        .set({
          totalSubscriptions: sql`${apis.totalSubscriptions} + 1`
        })
        .where(eq(apis.id, api.id));

      set.status = 201;
      return {
        success: true,
        message: 'Successfully subscribed to API',
        data: { subscription: newSubscription }
      };
    } catch (error: any) {
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Failed to subscribe to API',
        errors: error.errors || undefined
      };
    }
  }, {
    body: t.Object({
      requestsLimit: t.Optional(t.Number())
    })
  })

  .post('/apis/:uid/rate', async ({ params: { uid }, body, user, set }) => {
    try {
      const validatedData = createRatingSchema.parse(body);

      // Find the API
      const [api] = await db.select()
        .from(apis)
        .where(and(
          eq(apis.uid, uid),
          eq(apis.isActive, true),
          eq(apis.isPublic, true)
        ))
        .limit(1);

      if (!api) {
        set.status = 404;
        return {
          success: false,
          message: 'API not found'
        };
      }

      // Check if user has a subscription to this API
      const [subscription] = await db.select()
        .from(apiSubscriptions)
        .where(and(
          eq(apiSubscriptions.userId, user.id),
          eq(apiSubscriptions.apiId, api.id)
        ))
        .limit(1);

      if (!subscription) {
        set.status = 403;
        return {
          success: false,
          message: 'You must be subscribed to rate this API'
        };
      }

      // Check if user already rated this API
      const [existingRating] = await db.select()
        .from(apiRatings)
        .where(and(
          eq(apiRatings.userId, user.id),
          eq(apiRatings.apiId, api.id)
        ))
        .limit(1);

      if (existingRating) {
        // Update existing rating
        await db.update(apiRatings)
          .set({
            rating: validatedData.rating,
            review: validatedData.review,
            updatedAt: sql`now()`,
          })
          .where(eq(apiRatings.id, existingRating.id));
      } else {
        // Create new rating
        await db.insert(apiRatings).values({
          userId: user.id,
          apiId: api.id,
          rating: validatedData.rating,
          review: validatedData.review,
        });

        // Update total ratings count
        await db.update(apis)
          .set({
            totalRatings: sql`${apis.totalRatings} + 1`
          })
          .where(eq(apis.id, api.id));
      }

      // Recalculate average rating
      const [avgResult] = await db.select({
        avgRating: avg(apiRatings.rating)
      })
      .from(apiRatings)
      .where(eq(apiRatings.apiId, api.id));

      const averageRating = avgResult.avgRating ? Number(avgResult.avgRating).toFixed(2) : '0.00';

      await db.update(apis)
        .set({ averageRating })
        .where(eq(apis.id, api.id));

      return {
        success: true,
        message: existingRating ? 'Rating updated successfully' : 'Rating added successfully'
      };
    } catch (error: any) {
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Failed to rate API',
        errors: error.errors || undefined
      };
    }
  }, {
    body: t.Object({
      rating: t.Number({ minimum: 1, maximum: 5 }),
      review: t.Optional(t.String())
    })
  });