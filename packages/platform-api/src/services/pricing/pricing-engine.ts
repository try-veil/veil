import {
  PricingModelConfig,
  UsageData,
  PriceCalculation,
  PriceBreakdownItem,
  BillingPeriod,
  PricingEngineResult,
  QuotaStatus
} from '../../types/pricing-types';

export class PricingCalculationEngine {
  /**
   * Calculate price for a subscription based on usage
   */
  async calculatePrice(
    pricingModel: PricingModelConfig,
    usage: UsageData,
    billingPeriod: BillingPeriod
  ): Promise<PriceCalculation> {
    switch (pricingModel.type) {
      case 'usage_based':
        return this.calculateUsageBasedPrice(pricingModel, usage);
      case 'subscription':
        return this.calculateSubscriptionPrice(pricingModel, usage);
      case 'freemium':
        return this.calculateFreemiumPrice(pricingModel, usage);
      case 'hybrid':
        return this.calculateHybridPrice(pricingModel, usage);
      default:
        throw new Error(`Unsupported pricing model type: ${pricingModel.type}`);
    }
  }

  /**
   * Calculate usage-based pricing with tiered rates
   */
  private calculateUsageBasedPrice(
    model: PricingModelConfig,
    usage: UsageData
  ): PriceCalculation {
    const calculation: PriceCalculation = {
      baseAmount: 0,
      usageAmount: 0,
      overageAmount: 0,
      totalBeforeTax: 0,
      totalAmount: 0,
      breakdown: []
    };

    if (!model.config.tiers || model.config.tiers.length === 0) {
      throw new Error('Usage-based pricing requires tiers configuration');
    }

    let remainingRequests = usage.totalRequests;
    let previousTierLimit = 0;

    // Calculate tiered pricing
    for (const tier of model.config.tiers) {
      if (remainingRequests <= 0) break;

      const tierCapacity = tier.limitRequests
        ? tier.limitRequests - previousTierLimit
        : Infinity;

      const requestsInTier = Math.min(remainingRequests, tierCapacity);
      const tierUsageCost = requestsInTier * tier.pricePerUnit;

      // Add base fee only if we're using this tier
      if (requestsInTier > 0 && tier.baseFee > 0) {
        calculation.baseAmount += tier.baseFee;
      }

      calculation.usageAmount += tierUsageCost;
      calculation.breakdown.push({
        tier: tier.name,
        description: `${tier.name} tier (${requestsInTier.toLocaleString()} requests)`,
        quantity: requestsInTier,
        rate: tier.pricePerUnit,
        amount: tierUsageCost + (requestsInTier > 0 ? tier.baseFee : 0),
        metadata: {
          baseFee: tier.baseFee,
          usageCost: tierUsageCost,
          tierLimit: tier.limitRequests
        }
      });

      remainingRequests -= requestsInTier;
      if (tier.limitRequests) {
        previousTierLimit = tier.limitRequests;
      }
    }

    // Handle overage if enabled and there are remaining requests
    if (remainingRequests > 0 && model.config.overage?.enabled) {
      const graceRequests = model.config.overage.graceRequests || 0;
      const chargeableOverage = Math.max(0, remainingRequests - graceRequests);

      if (chargeableOverage > 0) {
        const overageCost = chargeableOverage * model.config.overage.requestsPricePerUnit;
        calculation.overageAmount = overageCost;

        calculation.breakdown.push({
          tier: 'overage',
          description: `Overage requests (${chargeableOverage.toLocaleString()} requests)`,
          quantity: chargeableOverage,
          rate: model.config.overage.requestsPricePerUnit,
          amount: overageCost,
          metadata: {
            totalOverage: remainingRequests,
            graceRequests,
            chargeableOverage
          }
        });
      }
    }

    calculation.totalBeforeTax = calculation.baseAmount + calculation.usageAmount + calculation.overageAmount;
    calculation.totalAmount = calculation.totalBeforeTax;

    return calculation;
  }

