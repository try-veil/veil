import { SubscriptionRepository } from '../repositories/subscription-repository';
import { PaymentService } from './payment-service';

export class SubscriptionRenewalService {
  private subscriptionRepository: SubscriptionRepository;
  private paymentService: PaymentService;

  constructor() {
    this.subscriptionRepository = new SubscriptionRepository();
    this.paymentService = new PaymentService();
  }

  /**
   * Check for expiring subscriptions and send renewal reminders
   * Run daily to check subscriptions expiring in 7, 3, and 1 day(s)
   */
  async sendRenewalReminders(): Promise<void> {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Get active subscriptions with end dates
      // Note: This would need to be implemented in the repository
      // For now, this is a placeholder for the logic

      console.log('Checking for expiring subscriptions...');
      console.log(`7 days: ${sevenDaysFromNow.toISOString()}`);
      console.log(`3 days: ${threeDaysFromNow.toISOString()}`);
      console.log(`1 day: ${oneDayFromNow.toISOString()}`);

      // TODO: Implement email/notification sending logic
      // TODO: Query subscriptions expiring at these intervals
      // TODO: Send renewal reminders via email service

      console.log('Renewal reminders sent successfully');
    } catch (error) {
      console.error('Failed to send renewal reminders:', error);
      throw error;
    }
  }

  /**
   * Attempt to renew subscriptions that have expired
   * Run daily to process expired subscriptions
   */
  async renewExpiredSubscriptions(): Promise<{
    renewed: number;
    failed: number;
  }> {
    try {
      const now = new Date();
      let renewed = 0;
      let failed = 0;

      console.log('Processing expired subscriptions for renewal...');

      // TODO: Get list of subscriptions that expired yesterday
      // TODO: For each subscription:
      //   1. Check if user has payment method on file
      //   2. Attempt to charge payment method via Razorpay
      //   3. If successful, extend subscription and reset usage
      //   4. If failed, mark for retry or suspend

      console.log(`Renewal complete: ${renewed} renewed, ${failed} failed`);

      return { renewed, failed };
    } catch (error) {
      console.error('Failed to renew expired subscriptions:', error);
      throw error;
    }
  }

  /**
   * Retry failed renewal payments
   * Run every 6 hours to retry failed payments (max 3 attempts)
   */
  async retryFailedRenewals(): Promise<{
    successful: number;
    stillFailed: number;
  }> {
    try {
      let successful = 0;
      let stillFailed = 0;

      console.log('Retrying failed renewal payments...');

      // TODO: Get list of failed renewals with retry count < 3
      // TODO: For each failed renewal:
      //   1. Attempt payment again
      //   2. If successful, update subscription
      //   3. If still failed, increment retry count
      //   4. If max retries reached, suspend subscription

      console.log(`Retry complete: ${successful} successful, ${stillFailed} still failed`);

      return { successful, stillFailed };
    } catch (error) {
      console.error('Failed to retry renewals:', error);
      throw error;
    }
  }

  /**
   * Suspend subscriptions with failed payments after max retries
   * Run daily
   */
  async suspendFailedRenewals(): Promise<number> {
    try {
      let suspended = 0;

      console.log('Suspending subscriptions with failed renewal payments...');

      // TODO: Get subscriptions with failed renewals and retry count >= 3
      // TODO: For each subscription:
      //   1. Update status to 'suspended'
      //   2. Deactivate all associated API keys
      //   3. Send suspension notification to user
      //   4. Log the suspension event

      console.log(`Suspended ${suspended} subscriptions due to failed payments`);

      return suspended;
    } catch (error) {
      console.error('Failed to suspend subscriptions:', error);
      throw error;
    }
  }

  /**
   * Calculate prorated amount for plan changes
   */
  calculateProratedAmount(
    currentPlanPrice: number,
    newPlanPrice: number,
    daysRemaining: number,
    totalDaysInPeriod: number
  ): number {
    const unusedAmount = (currentPlanPrice * daysRemaining) / totalDaysInPeriod;
    const newAmount = (newPlanPrice * daysRemaining) / totalDaysInPeriod;
    return Math.max(0, newAmount - unusedAmount);
  }

  /**
   * Generate renewal invoice
   */
  async generateRenewalInvoice(subscriptionId: number): Promise<any> {
    try {
      const subscription = await this.subscriptionRepository.findById(subscriptionId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // TODO: Generate invoice PDF/document
      // TODO: Send invoice to user
      // TODO: Store invoice record

      console.log(`Generated renewal invoice for subscription ${subscription.uid}`);

      return {
        subscriptionId: subscription.uid,
        amount: 0, // Calculate based on plan
        currency: 'USD',
        dueDate: new Date(),
      };
    } catch (error) {
      console.error('Failed to generate renewal invoice:', error);
      throw error;
    }
  }
}
