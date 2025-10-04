import { PricingRepository } from '../../repositories/pricing-repository';
import { PricingCalculationEngine } from './pricing-engine';
import { PromotionEngine, PromotionContext } from './promotion-engine';
import { PricingConfigLoader } from './config-loader';
import {
  PricingModelConfig,
  UsageData,
  PriceCalculation,
  BillingPeriod,
  Invoice,
  PromotionConfig,
  PricingEngineResult
} from '../../types/pricing-types';

export class PricingService {
  private repository: PricingRepository;
  private calculationEngine: PricingCalculationEngine;
  private promotionEngine: PromotionEngine;
  private configLoader: PricingConfigLoader;

  constructor() {
    this.repository = new PricingRepository();
    this.calculationEngine = new PricingCalculationEngine();
    this.promotionEngine = new PromotionEngine();
    this.configLoader = new PricingConfigLoader();
  }

  /**
   * Initialize pricing service - load configurations
   */
  async initialize(): Promise<void> {
    try {
      const configs = await this.configLoader.loadPricingConfigs();
      console.log(`Loaded ${configs.length} pricing configurations`);

      // Sync configurations to database
      await this.syncConfigsToDatabase(configs);
    } catch (error) {
      console.error('Failed to initialize pricing service:', error);
      throw error;
    }
  }

  /**
   * Sync YAML configurations to database
   */
  private async syncConfigsToDatabase(configs: PricingModelConfig[]): Promise<void> {
    for (const config of configs) {
      try {
        // Check if model exists
        const existing = config.uid ? await this.repository.findPricingModelByUid(config.uid) : null;

        if (existing) {
          // Update existing model
          await this.repository.updatePricingModel(existing.id, {
            name: config.name,
            description: config.description,
            type: config.type,
            billingCycle: config.billingCycle,
            currency: config.currency,
            basePrice: config.basePrice?.toString(),
            configJson: JSON.stringify(config.config),
            isActive: config.isActive ?? true
          });
        } else {
          // Create new model
          const created = await this.repository.createPricingModel({
            uid: config.uid,
            name: config.name,
            description: config.description,
            type: config.type,
            billingCycle: config.billingCycle,
            currency: config.currency,
            basePrice: config.basePrice?.toString(),
            configJson: JSON.stringify(config.config),
            isActive: config.isActive ?? true
          });

          // Create tiers if present
          if (config.config.tiers) {
            for (let i = 0; i < config.config.tiers.length; i++) {
              const tier = config.config.tiers[i];
              await this.repository.createPricingTier({
                pricingModelId: created.id,
                name: tier.name,
                tierOrder: i,
                limitRequests: tier.limitRequests,
                pricePerUnit: tier.pricePerUnit.toString(),
                baseFee: tier.baseFee.toString(),
                features: tier.features ? JSON.stringify(tier.features) : null
              });
            }
          }
        }
      } catch (error) {
        console.error(`Failed to sync pricing model ${config.name}:`, error);
      }
    }
  }

  /**
   * Calculate price for a subscription
   */
  async calculateSubscriptionPrice(
    subscriptionId: number,
    pricingModelId: number,
    usage: UsageData,
    promotionCode?: string
  ): Promise<PricingEngineResult> {
    try {
      // Get pricing model
      const pricingModel = await this.getPricingModel(pricingModelId);
      if (!pricingModel) {
        throw new Error('Pricing model not found');
      }

      // Get current billing period
      const billingPeriod = await this.repository.findCurrentBillingPeriod(subscriptionId);
      if (!billingPeriod) {
        throw new Error('No active billing period found');
      }

      // Calculate base price
      let calculation = await this.calculationEngine.calculatePrice(
        pricingModel,
        usage,
        billingPeriod as BillingPeriod
      );

      // Get and apply promotions
      const promotions = await this.getApplicablePromotions(subscriptionId, promotionCode);
      if (promotions.length > 0) {
        calculation = this.promotionEngine.applyPromotions(calculation, promotions);
      }

      // Calculate quota status
      const quotaStatus = this.calculateQuotaStatus(pricingModel, usage, billingPeriod as BillingPeriod);

      // Generate warnings
      const warnings = this.generateWarnings(calculation, quotaStatus, pricingModel);

      return {
        calculation,
        quotaStatus,
        warnings,
        recommendations: this.generateRecommendations(calculation, quotaStatus, pricingModel)
      };

    } catch (error) {
      console.error('Error calculating subscription price:', error);
      throw error;
    }
  }