  /**
   * Calculate subscription-based pricing
   */
  private calculateSubscriptionPrice(
    model: PricingModelConfig,
    usage: UsageData
  ): PriceCalculation {
    const calculation: PriceCalculation = {
      baseAmount: model.basePrice || 0,
      usageAmount: 0,
      overageAmount: 0,
      totalBeforeTax: model.basePrice || 0,
      totalAmount: model.basePrice || 0,
      breakdown: [{
        description: `${model.name} - Monthly Subscription`,
        amount: model.basePrice || 0,
        metadata: {
          billingCycle: model.billingCycle,
          includedRequests: model.config.includedUsage?.requests
        }
      }]
    };

    // Calculate overages if configured
    if (model.config.overage?.enabled && model.config.includedUsage) {
      const includedRequests = model.config.includedUsage.requests;
      const overageRequests = Math.max(0, usage.totalRequests - includedRequests);

      if (overageRequests > 0) {
        const requestOverageCost = overageRequests * model.config.overage.requestsPricePerUnit;
        calculation.overageAmount += requestOverageCost;

        calculation.breakdown.push({
          tier: 'request_overage',
          description: `Additional requests (${overageRequests.toLocaleString()})`,
          quantity: overageRequests,
          rate: model.config.overage.requestsPricePerUnit,
          amount: requestOverageCost
        });
      }

      // Data transfer overage
      if (model.config.includedUsage.dataTransferGB && model.config.overage.dataPricePerGB) {
        const overageDataGB = Math.max(0, usage.dataTransferredGB - model.config.includedUsage.dataTransferGB);

        if (overageDataGB > 0) {
          const dataOverageCost = overageDataGB * model.config.overage.dataPricePerGB;
          calculation.overageAmount += dataOverageCost;

          calculation.breakdown.push({
            tier: 'data_overage',
            description: `Additional data transfer (${overageDataGB.toFixed(2)} GB)`,
            quantity: overageDataGB,
            rate: model.config.overage.dataPricePerGB,
            amount: dataOverageCost
          });
        }
      }
    }

    calculation.totalBeforeTax = calculation.baseAmount + calculation.overageAmount;
    calculation.totalAmount = calculation.totalBeforeTax;

    return calculation;
  }

  /**
   * Calculate freemium pricing (free tier with optional paid features)
   */
  private calculateFreemiumPrice(
    model: PricingModelConfig,
    usage: UsageData
  ): PriceCalculation {
    const calculation: PriceCalculation = {
      baseAmount: 0,
      usageAmount: 0,
      overageAmount: 0,
      totalBeforeTax: 0,
      totalAmount: 0,
      breakdown: []
    };

    if (!model.config.includedUsage) {
      throw new Error('Freemium pricing requires included_usage configuration');
    }

    const includedRequests = model.config.includedUsage.requests;

    // Check if usage is within free tier
    if (usage.totalRequests <= includedRequests) {
      calculation.breakdown.push({
        description: `${model.name} - Free Tier`,
        amount: 0,
        metadata: {
          requestsUsed: usage.totalRequests,
          requestsIncluded: includedRequests,
          remaining: includedRequests - usage.totalRequests
        }
      });

      return calculation;
    }

    // Usage exceeded free tier
    if (model.config.overage?.enabled) {
      const overageRequests = usage.totalRequests - includedRequests;
      const overageCost = overageRequests * model.config.overage.requestsPricePerUnit;

      calculation.overageAmount = overageCost;
      calculation.breakdown.push({
        description: `${model.name} - Free Tier (${includedRequests.toLocaleString()} requests)`,
        amount: 0
      });
      calculation.breakdown.push({
        tier: 'freemium_overage',
        description: `Overage beyond free tier (${overageRequests.toLocaleString()} requests)`,
        quantity: overageRequests,
        rate: model.config.overage.requestsPricePerUnit,
        amount: overageCost
      });

      calculation.totalBeforeTax = overageCost;
      calculation.totalAmount = overageCost;
    }

    return calculation;
  }

