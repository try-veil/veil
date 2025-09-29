import { Elysia, t } from 'elysia';
import { SubscriptionService } from '../services/subscription-service';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  subscriptionParamsSchema,
  subscriptionQuerySchema,
  cancelSubscriptionSchema,
  usageAnalyticsQuerySchema,
  type CreateSubscriptionRequest,
  type UpdateSubscriptionRequest,
  type SubscriptionParams,
  type SubscriptionQuery,
  type CancelSubscriptionRequest,
  type UsageAnalyticsQuery
} from '../validation/subscription-validation';

const subscriptionService = new SubscriptionService();

export const subscriptionRoutes = new Elysia({ prefix: '/subscriptions' })
  // Get user's subscriptions
  .get('/', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedQuery = subscriptionQuerySchema.parse(query);
      
      const filters = {
        status: validatedQuery.status !== 'all' ? validatedQuery.status : undefined,
      };

      const subscriptions = await subscriptionService.getUserSubscriptions(userId, filters);

      // Apply sorting
      let sortedSubscriptions = subscriptions;
      if (validatedQuery.sort_by) {
        sortedSubscriptions = subscriptions.sort((a, b) => {
          let compareA, compareB;
          
          switch (validatedQuery.sort_by) {
            case 'api_name':
              compareA = a.api.name.toLowerCase();
              compareB = b.api.name.toLowerCase();
              break;
            case 'status':
              compareA = a.status;
              compareB = b.status;
              break;
            case 'usage':
              compareA = a.usageStats?.usagePercentage || 0;
              compareB = b.usageStats?.usagePercentage || 0;
              break;
            case 'updated_at':
              compareA = new Date(a.updatedAt).getTime();
              compareB = new Date(b.updatedAt).getTime();
              break;
            case 'created_at':
            default:
              compareA = new Date(a.createdAt).getTime();
              compareB = new Date(b.createdAt).getTime();
              break;
          }

          if (validatedQuery.sort_order === 'desc') {
            return compareA > compareB ? -1 : compareA < compareB ? 1 : 0;
          } else {
            return compareA < compareB ? -1 : compareA > compareB ? 1 : 0;
          }
        });
      }

      // Apply pagination
      const startIndex = (validatedQuery.page - 1) * validatedQuery.limit;
      const endIndex = startIndex + validatedQuery.limit;
      const paginatedSubscriptions = sortedSubscriptions.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedSubscriptions,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: subscriptions.length,
          totalPages: Math.ceil(subscriptions.length / validatedQuery.limit),
          hasNext: endIndex < subscriptions.length,
          hasPrev: validatedQuery.page > 1,
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch subscriptions',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Create new subscription
  .post('/', async ({ body, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedData = createSubscriptionSchema.parse(body);
      const subscription = await subscriptionService.createSubscription(userId, validatedData);

      set.status = 201;
      return {
        success: true,
        message: 'Subscription created successfully',
        data: subscription,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'API not found') {
          set.status = 404;
          return {
            success: false,
            message: 'API not found'
          };
        }
        
        if (error.message === 'API is not available for subscription') {
          set.status = 400;
          return {
            success: false,
            message: 'API is not available for subscription'
          };
        }

        if (error.message === 'You already have an active subscription to this API') {
          set.status = 409;
          return {
            success: false,
            message: 'You already have an active subscription to this API'
          };
        }

        if (error.message.includes('Request limit')) {
          set.status = 400;
          return {
            success: false,
            message: error.message
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to create subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      apiUid: t.String({ format: 'uuid' }),
      requestsLimit: t.Optional(t.Integer({ minimum: 1, maximum: 1000000 })),
      keyName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      notes: t.Optional(t.String({ maxLength: 500 }))
    })
  })

  // Get subscription by UID
  .get('/:uid', async ({ params, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = subscriptionParamsSchema.parse(params);
      const subscription = await subscriptionService.getSubscription(uid, userId);

      return {
        success: true,
        data: subscription,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Subscription not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Subscription not found'
          };
        }

        if (error.message === 'You can only access your own subscriptions') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only access your own subscriptions'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Update subscription
  .put('/:uid', async ({ params, body, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = subscriptionParamsSchema.parse(params);
      const validatedData = updateSubscriptionSchema.parse(body);
      
      const subscription = await subscriptionService.updateSubscription(uid, userId, validatedData);

      return {
        success: true,
        message: 'Subscription updated successfully',
        data: subscription,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Subscription not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Subscription not found'
          };
        }

        if (error.message === 'You can only update your own subscriptions') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only update your own subscriptions'
          };
        }

        if (error.message === 'Cannot update a cancelled subscription') {
          set.status = 400;
          return {
            success: false,
            message: 'Cannot update a cancelled subscription'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to update subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      requestsLimit: t.Optional(t.Integer({ minimum: 1, maximum: 1000000 })),
      status: t.Optional(t.Union([
        t.Literal('active'),
        t.Literal('suspended'),
        t.Literal('cancelled')
      ]))
    })
  })

  // Cancel subscription
  .delete('/:uid', async ({ params, body, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = subscriptionParamsSchema.parse(params);
      const { reason } = cancelSubscriptionSchema.parse(body || {});
      
      const cancellation = await subscriptionService.cancelSubscription(uid, userId, reason);

      return {
        success: true,
        message: 'Subscription cancelled successfully',
        data: cancellation,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Subscription not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Subscription not found'
          };
        }

        if (error.message === 'You can only cancel your own subscriptions') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only cancel your own subscriptions'
          };
        }

        if (error.message === 'Subscription is already cancelled') {
          set.status = 400;
          return {
            success: false,
            message: 'Subscription is already cancelled'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to cancel subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Optional(t.Object({
      reason: t.Optional(t.String({ maxLength: 500 }))
    }))
  })

  // Get subscription usage statistics
  .get('/:uid/usage', async ({ params, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = subscriptionParamsSchema.parse(params);
      const usageStats = await subscriptionService.getUsageStats(uid, userId);

      if (!usageStats) {
        set.status = 404;
        return {
          success: false,
          message: 'Usage statistics not found'
        };
      }

      return {
        success: true,
        data: usageStats,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Subscription not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Subscription not found'
          };
        }

        if (error.message === 'You can only access your own subscription statistics') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only access your own subscription statistics'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch usage statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get subscription analytics (detailed usage over time)
  .get('/:uid/analytics', async ({ params, query, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = subscriptionParamsSchema.parse(params);
      const validatedQuery = usageAnalyticsQuerySchema.parse(query);

      // First verify user has access to this subscription
      const subscription = await subscriptionService.getSubscription(uid, userId);

      // TODO: Implement analytics service to get detailed usage analytics
      // For now, return basic usage stats
      const usageStats = await subscriptionService.getUsageStats(uid, userId);

      return {
        success: true,
        data: {
          subscription: {
            uid: subscription.uid,
            apiName: subscription.api.name,
            status: subscription.status,
          },
          usage: usageStats,
          analytics: {
            // TODO: Implement time-series analytics
            message: 'Detailed analytics coming soon'
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          query: validatedQuery,
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Subscription not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Subscription not found'
          };
        }

        if (error.message.includes('You can only access your own')) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only access your own subscription analytics'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch subscription analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// Note: Admin routes for subscription management will be added to admin routes