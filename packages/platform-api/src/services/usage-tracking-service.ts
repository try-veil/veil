import { PricingRepository } from '../repositories/pricing-repository';
import { pricingService } from './pricing/pricing-service';
import { eventQueue } from '../utils/event-queue';

export interface UsageData {
  subscriptionId: number;
  requestCount: number;
  successfulRequests: number;
  failedRequests: number;
  dataTransferredBytes: number;
  responseTimeMs?: number;
}

export interface UsageEvent {
  subscriptionId: number;
  requests: number;
  successfulRequests: number;
  failedRequests: number;
  dataTransferredBytes: number;
  timestamp: string;
}

export interface QuotaStatus {
  currentUsage: number;
  quota: number;
  usagePercentage: number;
  isOverQuota: boolean;
  remainingRequests: number;
  warnings: string[];
}

/**
 * Service for tracking usage and enforcing quotas
 */
export class UsageTrackingService {
  private pricingRepository: PricingRepository;

  constructor() {
    this.pricingRepository = new PricingRepository();
  }

  /**
   * Track usage event (queued with retry)
   * This method enqueues the usage event for reliable processing
   */
  async trackUsage(
    subscriptionId: number,
    usageIncrement: {
      requests: number;
      successfulRequests: number;
      failedRequests: number;
      dataTransferredBytes: number;
    }
  ): Promise<void> {
    try {
      const usageEvent: UsageEvent = {
        subscriptionId,
        ...usageIncrement,
        timestamp: new Date().toISOString()
      };

      // Enqueue for reliable processing with retries
      await eventQueue.enqueue('usage_tracking', usageEvent, {
        priority: 'high', // Usage tracking is high priority
        maxAttempts: 5
      });

      console.log(`[UsageTracking] Enqueued usage event for subscription ${subscriptionId}`);
    } catch (error) {
      console.error('[UsageTracking] Failed to enqueue usage event:', error);
      // Fallback: Try to update directly
      await this.updateBillingPeriodUsage(subscriptionId, usageIncrement);
    }
  }

  /**
   * Update billing period with usage data (internal method)
   * Called by event queue handler
   */
  async updateBillingPeriodUsage(
    subscriptionId: number,
    usageIncrement: {
      requests: number;
      successfulRequests: number;
      failedRequests: number;
      dataTransferredBytes: number;
    }
  ): Promise<void> {
    try {
      const currentBillingPeriod = await this.pricingRepository.findCurrentBillingPeriod(subscriptionId);

      if (!currentBillingPeriod) {
        console.warn(`No active billing period found for subscription ${subscriptionId}`);
        return;
      }

      // Parse existing usage snapshot or create new one
      let usageSnapshot: any = currentBillingPeriod.usageSnapshot
        ? JSON.parse(currentBillingPeriod.usageSnapshot as string)
        : {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            dataTransferredBytes: 0,
            dataTransferredGB: 0,
            lastUpdated: new Date().toISOString()
          };

      // Update usage snapshot
      usageSnapshot.totalRequests += usageIncrement.requests;
      usageSnapshot.successfulRequests += usageIncrement.successfulRequests;
      usageSnapshot.failedRequests += usageIncrement.failedRequests;
      usageSnapshot.dataTransferredBytes += usageIncrement.dataTransferredBytes;
      usageSnapshot.dataTransferredGB = usageSnapshot.dataTransferredBytes / (1024 * 1024 * 1024);
      usageSnapshot.lastUpdated = new Date().toISOString();

      // Update billing period with new usage
      await this.pricingRepository.updateBillingPeriod(currentBillingPeriod.id, {
        usageSnapshot: JSON.stringify(usageSnapshot)
      });

      console.log(`[UsageTracking] Updated billing period ${currentBillingPeriod.id} usage for subscription ${subscriptionId}`);
    } catch (error) {
      console.error('[UsageTracking] Failed to update billing period usage:', error);
      throw error;
    }
  }