  /**
   * Calculate hybrid pricing (base subscription + tiered usage)
   */
  private calculateHybridPrice(
    model: PricingModelConfig,
    usage: UsageData
  ): PriceCalculation {
    // Start with base subscription
    const calculation: PriceCalculation = {
      baseAmount: model.basePrice || 0,
      usageAmount: 0,
      overageAmount: 0,
      totalBeforeTax: model.basePrice || 0,
      totalAmount: model.basePrice || 0,
      breakdown: [{
        description: `${model.name} - Base Subscription`,
        amount: model.basePrice || 0,
        metadata: {
          includedRequests: model.config.includedUsage?.requests
        }
      }]
    };

    if (!model.config.includedUsage) {
      throw new Error('Hybrid pricing requires included_usage configuration');
    }

    const includedRequests = model.config.includedUsage.requests;
    const additionalUsage = Math.max(0, usage.totalRequests - includedRequests);

    // No additional charges if within included usage
    if (additionalUsage === 0) {
      return calculation;
    }

    // Calculate tiered pricing for additional usage
    if (model.config.tiers && model.config.tiers.length > 0) {
      let remainingRequests = additionalUsage;
      let previousTierLimit = 0;

      for (const tier of model.config.tiers) {
        if (remainingRequests <= 0) break;

        const tierCapacity = tier.limitRequests
          ? tier.limitRequests - previousTierLimit
          : Infinity;

        const requestsInTier = Math.min(remainingRequests, tierCapacity);
        const tierCost = requestsInTier * tier.pricePerUnit;

        calculation.usageAmount += tierCost;
        calculation.breakdown.push({
          tier: tier.name,
          description: `Additional usage - ${tier.name} (${requestsInTier.toLocaleString()} requests)`,
          quantity: requestsInTier,
          rate: tier.pricePerUnit,
          amount: tierCost
        });

        remainingRequests -= requestsInTier;
        if (tier.limitRequests) {
          previousTierLimit = tier.limitRequests;
        }
      }
    }

    calculation.totalBeforeTax = calculation.baseAmount + calculation.usageAmount;
    calculation.totalAmount = calculation.totalBeforeTax;

    return calculation;
  }

  /**
   * Calculate prorated amount for mid-period changes
   */
  calculateProration(
    currentPrice: number,
    newPrice: number,
    daysRemaining: number,
    daysInPeriod: number
  ): number {
    const unusedAmount = (currentPrice / daysInPeriod) * daysRemaining;
    const newPeriodAmount = (newPrice / daysInPeriod) * daysRemaining;
    return newPeriodAmount - unusedAmount;
  }

  /**
   * Add tax to calculation
   */
  addTax(calculation: PriceCalculation, taxRate: number): PriceCalculation {
    const taxAmount = calculation.totalBeforeTax * (taxRate / 100);

    return {
      ...calculation,
      taxAmount,
      totalAmount: calculation.totalBeforeTax + taxAmount
    };
  }

  /**
   * Format price calculation for display
   */
  formatCalculation(calculation: PriceCalculation, currency: string = 'USD'): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    });

    let output = '=== Price Breakdown ===\n';

    for (const item of calculation.breakdown) {
      output += `${item.description}: ${formatter.format(item.amount)}\n`;
    }

    output += `\n`;
    output += `Subtotal: ${formatter.format(calculation.totalBeforeTax)}\n`;

    if (calculation.taxAmount) {
      output += `Tax: ${formatter.format(calculation.taxAmount)}\n`;
    }

    if (calculation.discountAmount) {
      output += `Discount: -${formatter.format(calculation.discountAmount)}\n`;
    }

    output += `\nTotal: ${formatter.format(calculation.totalAmount)}\n`;

    return output;
  }
}

// Export singleton instance
export const pricingEngine = new PricingCalculationEngine();