  /**
   * Get pricing model configuration
   */
  private async getPricingModel(pricingModelId: number): Promise<PricingModelConfig | null> {
    const dbModel = await this.repository.findPricingModelById(pricingModelId);
    if (!dbModel) return null;

    const config = JSON.parse(dbModel.configJson);
    const tiers = await this.repository.findTiersByPricingModel(pricingModelId);

    return {
      id: dbModel.id,
      uid: dbModel.uid,
      name: dbModel.name,
      description: dbModel.description || undefined,
      type: dbModel.type as any,
      billingCycle: dbModel.billingCycle as any,
      currency: dbModel.currency,
      basePrice: dbModel.basePrice ? parseFloat(dbModel.basePrice) : undefined,
      config: {
        ...config,
        tiers: tiers.map(t => ({
          name: t.name,
          limitRequests: t.limitRequests,
          pricePerUnit: parseFloat(t.pricePerUnit),
          baseFee: parseFloat(t.baseFee),
          features: t.features ? JSON.parse(t.features) : undefined
        }))
      },
      isActive: dbModel.isActive
    };
  }

  /**
   * Get applicable promotions for a subscription
   */
  private async getApplicablePromotions(
    subscriptionId: number,
    promotionCode?: string
  ): Promise<PromotionConfig[]> {
    // Get all active promotions from database
    const dbPromotions = await this.repository.findActivePromotions();

    // Convert to PromotionConfig format
    const promotions: PromotionConfig[] = dbPromotions.map(p => ({
      id: p.id,
      uid: p.uid,
      code: p.code || undefined,
      name: p.name,
      description: p.description || undefined,
      type: p.type as any,
      value: parseFloat(p.value),
      maxUses: p.maxUses || undefined,
      currentUses: p.currentUses,
      validFrom: p.validFrom,
      validUntil: p.validUntil || undefined,
      conditions: p.conditions ? JSON.parse(p.conditions) : [],
      isActive: p.isActive,
      priority: p.priority
    }));

    // Build promotion context (would need actual subscription data)
    const context: PromotionContext = {
      userId: 0, // Get from subscription
      subscriptionId,
      apiId: 0, // Get from subscription
      promotionCode
    };

    return await this.promotionEngine.getApplicablePromotions(promotions, context);
  }

  /**
   * Calculate quota status
   */
  private calculateQuotaStatus(
    pricingModel: PricingModelConfig,
    usage: UsageData,
    billingPeriod: BillingPeriod
  ): any {
    const quotas = pricingModel.config.quotas;
    if (!quotas) {
      return {
        subscriptionId: usage.subscriptionId,
        periodStart: billingPeriod.startDate,
        periodEnd: billingPeriod.endDate,
        requestsUsed: usage.totalRequests,
        requestsLimit: Infinity,
        dataTransferredBytes: usage.dataTransferredBytes,
        isOverRequestLimit: false,
        isOverDataLimit: false,
        percentageUsed: 0,
        nextResetAt: billingPeriod.endDate
      };
    }

    const requestLimit = quotas.requestsPerMonth || Infinity;
    const dataLimit = quotas.dataTransferGB ? quotas.dataTransferGB * 1024 * 1024 * 1024 : undefined;

    return {
      subscriptionId: usage.subscriptionId,
      periodStart: billingPeriod.startDate,
      periodEnd: billingPeriod.endDate,
      requestsUsed: usage.totalRequests,
      requestsLimit: requestLimit,
      dataTransferredBytes: usage.dataTransferredBytes,
      dataTransferLimitBytes: dataLimit,
      isOverRequestLimit: usage.totalRequests >= requestLimit,
      isOverDataLimit: dataLimit ? usage.dataTransferredBytes >= dataLimit : false,
      percentageUsed: (usage.totalRequests / requestLimit) * 100,
      nextResetAt: billingPeriod.endDate
    };
  }

  /**
   * Generate warnings based on usage
   */
  private generateWarnings(
    calculation: PriceCalculation,
    quotaStatus: any,
    pricingModel: PricingModelConfig
  ): string[] {
    const warnings: string[] = [];

    if (quotaStatus.percentageUsed > 80) {
      warnings.push(`Usage is at ${quotaStatus.percentageUsed.toFixed(1)}% of quota`);
    }

    if (quotaStatus.isOverRequestLimit) {
      warnings.push('Request quota exceeded - overage charges applied');
    }

    if (quotaStatus.isOverDataLimit) {
      warnings.push('Data transfer quota exceeded - overage charges applied');
    }

    if (calculation.overageAmount > calculation.baseAmount + calculation.usageAmount) {
      warnings.push('Overage charges exceed base pricing - consider upgrading plan');
    }

    return warnings;
  }