  /**
   * Check quota status for a subscription
   */
  async checkQuotaStatus(subscriptionId: number): Promise<QuotaStatus> {
    try {
      const quotaStatus = await pricingService.checkQuotaStatus(subscriptionId);
      return quotaStatus;
    } catch (error) {
      console.error('Failed to check quota status:', error);
      // Return permissive status on error to avoid blocking requests
      return {
        currentUsage: 0,
        quota: Infinity,
        usagePercentage: 0,
        isOverQuota: false,
        remainingRequests: Infinity,
        warnings: []
      };
    }
  }

  /**
   * Aggregate usage data for a subscription over a time period
   */
  async aggregateUsage(
    subscriptionId: number,
    startDate: Date,
    endDate: Date
  ): Promise<UsageData> {
    try {
      const billingPeriods = await this.pricingRepository.findBillingPeriodsByDateRange(
        subscriptionId,
        startDate,
        endDate
      );

      let totalRequests = 0;
      let successfulRequests = 0;
      let failedRequests = 0;
      let dataTransferredBytes = 0;

      for (const period of billingPeriods) {
        if (period.usageSnapshot) {
          const snapshot = JSON.parse(period.usageSnapshot as string);
          totalRequests += snapshot.totalRequests || 0;
          successfulRequests += snapshot.successfulRequests || 0;
          failedRequests += snapshot.failedRequests || 0;
          dataTransferredBytes += snapshot.dataTransferredBytes || 0;
        }
      }

      return {
        subscriptionId,
        requestCount: totalRequests,
        successfulRequests,
        failedRequests,
        dataTransferredBytes
      };
    } catch (error) {
      console.error('Failed to aggregate usage:', error);
      throw error;
    }
  }

  /**
   * Calculate current period usage for pricing
   */
  async getCurrentPeriodUsage(subscriptionId: number): Promise<UsageData | null> {
    try {
      const currentBillingPeriod = await this.pricingRepository.findCurrentBillingPeriod(subscriptionId);

      if (!currentBillingPeriod || !currentBillingPeriod.usageSnapshot) {
        return null;
      }

      const snapshot = JSON.parse(currentBillingPeriod.usageSnapshot as string);

      return {
        subscriptionId,
        requestCount: snapshot.totalRequests || 0,
        successfulRequests: snapshot.successfulRequests || 0,
        failedRequests: snapshot.failedRequests || 0,
        dataTransferredBytes: snapshot.dataTransferredBytes || 0
      };
    } catch (error) {
      console.error('Failed to get current period usage:', error);
      return null;
    }
  }

  /**
   * Reset usage for a new billing period
   */
  async resetBillingPeriodUsage(subscriptionId: number): Promise<void> {
    try {
      const currentPeriod = await this.pricingRepository.findCurrentBillingPeriod(subscriptionId);

      if (!currentPeriod) {
        console.warn(`No active billing period found for subscription ${subscriptionId}`);
        return;
      }

      // Close current period with final usage snapshot
      await this.pricingRepository.updateBillingPeriod(currentPeriod.id, {
        status: 'closed'
      });

      console.log(`Closed billing period ${currentPeriod.id} for subscription ${subscriptionId}`);
    } catch (error) {
      console.error('Failed to reset billing period usage:', error);
      throw error;
    }
  }

  /**
   * Get quota warnings for a subscription
   */
  getQuotaWarnings(currentUsage: number, quota: number): string[] {
    const warnings: string[] = [];
    const usagePercentage = (currentUsage / quota) * 100;

    if (usagePercentage >= 100) {
      warnings.push('Quota limit reached');
    } else if (usagePercentage >= 90) {
      warnings.push('90% of quota used');
    } else if (usagePercentage >= 80) {
      warnings.push('80% of quota used');
    } else if (usagePercentage >= 50) {
      warnings.push('50% of quota used');
    }

    return warnings;
  }
}

// Export singleton instance
export const usageTrackingService = new UsageTrackingService();