import { SubscriptionRepository, CreateSubscriptionData, UpdateSubscriptionData, SubscriptionWithDetails, SubscriptionFilters } from '../repositories/subscription-repository';
import { APIRepository } from '../repositories/api-repository';
import { GatewayService } from './gateway-service';
import { pricingService } from './pricing/pricing-service';
import { PricingRepository } from '../repositories/pricing-repository';
import { calculateProration, calculateUpgradeProration, calculateDowngradeProration, ProrationResult, validateProrationInputs } from '../utils/proration';
import { eventQueue } from '../utils/event-queue';

export interface CreateSubscriptionRequest {
  apiUid: string;
  requestsLimit?: number;
  keyName?: string;
  notes?: string;
  pricingModelId?: number; // Optional: specify pricing model, defaults to API's default
}

export interface SubscriptionResponse extends SubscriptionWithDetails {
  usageStats?: {
    requestsUsed: number;
    requestsLimit: number;
    remainingRequests: number;
    usagePercentage: number;
    isOverLimit: boolean;
  };
}

export interface SubscriptionCancellation {
  uid: string;
  status: 'cancelled';
  cancelledAt: Date;
  refundEligible: boolean;
  refundAmount?: string;
}

export class SubscriptionService {
  private subscriptionRepository: SubscriptionRepository;
  private apiRepository: APIRepository;
  private gatewayService: GatewayService;
  private pricingRepository: PricingRepository;

  constructor() {
    this.subscriptionRepository = new SubscriptionRepository();
    this.apiRepository = new APIRepository();
    this.gatewayService = new GatewayService();
    this.pricingRepository = new PricingRepository();
  }

