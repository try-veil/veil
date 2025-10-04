import { Elysia, t } from 'elysia';
import { APIKeyRepository } from '../repositories/api-key-repository';
import { SubscriptionRepository } from '../repositories/subscription-repository';

const apiKeyRepository = new APIKeyRepository();
const subscriptionRepository = new SubscriptionRepository();

export const gatewayRoutes = new Elysia({ prefix: '/gateway' })
  // Validate API key and return subscription info for Caddy gateway
  .get('/validate-key/:keyValue', async ({ params, set }) => {
    try {
      const { keyValue } = params;

      // Find API key
      const apiKey = await apiKeyRepository.findByKey(keyValue);

      if (!apiKey) {
        set.status = 404;
        return {
          valid: false,
          message: 'API key not found'
        };
      }

      // Check if key is active
      if (!apiKey.isActive) {
        return {
          valid: false,
          message: 'API key is inactive'
        };
      }

      // Check if expired
      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        return {
          valid: false,
          message: 'API key has expired'
        };
      }

      // Get subscription details
      const subscription = await subscriptionRepository.findById(apiKey.subscriptionId);

      if (!subscription) {
        // Allow if no subscription (backward compatibility)
        return {
          valid: true,
          apiKey: {
            id: apiKey.id,
            uid: apiKey.uid,
            name: apiKey.name,
            subscriptionId: null,
          },
          subscription: null
        };
      }

      // Return validation result with subscription info
      return {
        valid: true,
        apiKey: {
          id: apiKey.id,
          uid: apiKey.uid,
          name: apiKey.name,
          subscriptionId: apiKey.subscriptionId,
        },
        subscription: {
          id: subscription.id,
          uid: subscription.uid,
          status: subscription.status,
          requestsUsed: subscription.requestsUsed,
          requestsLimit: subscription.requestsLimit,
          remainingRequests: Math.max(0, subscription.requestsLimit - subscription.requestsUsed),
          usagePercentage: (subscription.requestsUsed / subscription.requestsLimit) * 100,
          apiUid: subscription.api.uid,
          userId: subscription.userId,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        }
      };

    } catch (error) {
      console.error('Gateway validation error:', error);
      set.status = 500;
      return {
        valid: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    params: t.Object({
      keyValue: t.String({ minLength: 1 })
    })
  })

  // Sync usage data from Caddy to platform-api
  .post('/sync-usage', async ({ body, set }) => {
    try {
      const { apiKeyUid, requestsUsed } = body;

      // Find API key
      const apiKey = await apiKeyRepository.findByUid(apiKeyUid);

      if (!apiKey) {
        set.status = 404;
        return {
          success: false,
          message: 'API key not found'
        };
      }

      // Update subscription usage
      await subscriptionRepository.updateUsage(apiKey.subscriptionId, requestsUsed);

      return {
        success: true,
        message: 'Usage synced successfully'
      };

    } catch (error) {
      console.error('Usage sync error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Failed to sync usage',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      apiKeyUid: t.String({ format: 'uuid' }),
      requestsUsed: t.Integer({ minimum: 0 })
    })
  })

  // Update subscription status from Caddy
  .post('/update-subscription-status', async ({ body, set }) => {
    try {
      const { subscriptionUid, status } = body;

      // Validate status
      const validStatuses = ['active', 'suspended', 'cancelled'];
      if (!validStatuses.includes(status)) {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid status value'
        };
      }

      // Find subscription
      const subscription = await subscriptionRepository.findByUid(subscriptionUid);

      if (!subscription) {
        set.status = 404;
        return {
          success: false,
          message: 'Subscription not found'
        };
      }

      // Update status
      await subscriptionRepository.update(subscription.id, { status: status as any });

      return {
        success: true,
        message: 'Subscription status updated successfully'
      };

    } catch (error) {
      console.error('Status update error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Failed to update subscription status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      subscriptionUid: t.String({ format: 'uuid' }),
      status: t.Union([
        t.Literal('active'),
        t.Literal('suspended'),
        t.Literal('cancelled')
      ])
    })
  });
