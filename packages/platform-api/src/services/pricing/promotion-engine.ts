import {
  PromotionConfig,
  PromotionCondition,
  PriceCalculation,
  AppliedPromotion,
  UsageData,
  BillingPeriod
} from '../../types/pricing-types';

export interface PromotionContext {
  userId: number;
  subscriptionId: number;
  apiId: number;
  usage?: UsageData;
  billingPeriod?: BillingPeriod;
  isFirstSubscription?: boolean;
  userCreatedAt?: Date;
  promotionCode?: string;
}

export class PromotionEngine {
  /**
   * Get all applicable promotions for a subscription
   */
  async getApplicablePromotions(
    promotions: PromotionConfig[],
    context: PromotionContext
  ): Promise<PromotionConfig[]> {
    const applicable: PromotionConfig[] = [];
    const now = new Date();

    for (const promotion of promotions) {
      // Check if promotion is active
      if (!promotion.isActive) continue;

      // Check validity period
      if (promotion.validFrom > now) continue;
      if (promotion.validUntil && promotion.validUntil < now) continue;

      // Check usage limits
      if (promotion.maxUses && promotion.currentUses >= promotion.maxUses) continue;

      // If promotion requires a code and none provided, skip
      if (promotion.code && promotion.code !== context.promotionCode) continue;

      // Check all conditions
      if (await this.checkConditions(promotion, context)) {
        applicable.push(promotion);
      }
    }

    // Sort by priority (highest first)
    return applicable.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if all conditions for a promotion are met
   */
  private async checkConditions(
    promotion: PromotionConfig,
    context: PromotionContext
  ): Promise<boolean> {
    for (const condition of promotion.conditions) {
      if (!await this.checkCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check a single promotion condition
   */
  private async checkCondition(
    condition: PromotionCondition,
    context: PromotionContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'first_subscription':
        return context.isFirstSubscription === true;

      case 'usage_threshold':
        if (!context.usage || !condition.metric || condition.value === undefined) {
          return false;
        }
        return this.checkUsageThreshold(context.usage, condition);

      case 'user_created_after':
        if (!context.userCreatedAt || !condition.value) {
          return false;
        }
        const thresholdDate = new Date(condition.value);
        return context.userCreatedAt >= thresholdDate;

      case 'api_category':
        // Would need to check API category from context
        // For now, returning true as placeholder
        return true;

      case 'custom':
        // Handle custom conditions - extensible for future needs
        return this.checkCustomCondition(condition, context);

      default:
        console.warn(`Unknown condition type: ${condition.type}`);
        return false;
    }
  }

  /**
   * Check usage threshold condition
   */
  private checkUsageThreshold(usage: UsageData, condition: PromotionCondition): boolean {
    if (!condition.metric || condition.value === undefined) return false;

    let actualValue: number;

    switch (condition.metric) {
      case 'monthly_requests':
        actualValue = usage.totalRequests;
        break;
      case 'data_transfer_gb':
        actualValue = usage.dataTransferredGB;
        break;
      case 'successful_requests':
        actualValue = usage.successfulRequests;
        break;
      default:
        return false;
    }

    const operator = condition.operator || 'gte';
    return this.compareValues(actualValue, condition.value, operator);
  }

  /**
   * Compare values with operator
   */
  private compareValues(actual: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gt':
        return actual > threshold;
      case 'lt':
        return actual < threshold;
      case 'eq':
        return actual === threshold;
      case 'gte':
        return actual >= threshold;
      case 'lte':
        return actual <= threshold;
      default:
        return false;
    }
  }

  /**
   * Check custom condition (extensible)
   */
  private checkCustomCondition(condition: PromotionCondition, context: PromotionContext): boolean {
    // Implement custom condition logic here
    // Can be extended based on business needs
    return false;
  }

  /**
   * Apply a single promotion to price calculation
   */
  applyPromotion(
    calculation: PriceCalculation,
    promotion: PromotionConfig
  ): PriceCalculation {
    const updatedCalculation = { ...calculation };
    let discountAmount = 0;

    switch (promotion.type) {
      case 'percentage_discount':
        discountAmount = (calculation.totalBeforeTax * promotion.value) / 100;
        break;

      case 'fixed_discount':
        discountAmount = Math.min(promotion.value, calculation.totalBeforeTax);
        break;

      case 'tier_upgrade':
        // Tier upgrade would be handled at subscription level
        // Not applicable to price calculation directly
        return updatedCalculation;

      case 'free_trial':
        // Free trial makes entire amount 0
        discountAmount = calculation.totalBeforeTax;
        break;

      default:
        console.warn(`Unknown promotion type: ${promotion.type}`);
        return updatedCalculation;
    }

    // Apply the discount
    updatedCalculation.discountAmount = (updatedCalculation.discountAmount || 0) + discountAmount;
    updatedCalculation.totalAmount = Math.max(0, calculation.totalBeforeTax - updatedCalculation.discountAmount);

    // Add to applied promotions
    const appliedPromotion: AppliedPromotion = {
      id: promotion.id!,
      code: promotion.code,
      name: promotion.name,
      type: promotion.type,
      discountAmount
    };

    updatedCalculation.appliedPromotions = [
      ...(updatedCalculation.appliedPromotions || []),
      appliedPromotion
    ];

    // Add to breakdown
    updatedCalculation.breakdown.push({
      description: `Promotion: ${promotion.name}`,
      amount: -discountAmount,
      metadata: {
        promotionId: promotion.id,
        promotionCode: promotion.code,
        promotionType: promotion.type
      }
    });

    return updatedCalculation;
  }

  /**
   * Apply multiple promotions to calculation
   */
  applyPromotions(
    calculation: PriceCalculation,
    promotions: PromotionConfig[]
  ): PriceCalculation {
    let result = { ...calculation };

    for (const promotion of promotions) {
      result = this.applyPromotion(result, promotion);
    }

    return result;
  }

  /**
   * Validate promotion code
   */
  async validatePromotionCode(
    code: string,
    promotions: PromotionConfig[]
  ): Promise<PromotionConfig | null> {
    const now = new Date();

    const promotion = promotions.find(p => p.code === code);

    if (!promotion) {
      return null;
    }

    // Check if active
    if (!promotion.isActive) {
      throw new Error('Promotion code is no longer active');
    }

    // Check validity period
    if (promotion.validFrom > now) {
      throw new Error('Promotion code is not yet valid');
    }

    if (promotion.validUntil && promotion.validUntil < now) {
      throw new Error('Promotion code has expired');
    }

    // Check usage limits
    if (promotion.maxUses && promotion.currentUses >= promotion.maxUses) {
      throw new Error('Promotion code has reached maximum usage');
    }

    return promotion;
  }

  /**
   * Calculate potential savings with promotion
   */
  calculateSavings(
    originalCalculation: PriceCalculation,
    promotedCalculation: PriceCalculation
  ): number {
    return originalCalculation.totalAmount - promotedCalculation.totalAmount;
  }

  /**
   * Get promotion impact summary
   */
  getPromotionSummary(calculation: PriceCalculation): string {
    if (!calculation.appliedPromotions || calculation.appliedPromotions.length === 0) {
      return 'No promotions applied';
    }

    const totalDiscount = calculation.appliedPromotions.reduce(
      (sum, promo) => sum + promo.discountAmount,
      0
    );

    const promotionNames = calculation.appliedPromotions
      .map(p => `${p.name} (${p.code || 'auto'})`)
      .join(', ');

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    });

    return `Applied: ${promotionNames} - Total savings: ${formatter.format(totalDiscount)}`;
  }

