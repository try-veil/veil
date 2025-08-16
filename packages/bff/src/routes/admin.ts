import { Elysia, t } from 'elysia';
import { db, apis, apiCategories, users } from '../db';
import { requireRole } from '../middleware/auth';
import { createCategorySchema, paginationSchema } from '../validation/schemas';
import { veilClient } from '../services/veil-client';
import { eq, and, desc, count } from 'drizzle-orm';

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .use(requireRole(['admin']))
  .get('/stats', async ({ set }) => {
    try {
      const [totalUsers] = await db.select({ count: count() }).from(users);
      const [totalApis] = await db.select({ count: count() }).from(apis);
      const [activeApis] = await db.select({ count: count() }).from(apis).where(eq(apis.isActive, true));
      const [pendingApis] = await db.select({ count: count() }).from(apis).where(eq(apis.isActive, false));

      return {
        success: true,
        data: {
          totalUsers: totalUsers.count,
          totalApis: totalApis.count,
          activeApis: activeApis.count,
          pendingApis: pendingApis.count,
        }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch admin stats'
      };
    }
  })
  .get('/apis/pending', async ({ query, set }) => {
    try {
      const { page = 1, limit = 10 } = paginationSchema.parse(query);
      const offset = (page - 1) * limit;

      const pendingApis = await db.select({
        id: apis.id,
        uid: apis.uid,
        name: apis.name,
        description: apis.description,
        version: apis.version,
        endpoint: apis.endpoint,
        baseUrl: apis.baseUrl,
        price: apis.price,
        pricingModel: apis.pricingModel,
        createdAt: apis.createdAt,
        seller: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        category: {
          id: apiCategories.id,
          name: apiCategories.name,
        },
      })
      .from(apis)
      .leftJoin(users, eq(apis.sellerId, users.id))
      .leftJoin(apiCategories, eq(apis.categoryId, apiCategories.id))
      .where(eq(apis.isActive, false))
      .orderBy(desc(apis.createdAt))
      .limit(limit)
      .offset(offset);

      const [totalResult] = await db.select({ count: count() })
        .from(apis)
        .where(eq(apis.isActive, false));

      const total = totalResult.count;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          apis: pendingApis,
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
        message: error.message || 'Failed to fetch pending APIs',
        errors: error.errors || undefined
      };
    }
  })
  .post('/apis/:uid/approve', async ({ params: { uid }, set }) => {
    try {
      // Find the API
      const [api] = await db.select()
        .from(apis)
        .where(eq(apis.uid, uid))
        .limit(1);

      if (!api) {
        set.status = 404;
        return {
          success: false,
          message: 'API not found'
        };
      }

      if (api.isActive) {
        set.status = 400;
        return {
          success: false,
          message: 'API is already approved'
        };
      }

      try {
        // Onboard the API to Veil
        const onboardResult = await veilClient.onboardAPI({
          path: `/${api.uid}/*`,
          upstream: api.baseUrl,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          required_subscription: `api_${api.id}`,
        });

        if (onboardResult.status === 'success') {
          // Update API status to active
          const [updatedApi] = await db.update(apis)
            .set({
              isActive: true,
              updatedAt: new Date(),
            })
            .where(eq(apis.uid, uid))
            .returning();

          return {
            success: true,
            message: 'API approved and onboarded to Veil successfully',
            data: { api: updatedApi }
          };
        } else {
          set.status = 500;
          return {
            success: false,
            message: 'Failed to onboard API to Veil',
            error: onboardResult.message || 'Unknown error'
          };
        }
      } catch (veilError: any) {
        console.error('Veil onboarding error:', veilError);
        set.status = 500;
        return {
          success: false,
          message: 'Failed to onboard API to Veil',
          error: veilError.message || 'Veil service error'
        };
      }
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to approve API'
      };
    }
  })
  .post('/apis/:uid/reject', async ({ params: { uid }, body, set }) => {
    try {
      const { reason } = body as { reason?: string };

      // Find the API
      const [api] = await db.select()
        .from(apis)
        .where(eq(apis.uid, uid))
        .limit(1);

      if (!api) {
        set.status = 404;
        return {
          success: false,
          message: 'API not found'
        };
      }

      if (api.isActive) {
        set.status = 400;
        return {
          success: false,
          message: 'Cannot reject an approved API'
        };
      }

      // For now, we'll just delete the API
      // In a real application, you might want to keep a record with rejection reason
      await db.delete(apis).where(eq(apis.uid, uid));

      return {
        success: true,
        message: 'API rejected and removed',
        data: { reason: reason || 'No reason provided' }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to reject API'
      };
    }
  }, {
    body: t.Object({
      reason: t.Optional(t.String())
    })
  })
  .get('/categories', async ({ query, set }) => {
    try {
      const { page = 1, limit = 20 } = paginationSchema.parse(query);
      const offset = (page - 1) * limit;

      const categories = await db.select({
        id: apiCategories.id,
        name: apiCategories.name,
        description: apiCategories.description,
        createdAt: apiCategories.createdAt,
        apiCount: count(apis.id),
      })
      .from(apiCategories)
      .leftJoin(apis, eq(apiCategories.id, apis.categoryId))
      .groupBy(apiCategories.id, apiCategories.name, apiCategories.description, apiCategories.createdAt)
      .orderBy(apiCategories.name)
      .limit(limit)
      .offset(offset);

      const [totalResult] = await db.select({ count: count() }).from(apiCategories);
      const total = totalResult.count;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          categories,
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
        message: error.message || 'Failed to fetch categories',
        errors: error.errors || undefined
      };
    }
  })
  .post('/categories', async ({ body, set }) => {
    try {
      const validatedData = createCategorySchema.parse(body);

      // Check if category name already exists
      const [existingCategory] = await db.select()
        .from(apiCategories)
        .where(eq(apiCategories.name, validatedData.name))
        .limit(1);

      if (existingCategory) {
        set.status = 409;
        return {
          success: false,
          message: 'Category with this name already exists'
        };
      }

      const [newCategory] = await db.insert(apiCategories).values({
        name: validatedData.name,
        description: validatedData.description,
      }).returning();

      set.status = 201;
      return {
        success: true,
        message: 'Category created successfully',
        data: { category: newCategory }
      };
    } catch (error: any) {
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Failed to create category',
        errors: error.errors || undefined
      };
    }
  }, {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
    })
  })
  .delete('/categories/:id', async ({ params: { id }, set }) => {
    try {
      const categoryId = parseInt(id);

      // Check if category has associated APIs
      const [associatedApis] = await db.select({ count: count() })
        .from(apis)
        .where(eq(apis.categoryId, categoryId));

      if (associatedApis.count > 0) {
        set.status = 409;
        return {
          success: false,
          message: 'Cannot delete category with associated APIs'
        };
      }

      const deletedRows = await db.delete(apiCategories)
        .where(eq(apiCategories.id, categoryId));

      if (deletedRows.length === 0) {
        set.status = 404;
        return {
          success: false,
          message: 'Category not found'
        };
      }

      return {
        success: true,
        message: 'Category deleted successfully'
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to delete category'
      };
    }
  });