  /**
   * Create a new subscription
   */
  async createSubscription(
    userId: number,
    request: CreateSubscriptionRequest
  ): Promise<SubscriptionResponse> {
    try {
      // Find the API
      const api = await this.apiRepository.findByUid(request.apiUid);
      if (!api) {
        throw new Error('API not found');
      }

      if (!api.isActive || !api.isPublic) {
        throw new Error('API is not available for subscription');
      }

      // Check if user already has an active subscription
      const hasActive = await this.subscriptionRepository.hasActiveSubscription(userId, api.id);
      if (hasActive) {
        throw new Error('You already have an active subscription to this API');
      }

      // Determine request limit
      const requestsLimit = request.requestsLimit || api.requestLimit;
      if (requestsLimit <= 0) {
        throw new Error('Request limit must be greater than 0');
      }

      // Get or select pricing model
      let pricingModelId = request.pricingModelId;

      if (!pricingModelId) {
        // Get default pricing model for the API
        const availableModels = await pricingService.getAvailablePricingModels(api.id);
        if (availableModels.length > 0) {
          // Use first active model as default (freemium or cheapest plan)
          const defaultModel = availableModels.find(m => m.type === 'freemium') || availableModels[0];
          pricingModelId = defaultModel.id;
        }
      }

      // Create subscription with pricing model
      const subscriptionData: CreateSubscriptionData = {
        userId,
        apiId: api.id,
        requestsLimit,
        status: 'active',
        pricingModelId: pricingModelId || undefined,
      };

      const subscription = await this.subscriptionRepository.create(subscriptionData);

      // Create initial billing period if pricing model is set
      if (pricingModelId) {
        try {
          const now = new Date();
          const billingPeriodEnd = new Date(now);
          billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1); // Default: monthly billing

          await this.pricingRepository.createBillingPeriod({
            subscriptionId: subscription.id,
            pricingModelId: pricingModelId,
            startDate: now,
            endDate: billingPeriodEnd,
            status: 'active',
            usageSnapshot: null,
            calculatedAmount: null,
          });

          console.log(`Billing period created for subscription: ${subscription.uid}`);
        } catch (error) {
          console.error('Failed to create billing period:', error);
          // Don't fail subscription creation if billing period fails
        }
      }

      // Update API subscription count
      await this.updateAPISubscriptionCount(api.id, 1);

      // Get full subscription details
      const fullSubscription = await this.subscriptionRepository.findById(subscription.id);
      if (!fullSubscription) {
        throw new Error('Failed to retrieve created subscription');
      }

      console.log(`Subscription created successfully: ${subscription.uid} for API ${api.name}`);

      return {
        ...fullSubscription,
        usageStats: await this.subscriptionRepository.getUsageStats(subscription.id) || undefined,
      };

    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription by UID
   */
  async getSubscription(subscriptionUid: string, userId?: number): Promise<SubscriptionResponse> {
    try {
      const subscription = await this.subscriptionRepository.findByUid(subscriptionUid);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Check ownership if userId provided
      if (userId && subscription.userId !== userId) {
        throw new Error('You can only access your own subscriptions');
      }

      const usageStats = await this.subscriptionRepository.getUsageStats(subscription.id);

      return {
        ...subscription,
        usageStats: usageStats || undefined,
      };

    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw error;
    }
  }

  /**
   * Get user subscriptions
   */
  async getUserSubscriptions(
    userId: number,
    filters?: SubscriptionFilters
  ): Promise<SubscriptionResponse[]> {
    try {
      const subscriptions = await this.subscriptionRepository.findByUser(userId, filters);

      // Add usage stats to each subscription
      const subscriptionsWithStats = await Promise.all(
        subscriptions.map(async (subscription) => {
          const usageStats = await this.subscriptionRepository.getUsageStats(subscription.id);
          return {
            ...subscription,
            usageStats: usageStats || undefined,
          };
        })
      );

      return subscriptionsWithStats;

    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      throw new Error('Failed to fetch subscriptions');
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionUid: string,
    userId: number,
    data: UpdateSubscriptionData
  ): Promise<SubscriptionResponse> {
    try {
      const subscription = await this.subscriptionRepository.findByUid(subscriptionUid);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.userId !== userId) {
        throw new Error('You can only update your own subscriptions');
      }

      if (subscription.status === 'cancelled') {
        throw new Error('Cannot update a cancelled subscription');
      }

      const updatedSubscription = await this.subscriptionRepository.update(subscription.id, data);
      if (!updatedSubscription) {
        throw new Error('Failed to update subscription');
      }

      // Get full updated details
      const fullSubscription = await this.subscriptionRepository.findById(subscription.id);
      if (!fullSubscription) {
        throw new Error('Failed to retrieve updated subscription');
      }

      const usageStats = await this.subscriptionRepository.getUsageStats(subscription.id);

      return {
        ...fullSubscription,
        usageStats: usageStats || undefined,
      };

    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionUid: string,
    userId: number,
    reason?: string
  ): Promise<SubscriptionCancellation> {
    try {
      const subscription = await this.subscriptionRepository.findByUid(subscriptionUid);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.userId !== userId) {
        throw new Error('You can only cancel your own subscriptions');
      }

      if (subscription.status === 'cancelled') {
        throw new Error('Subscription is already cancelled');
      }

      // Cancel subscription
      const cancelledSubscription = await this.subscriptionRepository.cancel(subscription.id);
      if (!cancelledSubscription) {
        throw new Error('Failed to cancel subscription');
      }

      // Deactivate all API keys for this subscription
      try {
        for (const apiKey of subscription.apiKeys) {
          if (apiKey.isActive) {
            await this.gatewayService.updateAPIKeyStatus(
              subscription.api.uid,
              apiKey.keyValue,
              false
            );
          }
        }
      } catch (gatewayError) {
        console.error('Failed to deactivate keys in gateway:', gatewayError);
        // Continue with cancellation even if gateway update fails
      }

      // Update API subscription count
      await this.updateAPISubscriptionCount(subscription.apiId, -1);

      // Calculate refund eligibility (basic logic - can be enhanced)
      const refundEligible = this.calculateRefundEligibility(subscription);
      const refundAmount = refundEligible ? this.calculateRefundAmount(subscription) : undefined;

      console.log(`Subscription cancelled successfully: ${subscriptionUid}`);

      return {
        uid: subscriptionUid,
        status: 'cancelled',
        cancelledAt: cancelledSubscription.updatedAt,
        refundEligible,
        refundAmount,
      };

    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Suspend subscription (Admin only)
   */
  async suspendSubscription(subscriptionUid: string): Promise<SubscriptionResponse> {
    try {
      const subscription = await this.subscriptionRepository.findByUid(subscriptionUid);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'active') {
        throw new Error('Only active subscriptions can be suspended');
      }

      const suspendedSubscription = await this.subscriptionRepository.suspend(subscription.id);
      if (!suspendedSubscription) {
        throw new Error('Failed to suspend subscription');
      }

      // Deactivate API keys in gateway
      try {
        for (const apiKey of subscription.apiKeys) {
          if (apiKey.isActive) {
            await this.gatewayService.updateAPIKeyStatus(
              subscription.api.uid,
              apiKey.keyValue,
              false
            );
          }
        }
      } catch (gatewayError) {
        console.error('Failed to deactivate keys in gateway:', gatewayError);
      }

      // Get updated details
      const fullSubscription = await this.subscriptionRepository.findById(subscription.id);
      if (!fullSubscription) {
        throw new Error('Failed to retrieve suspended subscription');
      }

      const usageStats = await this.subscriptionRepository.getUsageStats(subscription.id);

      console.log(`Subscription suspended: ${subscriptionUid}`);

      return {
        ...fullSubscription,
        usageStats: usageStats || undefined,
      };

    } catch (error) {
      console.error('Error suspending subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate subscription (Admin only)
   */
  async reactivateSubscription(subscriptionUid: string): Promise<SubscriptionResponse> {
    try {
      const subscription = await this.subscriptionRepository.findByUid(subscriptionUid);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'suspended') {
        throw new Error('Only suspended subscriptions can be reactivated');
      }

      const reactivatedSubscription = await this.subscriptionRepository.activate(subscription.id);
      if (!reactivatedSubscription) {
        throw new Error('Failed to reactivate subscription');
      }

      // Reactivate API keys in gateway
      try {
        for (const apiKey of subscription.apiKeys) {
          await this.gatewayService.updateAPIKeyStatus(
            subscription.api.uid,
            apiKey.keyValue,
            true
          );
        }
      } catch (gatewayError) {
        console.error('Failed to reactivate keys in gateway:', gatewayError);
      }

      // Get updated details
      const fullSubscription = await this.subscriptionRepository.findById(subscription.id);
      if (!fullSubscription) {
        throw new Error('Failed to retrieve reactivated subscription');
      }

      const usageStats = await this.subscriptionRepository.getUsageStats(subscription.id);

      console.log(`Subscription reactivated: ${subscriptionUid}`);

      return {
        ...fullSubscription,
        usageStats: usageStats || undefined,
      };

    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  /**
   * Update usage for a subscription
   */
  async updateUsage(subscriptionId: number, requestsUsed: number): Promise<void> {
    try {
      await this.subscriptionRepository.updateUsage(subscriptionId, requestsUsed);
    } catch (error) {
      console.error('Error updating usage:', error);
      throw new Error('Failed to update usage');
    }
  }

  /**
   * Increment usage for a subscription
   */
  async incrementUsage(subscriptionId: number, increment: number = 1): Promise<void> {
    try {
      await this.subscriptionRepository.incrementUsage(subscriptionId, increment);
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw new Error('Failed to increment usage');
    }
  }

  /**
   * Get subscription usage statistics
   */
  async getUsageStats(subscriptionUid: string, userId?: number) {
    try {
      const subscription = await this.subscriptionRepository.findByUid(subscriptionUid);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (userId && subscription.userId !== userId) {
        throw new Error('You can only access your own subscription statistics');
      }

      return await this.subscriptionRepository.getUsageStats(subscription.id);

    } catch (error) {
      console.error('Error fetching usage stats:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async updateAPISubscriptionCount(apiId: number, increment: number): Promise<void> {
    try {
      // This would update the totalSubscriptions count in the APIs table
      // Implementation depends on your specific requirements
      console.log(`Updating API ${apiId} subscription count by ${increment}`);
    } catch (error) {
      console.error('Error updating API subscription count:', error);
    }
  }

  private calculateRefundEligibility(subscription: SubscriptionWithDetails): boolean {
    // Basic refund logic - customize based on business rules
    const now = new Date();
    const subscriptionAge = now.getTime() - subscription.createdAt.getTime();
    const daysSinceCreation = subscriptionAge / (1000 * 60 * 60 * 24);
    
    // Refund eligible if cancelled within 7 days and less than 10% usage
    const usagePercentage = (subscription.requestsUsed / subscription.requestsLimit) * 100;
    
    return daysSinceCreation <= 7 && usagePercentage <= 10;
  }

  private calculateRefundAmount(subscription: SubscriptionWithDetails): string {
    // Basic refund calculation - customize based on business rules
    const basePrice = parseFloat(subscription.api.price);

    if (subscription.api.pricingModel === 'per_request') {
      // For per-request pricing, refund unused requests
      const unusedRequests = subscription.requestsLimit - subscription.requestsUsed;
      const refundAmount = (unusedRequests / subscription.requestsLimit) * basePrice;
      return refundAmount.toFixed(2);
    } else {
      // For subscription-based pricing, full refund if within refund window
      return basePrice.toFixed(2);
    }
  }

  /**
   * Upgrade subscription to a different pricing model
   */
  async upgradeSubscription(
    subscriptionUid: string,
    userId: number,
    newPricingModelId: number,
    effectiveDate?: Date,
    notes?: string
  ): Promise<SubscriptionResponse> {
    try {
      const subscription = await this.subscriptionRepository.findByUid(subscriptionUid);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.userId !== userId) {
        throw new Error('You can only upgrade your own subscriptions');
      }

      if (subscription.status !== 'active') {
        throw new Error('Can only upgrade active subscriptions');
      }

      const oldPricingModelId = subscription.pricingModelId;

      // Validate new pricing model exists
      const newPricingModel = await this.pricingRepository.findPricingModelById(newPricingModelId);
      if (!newPricingModel) {
        throw new Error('New pricing model not found');
      }

      // Calculate proration credit if upgrading mid-period
      let prorationCredit = 0;
      if (oldPricingModelId) {
        const currentBillingPeriod = await this.pricingRepository.findCurrentBillingPeriod(subscription.id);
        if (currentBillingPeriod) {
          // Calculate unused time in current period
          const now = effectiveDate || new Date();
          const totalDays = Math.ceil((currentBillingPeriod.endDate.getTime() - currentBillingPeriod.startDate.getTime()) / (1000 * 60 * 60 * 24));
          const remainingDays = Math.ceil((currentBillingPeriod.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (currentBillingPeriod.calculatedAmount) {
            prorationCredit = (parseFloat(currentBillingPeriod.calculatedAmount) * remainingDays) / totalDays;
          }

          // Close current billing period
          await this.pricingRepository.updateBillingPeriod(currentBillingPeriod.id, {
            status: 'closed',
            calculatedAmount: currentBillingPeriod.calculatedAmount,
          });
        }
      }

      // Update subscription with new pricing model
      await this.subscriptionRepository.update(subscription.id, {
        pricingModelId: newPricingModelId,
      });

      // Record pricing history
      await this.pricingRepository.createPricingHistory({
        subscriptionId: subscription.id,
        pricingModelId: newPricingModelId,
        changeType: 'upgrade',
        oldPricingModelId: oldPricingModelId || undefined,
        effectiveDate: effectiveDate || new Date(),
        prorationCredit: prorationCredit > 0 ? prorationCredit.toFixed(2) : undefined,
        notes: notes,
      });

      // Create new billing period
      const now = effectiveDate || new Date();
      const billingPeriodEnd = new Date(now);
      billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

      await this.pricingRepository.createBillingPeriod({
        subscriptionId: subscription.id,
        pricingModelId: newPricingModelId,
        startDate: now,
        endDate: billingPeriodEnd,
        status: 'active',
        usageSnapshot: null,
        calculatedAmount: null,
      });

      console.log(`Subscription upgraded: ${subscriptionUid} to pricing model ${newPricingModelId}`);

      // Get updated subscription details
      const fullSubscription = await this.subscriptionRepository.findById(subscription.id);
      if (!fullSubscription) {
        throw new Error('Failed to retrieve updated subscription');
      }

      const usageStats = await this.subscriptionRepository.getUsageStats(subscription.id);

      return {
        ...fullSubscription,
        usageStats: usageStats || undefined,
      };

    } catch (error) {
      console.error('Error upgrading subscription:', error);
      throw error;
    }
  }

  /**
   * Change subscription pricing plan (upgrade or downgrade)
   */
  async changePlan(
    subscriptionUid: string,
    newPricingModelId: number,
    applyImmediately: boolean = true
  ): Promise<{
    subscription: SubscriptionResponse;
    proration: ProrationResult;
    changeType: 'upgrade' | 'downgrade' | 'same';
  }> {
    try {
      // Get current subscription with pricing details
      const subscription = await this.subscriptionRepository.findByUid(subscriptionUid);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'active') {
        throw new Error('Can only change plan for active subscriptions');
      }

      // Get current and new pricing models
      const currentPricingModel = await this.pricingRepository.findPricingModelById(subscription.pricingModelId!);
      const newPricingModel = await this.pricingRepository.findPricingModelById(newPricingModelId);

      if (!currentPricingModel || !newPricingModel) {
        throw new Error('Pricing model not found');
      }

      // Determine change type
      const currentPrice = parseFloat(currentPricingModel.basePrice);
      const newPrice = parseFloat(newPricingModel.basePrice);

      let changeType: 'upgrade' | 'downgrade' | 'same';
      if (newPrice > currentPrice) {
        changeType = 'upgrade';
      } else if (newPrice < currentPrice) {
        changeType = 'downgrade';
      } else {
        changeType = 'same';
      }

      if (changeType === 'same') {
        throw new Error('New plan has the same price as current plan');
      }

      // Get current billing period
      const currentBillingPeriod = await this.pricingRepository.findCurrentBillingPeriod(subscription.id);
      if (!currentBillingPeriod) {
        throw new Error('No active billing period found');
      }

      // Calculate proration
      const changeDate = new Date();
      const prorationInput = {
        currentPrice,
        newPrice,
        currentPeriodStart: currentBillingPeriod.startDate,
        currentPeriodEnd: currentBillingPeriod.endDate,
        changeDate
      };

      validateProrationInputs(prorationInput);

      let proration: ProrationResult;
      if (changeType === 'upgrade') {
        proration = calculateUpgradeProration(prorationInput);
      } else {
        proration = calculateDowngradeProration(prorationInput, applyImmediately);
      }

      // Update subscription
      const updateData: UpdateSubscriptionData = {
        pricingModelId: newPricingModelId
      };

      if (!applyImmediately && changeType === 'downgrade') {
        // Schedule downgrade for end of period
        updateData.status = 'active'; // Keep active, but mark for change
        console.log(`[Subscription] Downgrade scheduled for ${proration.effectiveDate.toISOString()}`);
      }

      const updatedSubscription = await this.subscriptionRepository.update(subscription.id, updateData);
      if (!updatedSubscription) {
        throw new Error('Failed to update subscription');
      }

      // Create pricing history record
      await this.pricingRepository.createSubscriptionPricingHistory({
        subscriptionId: subscription.id,
        oldPricingModelId: subscription.pricingModelId!,
        newPricingModelId,
        changeType,
        changeReason: `Plan ${changeType}`,
        prorationAmount: proration.netAmount.toString(),
        effectiveDate: proration.effectiveDate
      });

      // If upgrade or immediate downgrade, process payment/credit
      if (proration.netAmount !== 0) {
        await eventQueue.enqueue('payment_processing', {
          subscriptionId: subscription.id,
          amount: Math.abs(proration.netAmount),
          type: proration.netAmount > 0 ? 'charge' : 'credit',
          reason: `Subscription ${changeType} proration`,
          invoiceId: null
        }, {
          priority: 'high',
          maxAttempts: 5
        });
      }

      // Update current billing period with proration
      if (applyImmediately || changeType === 'upgrade') {
        await this.pricingRepository.updateBillingPeriod(currentBillingPeriod.id, {
          proratedAmount: proration.netAmount.toString(),
          notes: `${changeType} proration: ${proration.daysRemaining} days remaining`
        });
      }

      const fullSubscription = await this.subscriptionRepository.findByUid(subscriptionUid);
      if (!fullSubscription) {
        throw new Error('Failed to retrieve updated subscription');
      }

      const usageStats = await this.subscriptionRepository.getUsageStats(subscription.id);

      return {
        subscription: {
          ...fullSubscription,
          usageStats: usageStats || undefined
        },
        proration,
        changeType
      };

    } catch (error) {
      console.error('Error changing subscription plan:', error);
      throw error;
    }
  }

  /**
   * Upgrade subscription to a higher-tier plan
   */
  async upgradePlan(
    subscriptionUid: string,
    newPricingModelId: number
  ): Promise<{
    subscription: SubscriptionResponse;
    proration: ProrationResult;
  }> {
    const result = await this.changePlan(subscriptionUid, newPricingModelId, true);

    if (result.changeType !== 'upgrade') {
      throw new Error('New plan must be more expensive than current plan for upgrade');
    }

    return {
      subscription: result.subscription,
      proration: result.proration
    };
  }

  /**
   * Downgrade subscription to a lower-tier plan
   */
  async downgradePlan(
    subscriptionUid: string,
    newPricingModelId: number,
    applyImmediately: boolean = false
  ): Promise<{
    subscription: SubscriptionResponse;
    proration: ProrationResult;
    scheduledFor?: Date;
  }> {
    const result = await this.changePlan(subscriptionUid, newPricingModelId, applyImmediately);

    if (result.changeType !== 'downgrade') {
      throw new Error('New plan must be less expensive than current plan for downgrade');
    }

    return {
      subscription: result.subscription,
      proration: result.proration,
      scheduledFor: !applyImmediately ? result.proration.effectiveDate : undefined
    };
  }

  /**
   * Get preview of plan change without applying it
   */
  async previewPlanChange(
    subscriptionUid: string,
    newPricingModelId: number,
    applyImmediately: boolean = true
  ): Promise<{
    currentPlan: any;
    newPlan: any;
    proration: ProrationResult;
    changeType: 'upgrade' | 'downgrade' | 'same';
  }> {
    const subscription = await this.subscriptionRepository.findByUid(subscriptionUid);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const currentPricingModel = await this.pricingRepository.findPricingModelById(subscription.pricingModelId!);
    const newPricingModel = await this.pricingRepository.findPricingModelById(newPricingModelId);

    if (!currentPricingModel || !newPricingModel) {
      throw new Error('Pricing model not found');
    }

    const currentPrice = parseFloat(currentPricingModel.basePrice);
    const newPrice = parseFloat(newPricingModel.basePrice);

    let changeType: 'upgrade' | 'downgrade' | 'same';
    if (newPrice > currentPrice) {
      changeType = 'upgrade';
    } else if (newPrice < currentPrice) {
      changeType = 'downgrade';
    } else {
      changeType = 'same';
    }

    const currentBillingPeriod = await this.pricingRepository.findCurrentBillingPeriod(subscription.id);
    if (!currentBillingPeriod) {
      throw new Error('No active billing period found');
    }

    const prorationInput = {
      currentPrice,
      newPrice,
      currentPeriodStart: currentBillingPeriod.startDate,
      currentPeriodEnd: currentBillingPeriod.endDate,
      changeDate: new Date()
    };

    validateProrationInputs(prorationInput);

    let proration: ProrationResult;
    if (changeType === 'upgrade') {
      proration = calculateUpgradeProration(prorationInput);
    } else if (changeType === 'downgrade') {
      proration = calculateDowngradeProration(prorationInput, applyImmediately);
    } else {
      proration = calculateProration(prorationInput);
    }

    return {
      currentPlan: {
        id: currentPricingModel.id,
        name: currentPricingModel.name,
        price: currentPrice,
        billingCycle: currentPricingModel.billingCycle
      },
      newPlan: {
        id: newPricingModel.id,
        name: newPricingModel.name,
        price: newPrice,
        billingCycle: newPricingModel.billingCycle
      },
      proration,
      changeType
    };
  }
}