import { Elysia, t } from 'elysia';
import { db, users, apiSubscriptions, apis, apiKeys } from '../db';
import { authMiddleware } from '../middleware/auth';
import { updateProfileSchema, changePasswordSchema, paginationSchema } from '../validation/schemas';
import { AuthUtils } from '../utils/auth';
import { eq, and, desc, count } from 'drizzle-orm';

export const profileRoutes = new Elysia({ prefix: '/profile' })
  .use(authMiddleware)
  .get('/', async ({ user, set }) => {
    try {
      const [userProfile] = await db.select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

      if (!userProfile) {
        set.status = 404;
        return {
          success: false,
          message: 'User profile not found'
        };
      }

      return {
        success: true,
        data: { user: userProfile }
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch user profile'
      };
    }
  })
  .put('/', async ({ body, user, set }) => {
    try {
      const validatedData = updateProfileSchema.parse(body);

      // If email is being updated, check if it's already taken
      if (validatedData.email && validatedData.email !== user.email) {
        const [existingUser] = await db.select()
          .from(users)
          .where(eq(users.email, validatedData.email))
          .limit(1);

        if (existingUser) {
          set.status = 409;
          return {
            success: false,
            message: 'Email address is already in use'
          };
        }
      }

      const [updatedUser] = await db.update(users)
        .set({
          ...validatedData,
          updatedAt: new Date(),
          // Reset email verification if email changed
          emailVerified: validatedData.email && validatedData.email !== user.email ? false : undefined,
        })
        .where(eq(users.id, user.id))
        .returning({
          id: users.id,
          uid: users.uid,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          emailVerified: users.emailVerified,
          updatedAt: users.updatedAt,
        });

      return {
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser }
      };
    } catch (error: any) {
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Failed to update profile',
        errors: error.errors || undefined
      };
    }
  }, {
    body: t.Object({
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String()),
      email: t.Optional(t.String()),
    })
  })
  .post('/change-password', async ({ body, user, set }) => {
    try {
      const validatedData = changePasswordSchema.parse(body);

      // Get current user data
      const [currentUser] = await db.select({
        password: users.password,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

      if (!currentUser) {
        set.status = 404;
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await AuthUtils.comparePassword(
        validatedData.currentPassword,
        currentUser.password
      );

      if (!isCurrentPasswordValid) {
        set.status = 400;
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }

      // Hash new password
      const hashedNewPassword = await AuthUtils.hashPassword(validatedData.newPassword);

      // Update password
      await db.update(users)
        .set({
          password: hashedNewPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error: any) {
      set.status = 400;
      return {
        success: false,
        message: error.message || 'Failed to change password',
        errors: error.errors || undefined
      };
    }
  }, {
    body: t.Object({
      currentPassword: t.String(),
      newPassword: t.String(),
    })
  })
  .get('/dashboard', async ({ user, set }) => {
    try {
      // Get user's subscriptions count
      const [subscriptionCount] = await db.select({ count: count() })
        .from(apiSubscriptions)
        .where(and(
          eq(apiSubscriptions.userId, user.id),
          eq(apiSubscriptions.status, 'active')
        ));

      // Get user's API keys count
      const [apiKeysCount] = await db.select({ count: count() })
        .from(apiKeys)
        .innerJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
        .where(eq(apiSubscriptions.userId, user.id));

      // Get recent subscriptions
      const recentSubscriptions = await db.select({
        id: apiSubscriptions.id,
        uid: apiSubscriptions.uid,
        status: apiSubscriptions.status,
        requestsUsed: apiSubscriptions.requestsUsed,
        requestsLimit: apiSubscriptions.requestsLimit,
        createdAt: apiSubscriptions.createdAt,
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          description: apis.description,
          averageRating: apis.averageRating,
        },
      })
      .from(apiSubscriptions)
      .innerJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .where(eq(apiSubscriptions.userId, user.id))
      .orderBy(desc(apiSubscriptions.createdAt))
      .limit(5);

      // Get recent API keys
      const recentApiKeys = await db.select({
        id: apiKeys.id,
        uid: apiKeys.uid,
        name: apiKeys.name,
        isActive: apiKeys.isActive,
        lastUsed: apiKeys.lastUsed,
        createdAt: apiKeys.createdAt,
        api: {
          id: apis.id,
          name: apis.name,
        },
      })
      .from(apiKeys)
      .innerJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
      .innerJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .where(eq(apiSubscriptions.userId, user.id))
      .orderBy(desc(apiKeys.createdAt))
      .limit(5);

      return {
        success: true,
        data: {
          stats: {
            totalSubscriptions: subscriptionCount.count,
            totalApiKeys: apiKeysCount.count,
          },
          recentSubscriptions,
          recentApiKeys,
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
  .get('/subscriptions', async ({ query, user, set }) => {
    try {
      const { page = 1, limit = 10 } = paginationSchema.parse(query);
      const offset = (page - 1) * limit;

      const subscriptions = await db.select({
        id: apiSubscriptions.id,
        uid: apiSubscriptions.uid,
        status: apiSubscriptions.status,
        startDate: apiSubscriptions.startDate,
        endDate: apiSubscriptions.endDate,
        requestsUsed: apiSubscriptions.requestsUsed,
        requestsLimit: apiSubscriptions.requestsLimit,
        createdAt: apiSubscriptions.createdAt,
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          description: apis.description,
          version: apis.version,
          endpoint: apis.endpoint,
          price: apis.price,
          pricingModel: apis.pricingModel,
          averageRating: apis.averageRating,
        },
      })
      .from(apiSubscriptions)
      .innerJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .where(eq(apiSubscriptions.userId, user.id))
      .orderBy(desc(apiSubscriptions.createdAt))
      .limit(limit)
      .offset(offset);

      const [totalResult] = await db.select({ count: count() })
        .from(apiSubscriptions)
        .where(eq(apiSubscriptions.userId, user.id));

      const total = totalResult.count;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          subscriptions,
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
        message: error.message || 'Failed to fetch subscriptions',
        errors: error.errors || undefined
      };
    }
  })
  .delete('/subscriptions/:uid', async ({ params: { uid }, user, set }) => {
    try {
      // Check if subscription exists and belongs to user
      const [subscription] = await db.select()
        .from(apiSubscriptions)
        .where(and(
          eq(apiSubscriptions.uid, uid),
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

      // Update subscription status to cancelled
      await db.update(apiSubscriptions)
        .set({
          status: 'cancelled',
          endDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(apiSubscriptions.uid, uid));

      // Deactivate all API keys for this subscription
      await db.update(apiKeys)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.subscriptionId, subscription.id));

      return {
        success: true,
        message: 'Subscription cancelled successfully'
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to cancel subscription'
      };
    }
  });