  /**
   * Generate recommendations for optimization
   */
  private generateRecommendations(
    calculation: PriceCalculation,
    quotaStatus: any,
    pricingModel: PricingModelConfig
  ): string[] {
    const recommendations: string[] = [];

    // Check if user should upgrade
    if (quotaStatus.percentageUsed > 90) {
      recommendations.push('Consider upgrading to a higher tier to reduce per-unit costs');
    }

    // Check overage patterns
    if (calculation.overageAmount > 0) {
      const overagePercentage = (calculation.overageAmount / calculation.totalBeforeTax) * 100;
      if (overagePercentage > 30) {
        recommendations.push('Significant overage detected - a higher base plan may be more cost-effective');
      }
    }

    return recommendations;
  }

  /**
   * Create invoice for a billing period
   */
  async createInvoice(
    subscriptionId: number,
    userId: number,
    billingPeriodId: number,
    calculation: PriceCalculation
  ): Promise<Invoice> {
    try {
      const invoiceNumber = await this.repository.generateInvoiceNumber();

      const invoice = await this.repository.createInvoice({
        invoiceNumber,
        subscriptionId,
        billingPeriodId,
        userId,
        status: 'pending',
        currency: 'USD',
        subtotal: calculation.totalBeforeTax.toString(),
        discountAmount: (calculation.discountAmount || 0).toString(),
        taxAmount: (calculation.taxAmount || 0).toString(),
        totalAmount: calculation.totalAmount.toString(),
        breakdown: JSON.stringify(calculation.breakdown),
        appliedPromotions: calculation.appliedPromotions ? JSON.stringify(calculation.appliedPromotions) : null,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      return invoice as Invoice;

    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  /**
   * Get pricing models for an API
   */
  async getAvailablePricingModels(apiId?: number): Promise<PricingModelConfig[]> {
    const dbModels = await this.repository.findActivePricingModels();

    const models: PricingModelConfig[] = [];
    for (const dbModel of dbModels) {
      const model = await this.getPricingModel(dbModel.id);
      if (model) {
        models.push(model);
      }
    }

    return models;
  }

  /**
   * Validate promotion code
   */
  async validatePromotionCode(code: string): Promise<PromotionConfig | null> {
    const dbPromotion = await this.repository.findPromotionByCode(code);
    if (!dbPromotion) {
      return null;
    }

    return {
      id: dbPromotion.id,
      uid: dbPromotion.uid,
      code: dbPromotion.code || undefined,
      name: dbPromotion.name,
      description: dbPromotion.description || undefined,
      type: dbPromotion.type as any,
      value: parseFloat(dbPromotion.value),
      maxUses: dbPromotion.maxUses || undefined,
      currentUses: dbPromotion.currentUses,
      validFrom: dbPromotion.validFrom,
      validUntil: dbPromotion.validUntil || undefined,
      conditions: dbPromotion.conditions ? JSON.parse(dbPromotion.conditions) : [],
      isActive: dbPromotion.isActive,
      priority: dbPromotion.priority
    };
  }

  /**
   * Apply promotion code to subscription
   */
  async applyPromotionCode(subscriptionId: number, code: string): Promise<boolean> {
    const promotion = await this.validatePromotionCode(code);
    if (!promotion) {
      throw new Error('Invalid promotion code');
    }

    // Increment usage
    await this.repository.incrementPromotionUsage(promotion.id!);

    return true;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: number): Promise<Invoice | null> {
    const dbInvoice = await this.repository.findInvoiceById(invoiceId);
    if (!dbInvoice) return null;

    return {
      ...dbInvoice,
      subtotal: parseFloat(dbInvoice.subtotal),
      discountAmount: parseFloat(dbInvoice.discountAmount),
      taxAmount: parseFloat(dbInvoice.taxAmount),
      totalAmount: parseFloat(dbInvoice.totalAmount),
      breakdown: JSON.parse(dbInvoice.breakdown),
      appliedPromotions: dbInvoice.appliedPromotions ? JSON.parse(dbInvoice.appliedPromotions) : undefined
    };
  }

  /**
   * Get invoices for user
   */
  async getUserInvoices(userId: number, limit: number = 20): Promise<Invoice[]> {
    const dbInvoices = await this.repository.findInvoicesByUser(userId, limit);

    return dbInvoices.map(inv => ({
      ...inv,
      subtotal: parseFloat(inv.subtotal),
      discountAmount: parseFloat(inv.discountAmount),
      taxAmount: parseFloat(inv.taxAmount),
      totalAmount: parseFloat(inv.totalAmount),
      breakdown: JSON.parse(inv.breakdown),
      appliedPromotions: inv.appliedPromotions ? JSON.parse(inv.appliedPromotions) : undefined
    }));
  }
}

// Export singleton instance
export const pricingService = new PricingService();