  /**
   * Check if promotions can be stacked
   */
  canStackPromotions(promotions: PromotionConfig[]): boolean {
    // Business rule: Only allow stacking of different types
    const types = new Set(promotions.map(p => p.type));
    return types.size === promotions.length;
  }

  /**
   * Get best promotion combination
   */
  getBestPromotionCombination(
    baseCalculation: PriceCalculation,
    availablePromotions: PromotionConfig[]
  ): PromotionConfig[] {
    let bestCombination: PromotionConfig[] = [];
    let maxSavings = 0;

    // Try single promotions first
    for (const promotion of availablePromotions) {
      const calc = this.applyPromotion({ ...baseCalculation }, promotion);
      const savings = this.calculateSavings(baseCalculation, calc);

      if (savings > maxSavings) {
        maxSavings = savings;
        bestCombination = [promotion];
      }
    }

    // Try combinations (if stacking is allowed)
    for (let i = 0; i < availablePromotions.length; i++) {
      for (let j = i + 1; j < availablePromotions.length; j++) {
        const combo = [availablePromotions[i], availablePromotions[j]];

        if (!this.canStackPromotions(combo)) continue;

        const calc = this.applyPromotions({ ...baseCalculation }, combo);
        const savings = this.calculateSavings(baseCalculation, calc);

        if (savings > maxSavings) {
          maxSavings = savings;
          bestCombination = combo;
        }
      }
    }

    return bestCombination;
  }
}

// Export singleton instance
export const promotionEngine = new PromotionEngine();