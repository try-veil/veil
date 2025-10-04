import { SubscriptionRepository } from '../repositories/subscription-repository';
import { APIKeyRepository } from '../repositories/api-key-repository';

export class SubscriptionExpirationService {
  private subscriptionRepository: SubscriptionRepository;
  private apiKeyRepository: APIKeyRepository;

  constructor() {
    this.subscriptionRepository = new SubscriptionRepository();
    this.apiKeyRepository = new APIKeyRepository();
  }

  /**
   * Check and cancel expired subscriptions
   * Run daily to process subscriptions that have passed their end date
   */
  async cancelExpiredSubscriptions(): Promise<{
    cancelled: number;
    errors: number;
  }> {
    try {
      const now = new Date();
      let cancelled = 0;
      let errors = 0;

      console.log('Checking for expired subscriptions...');
      console.log(`Current date: ${now.toISOString()}`);

      // TODO: Query subscriptions where endDate < now AND status = 'active'
      // For now, this is a placeholder

      // Example logic:
      // const expiredSubscriptions = await this.subscriptionRepository.findExpired(now);
      //
      // for (const subscription of expiredSubscriptions) {
      //   try {
      //     await this.cancelSubscription(subscription.id);
      //     cancelled++;
      //   } catch (error) {
      //     console.error(`Failed to cancel subscription ${subscription.uid}:`, error);
      //     errors++;
      //   }
      // }

      console.log(`Processed expired subscriptions: ${cancelled} cancelled, ${errors} errors`);

      return { cancelled, errors };
    } catch (error) {
      console.error('Failed to process expired subscriptions:', error);
      throw error;
    }
  }

  /**
   * Cancel a single subscription
   */
  async cancelSubscription(subscriptionId: number): Promise<void> {
    try {
      // Update subscription status to cancelled
      await this.subscriptionRepository.cancel(subscriptionId);

      // Deactivate all API keys associated with this subscription
      await this.deactivateSubscriptionKeys(subscriptionId);

      // TODO: Send cancellation notification to user
      // TODO: Notify gateway to clear cache for this subscription

      console.log(`Subscription ${subscriptionId} cancelled successfully`);
    } catch (error) {
      console.error(`Failed to cancel subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate all API keys for a subscription
   */
  async deactivateSubscriptionKeys(subscriptionId: number): Promise<number> {
    try {
      // Get all API keys for this subscription
      const apiKeys = await this.apiKeyRepository.findBySubscriptionId(subscriptionId);

      let deactivated = 0;

      for (const key of apiKeys) {
        if (key.isActive) {
          await this.apiKeyRepository.update(key.id, { isActive: false });
          deactivated++;
        }
      }

      console.log(`Deactivated ${deactivated} API keys for subscription ${subscriptionId}`);

      return deactivated;
    } catch (error) {
      console.error(`Failed to deactivate keys for subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Suspend subscriptions that are past due
   * Run daily to suspend subscriptions with unpaid invoices
   */
  async suspendPastDueSubscriptions(): Promise<number> {
    try {
      const now = new Date();
      let suspended = 0;

      console.log('Checking for past due subscriptions...');

      // TODO: Query subscriptions with:
      //   - Unpaid invoices older than grace period (e.g., 3 days)
      //   - Status = 'active'

      // Example logic:
      // const pastDueSubscriptions = await this.subscriptionRepository.findPastDue(now);
      //
      // for (const subscription of pastDueSubscriptions) {
      //   try {
      //     await this.suspendSubscription(subscription.id);
      //     suspended++;
      //   } catch (error) {
      //     console.error(`Failed to suspend subscription ${subscription.uid}:`, error);
      //   }
      // }

      console.log(`Suspended ${suspended} past due subscriptions`);

      return suspended;
    } catch (error) {
      console.error('Failed to suspend past due subscriptions:', error);
      throw error;
    }
  }

  /**
   * Suspend a single subscription
   */
  async suspendSubscription(subscriptionId: number): Promise<void> {
    try {
      // Update subscription status to suspended
      await this.subscriptionRepository.suspend(subscriptionId);

      // Deactivate all API keys
      await this.deactivateSubscriptionKeys(subscriptionId);

      // TODO: Send suspension notification to user
      // TODO: Notify gateway to update cache

      console.log(`Subscription ${subscriptionId} suspended successfully`);
    } catch (error) {
      console.error(`Failed to suspend subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Reactivate a suspended subscription (e.g., after payment received)
   */
  async reactivateSubscription(subscriptionId: number): Promise<void> {
    try {
      // Update subscription status to active
      await this.subscriptionRepository.activate(subscriptionId);

      // Reactivate API keys
      const apiKeys = await this.apiKeyRepository.findBySubscriptionId(subscriptionId);

      for (const key of apiKeys) {
        // Only reactivate keys that were active before suspension
        // (we need to track this in metadata or a separate field)
        await this.apiKeyRepository.update(key.id, { isActive: true });
      }

      // TODO: Send reactivation notification to user
      // TODO: Notify gateway to update cache

      console.log(`Subscription ${subscriptionId} reactivated successfully`);
    } catch (error) {
      console.error(`Failed to reactivate subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Send expiration warnings to users
   * Run daily to warn users about upcoming expirations
   */
  async sendExpirationWarnings(): Promise<number> {
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      let warned = 0;

      console.log('Sending expiration warnings...');

      // TODO: Query subscriptions expiring in 3 days or 1 day
      // TODO: For each subscription:
      //   1. Check if warning already sent today
      //   2. Send email/notification
      //   3. Log warning sent

      console.log(`Sent ${warned} expiration warnings`);

      return warned;
    } catch (error) {
      console.error('Failed to send expiration warnings:', error);
      throw error;
    }
  }

  /**
   * Clean up cancelled subscriptions older than retention period
   * Run monthly to archive old subscription data
   */
  async archiveOldCancelledSubscriptions(retentionDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let archived = 0;

      console.log(`Archiving cancelled subscriptions older than ${cutoffDate.toISOString()}`);

      // TODO: Query cancelled subscriptions older than cutoff date
      // TODO: Move to archive table or mark as archived
      // TODO: Clean up associated data (API keys, usage logs, etc.)

      console.log(`Archived ${archived} old subscriptions`);

      return archived;
    } catch (error) {
      console.error('Failed to archive old subscriptions:', error);
      throw error;
    }
  }
}
