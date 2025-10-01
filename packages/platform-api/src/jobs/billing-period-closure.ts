import { PricingRepository } from '../repositories/pricing-repository';
import { pricingService } from '../services/pricing/pricing-service';
import { usageTrackingService } from '../services/usage-tracking-service';

/**
 * Background job to close expired billing periods and generate invoices
 *
 * This job should run daily (or more frequently) to:
 * 1. Find all billing periods that have passed their end date
 * 2. Calculate final charges based on usage
 * 3. Generate invoices
 * 4. Create new billing periods for active subscriptions
 */

export interface BillingPeriodClosureResult {
  processedCount: number;
  closedCount: number;
  invoicesGenerated: number;
  newPeriodsCreated: number;
  errors: Array<{
    subscriptionId: number;
    error: string;
  }>;
}

export class BillingPeriodClosureJob {
  private pricingRepository: PricingRepository;

  constructor() {
    this.pricingRepository = new PricingRepository();
  }

  /**
   * Main job execution method
   */
  async execute(): Promise<BillingPeriodClosureResult> {
    const startTime = Date.now();
    console.log('[BillingPeriodClosure] Starting job execution...');

    const result: BillingPeriodClosureResult = {
      processedCount: 0,
      closedCount: 0,
      invoicesGenerated: 0,
      newPeriodsCreated: 0,
      errors: []
    };

    try {
      // Find all billing periods that have passed their end date
      const expiredPeriods = await this.pricingRepository.findExpiredBillingPeriods();

      console.log(`[BillingPeriodClosure] Found ${expiredPeriods.length} expired billing periods`);

      for (const period of expiredPeriods) {
        result.processedCount++;

        try {
          await this.processBillingPeriod(period, result);
        } catch (error) {
          console.error(`[BillingPeriodClosure] Error processing billing period ${period.id}:`, error);
          result.errors.push({
            subscriptionId: period.subscriptionId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[BillingPeriodClosure] Job completed in ${duration}ms`);
      console.log(`[BillingPeriodClosure] Results:`, result);

      return result;

    } catch (error) {
      console.error('[BillingPeriodClosure] Job execution failed:', error);
      throw error;
    }
  }

  /**
   * Process a single billing period
   */
  private async processBillingPeriod(
    period: any,
    result: BillingPeriodClosureResult
  ): Promise<void> {
    console.log(`[BillingPeriodClosure] Processing billing period ${period.id} for subscription ${period.subscriptionId}`);

    // Get usage data from the period
    const usageSnapshot = period.usageSnapshot
      ? JSON.parse(period.usageSnapshot as string)
      : null;

    if (!usageSnapshot) {
      console.warn(`[BillingPeriodClosure] No usage data for billing period ${period.id}, skipping`);
      return;
    }

    // Calculate final charges
    const usageData = {
      subscriptionId: period.subscriptionId,
      totalRequests: usageSnapshot.totalRequests || 0,
      successfulRequests: usageSnapshot.successfulRequests || 0,
      failedRequests: usageSnapshot.failedRequests || 0,
      dataTransferredBytes: usageSnapshot.dataTransferredBytes || 0,
      dataTransferredGB: usageSnapshot.dataTransferredGB || 0,
    };

    try {
      // Calculate price for the period
      const pricingResult = await pricingService.calculateSubscriptionPrice(
        period.subscriptionId,
        period.pricingModelId,
        usageData
      );

      // Update billing period with calculated amount
      await this.pricingRepository.updateBillingPeriod(period.id, {
        status: 'closed',
        calculatedAmount: pricingResult.calculation.totalAmount.toFixed(2)
      });

      result.closedCount++;
      console.log(`[BillingPeriodClosure] Closed billing period ${period.id} with amount: $${pricingResult.calculation.totalAmount.toFixed(2)}`);

      // Generate invoice if amount is greater than 0
      if (pricingResult.calculation.totalAmount > 0) {
        await this.generateInvoice(period, pricingResult, result);
      }

      // Create new billing period for the subscription
      await this.createNewBillingPeriod(period, result);

    } catch (error) {
      console.error(`[BillingPeriodClosure] Failed to process billing period ${period.id}:`, error);
      throw error;
    }
  }

  /**
   * Generate invoice for a closed billing period
   */
  private async generateInvoice(
    period: any,
    pricingResult: any,
    result: BillingPeriodClosureResult
  ): Promise<void> {
    try {
      // Get subscription details for invoice
      const subscription = await this.pricingRepository.getSubscriptionById(period.subscriptionId);

      if (!subscription) {
        console.warn(`[BillingPeriodClosure] Subscription ${period.subscriptionId} not found, skipping invoice`);
        return;
      }

      // Generate invoice number
      const invoiceNumber = await this.pricingRepository.generateInvoiceNumber();

      // Calculate due date (typically 30 days from issue)
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // Create invoice
      const invoice = await this.pricingRepository.createInvoice({
        invoiceNumber,
        subscriptionId: period.subscriptionId,
        billingPeriodId: period.id,
        userId: subscription.userId,
        status: 'pending',
        currency: pricingResult.calculation.currency || 'USD',
        subtotal: pricingResult.calculation.baseAmount.toFixed(2),
        discountAmount: (pricingResult.calculation.discountAmount || 0).toFixed(2),
        taxAmount: (pricingResult.calculation.taxAmount || 0).toFixed(2),
        totalAmount: pricingResult.calculation.totalAmount.toFixed(2),
        breakdown: JSON.stringify(pricingResult.calculation.breakdown),
        appliedPromotions: pricingResult.calculation.appliedPromotions
          ? JSON.stringify(pricingResult.calculation.appliedPromotions)
          : null,
        issueDate,
        dueDate,
        paidDate: null,
      });

      result.invoicesGenerated++;
      console.log(`[BillingPeriodClosure] Generated invoice ${invoiceNumber} for subscription ${period.subscriptionId}`);

      // TODO: Send invoice email to user
      // await emailService.sendInvoice(subscription.userId, invoice);

    } catch (error) {
      console.error(`[BillingPeriodClosure] Failed to generate invoice for period ${period.id}:`, error);
      throw error;
    }
  }

  /**
   * Create new billing period for the subscription
   */
  private async createNewBillingPeriod(
    oldPeriod: any,
    result: BillingPeriodClosureResult
  ): Promise<void> {
    try {
      // Check if subscription is still active
      const subscription = await this.pricingRepository.getSubscriptionById(oldPeriod.subscriptionId);

      if (!subscription || subscription.status !== 'active') {
        console.log(`[BillingPeriodClosure] Subscription ${oldPeriod.subscriptionId} is not active, skipping new period creation`);
        return;
      }

      // Calculate new billing period dates
      const startDate = new Date(oldPeriod.endDate);
      const endDate = new Date(startDate);

      // Determine billing cycle from pricing model
      const pricingModel = await this.pricingRepository.findPricingModelById(oldPeriod.pricingModelId);

      if (!pricingModel) {
        console.warn(`[BillingPeriodClosure] Pricing model ${oldPeriod.pricingModelId} not found, using default monthly cycle`);
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        // Set end date based on billing cycle
        switch (pricingModel.billingCycle) {
          case 'monthly':
            endDate.setMonth(endDate.getMonth() + 1);
            break;
          case 'yearly':
            endDate.setFullYear(endDate.getFullYear() + 1);
            break;
          case 'one_time':
            // No recurring period for one-time payments
            console.log(`[BillingPeriodClosure] One-time billing, no new period created`);
            return;
          default:
            endDate.setMonth(endDate.getMonth() + 1);
        }
      }

      // Create new billing period
      await this.pricingRepository.createBillingPeriod({
        subscriptionId: oldPeriod.subscriptionId,
        pricingModelId: oldPeriod.pricingModelId,
        startDate,
        endDate,
        status: 'active',
        usageSnapshot: null,
        calculatedAmount: null,
      });

      result.newPeriodsCreated++;
      console.log(`[BillingPeriodClosure] Created new billing period for subscription ${oldPeriod.subscriptionId}`);

    } catch (error) {
      console.error(`[BillingPeriodClosure] Failed to create new billing period for subscription ${oldPeriod.subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Dry run mode - shows what would be processed without making changes
   */
  async dryRun(): Promise<BillingPeriodClosureResult> {
    console.log('[BillingPeriodClosure] Running in DRY RUN mode...');

    const result: BillingPeriodClosureResult = {
      processedCount: 0,
      closedCount: 0,
      invoicesGenerated: 0,
      newPeriodsCreated: 0,
      errors: []
    };

    const expiredPeriods = await this.pricingRepository.findExpiredBillingPeriods();

    console.log(`[BillingPeriodClosure] Would process ${expiredPeriods.length} expired billing periods`);

    for (const period of expiredPeriods) {
      console.log(`[BillingPeriodClosure] Would process:`, {
        periodId: period.id,
        subscriptionId: period.subscriptionId,
        startDate: period.startDate,
        endDate: period.endDate,
        status: period.status
      });
      result.processedCount++;
    }

    return result;
  }
}

// Export singleton instance
export const billingPeriodClosureJob = new BillingPeriodClosureJob();