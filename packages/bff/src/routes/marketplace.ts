import { Elysia, t } from 'elysia';
import { db, apis, users, apiCategories, apiRatings, apiSubscriptions } from '../db';
import { authMiddleware } from '../middleware/auth';
import { apiSearchSchema, createSubscriptionSchema, createRatingSchema } from '../validation/schemas';
import { eq, and, or, like, gte, lte, desc, asc, count, sql, avg } from 'drizzle-orm';

export const marketplaceRoutes = new Elysia({ prefix: '/marketplace' })
  .get('/apis', async ({ query, set }) => {
    try {
      const validatedQuery = apiSearchSchema.parse(query);
      const { page, limit, sortBy, sortOrder, query: searchQuery, category, minPrice, maxPrice, pricingModel } = validatedQuery;
      
      const offset = (page - 1) * limit;

      // Build WHERE conditions
      const conditions = [
        eq(apis.isActive, true),
        eq(apis.isPublic, true)
      ];

      if (searchQuery) {
        conditions.push(
          or(
            like(apis.name, `%${searchQuery}%`),
            like(apis.description, `%${searchQuery}%`)
          )!
        );
      }

      if (category) {
        conditions.push(eq(apiCategories.name, category));
      }

      if (minPrice) {
        conditions.push(gte(apis.price, minPrice));
      }

      if (maxPrice) {
        conditions.push(lte(apis.price, maxPrice));
      }

      if (pricingModel) {
        conditions.push(eq(apis.pricingModel, pricingModel));
      }

      // Build ORDER BY
      const orderByColumn = {
        name: apis.name,
        price: apis.price,
        rating: apis.averageRating,
        created_at: apis.createdAt,
      }[sortBy];

      const orderDirection = sortOrder === 'desc' ? desc : asc;

      // Get APIs with seller and category info
      const apiList = await db.select({
        id: apis.id,
        uid: apis.uid,
        name: apis.name,
        description: apis.description,
        version: apis.version,
        endpoint: apis.endpoint,
        price: apis.price,
        pricingModel: apis.pricingModel,
        requestLimit: apis.requestLimit,
        averageRating: apis.averageRating,
        totalRatings: apis.totalRatings,
        totalSubscriptions: apis.totalSubscriptions,
        createdAt: apis.createdAt,
        seller: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        category: {
          id: apiCategories.id,
          name: apiCategories.name,
        },
      })
      .from(apis)
      .leftJoin(users, eq(apis.sellerId, users.id))
      .leftJoin(apiCategories, eq(apis.categoryId, apiCategories.id))
      .where(and(...conditions))
      .orderBy(orderDirection(orderByColumn))
      .limit(limit)
      .offset(offset);

      // Get total count for pagination
      const [totalResult] = await db.select({ count: count() })
        .from(apis)
        .leftJoin(apiCategories, eq(apis.categoryId, apiCategories.id))
        .where(and(...conditions));

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
  .get('/apis/:uid', async ({ params: { uid }, set }) => {
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
        averageRating: apis.averageRating,
        totalRatings: apis.totalRatings,
        totalSubscriptions: apis.totalSubscriptions,
        createdAt: apis.createdAt,
        seller: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        category: {
          id: apiCategories.id,
          name: apiCategories.name,
          description: apiCategories.description,
        },
      })
      .from(apis)
      .leftJoin(users, eq(apis.sellerId, users.id))
      .leftJoin(apiCategories, eq(apis.categoryId, apiCategories.id))
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

      // Get recent ratings
      const recentRatings = await db.select({
        id: apiRatings.id,
        rating: apiRatings.rating,
        review: apiRatings.review,
        createdAt: apiRatings.createdAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(apiRatings)
      .leftJoin(users, eq(apiRatings.userId, users.id))
      .where(eq(apiRatings.apiId, api.id))
      .orderBy(desc(apiRatings.createdAt))
      .limit(10);

      return {
        success: true,
        data: {
          api: {
            ...api,
            ratings: recentRatings,
          }
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch API details'
      };
    }
  })
  .use(authMiddleware)
  .post('/apis/:uid/subscribe', async ({ params: { uid }, body, user, set }) => {
    try {
      const validatedData = createSubscriptionSchema.parse(body);

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
  })
  .get('/categories', async ({ set }) => {
    try {
      const categories = await db.select({
        id: apiCategories.id,
        name: apiCategories.name,
        description: apiCategories.description,
        apiCount: count(apis.id),
      })
      .from(apiCategories)
      .leftJoin(apis, and(
        eq(apiCategories.id, apis.categoryId),
        eq(apis.isActive, true),
        eq(apis.isPublic, true)
      ))
      .groupBy(apiCategories.id, apiCategories.name, apiCategories.description)
      .orderBy(asc(apiCategories.name));

      return {
        success: true,
        data: { categories }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch categories'
      };
    }
  });