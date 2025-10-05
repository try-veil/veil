import { pricingModelRepository } from '../repositories/pricing-model-repository';
import { usageRecordRepository } from '../repositories/usage-record-repository';
import {
  PricingModel,
  ProxyRequestMetrics,
  CostCalculationResult,
  CreatePricingModelData,
  UpdatePricingModelData,
} from '../types';

export class PricingService {
  async createModel(data: CreatePricingModelData) {
    return await pricingModelRepository.create(data);
  }

  async getModel(uid: string) {
    return await pricingModelRepository.findByUid(uid);
  }

  async getModelById(id: number) {
    return await pricingModelRepository.findById(id);
  }

  async listModels(activeOnly: boolean = true) {
    return await pricingModelRepository.findAll(activeOnly);
  }

  async updateModel(uid: string, data: UpdatePricingModelData) {
    const model = await pricingModelRepository.findByUid(uid);
    if (!model) {
      throw new Error('Pricing model not found');
    }

    return await pricingModelRepository.update(model.id, data);
  }

  async deleteModel(uid: string) {
    const model = await pricingModelRepository.findByUid(uid);
    if (!model) {
      throw new Error('Pricing model not found');
    }

    return await pricingModelRepository.delete(model.id);
  }

  /**
   * Estimate cost before request is made
   */
  async estimateCost(
    pricingModel: PricingModel,
    estimatedRequestSize: number = 1024 // 1KB default
  ): Promise<number> {
    switch (pricingModel.type) {
      case 'per_request':
        return parseFloat(pricingModel.baseCost);

      case 'per_kb':
        const requestKB = estimatedRequestSize / 1024;
        return requestKB * parseFloat(pricingModel.costPerKbRequest);

      case 'per_minute':
        // Estimate 1 second for initial reservation
        return parseFloat(pricingModel.costPerMinute) / 60;

      case 'tiered':
        // Use highest tier cost for estimate
        const tiers = (pricingModel.tiers as any) || [];
        if (tiers.length === 0) return 0;
        return tiers[tiers.length - 1].costPerRequest;

      default:
        return 0;
    }
  }

  /**
   * Calculate actual cost after request completes
   */
  async calculateCost(
    pricingModel: PricingModel,
    metrics: ProxyRequestMetrics,
    userId?: number
  ): Promise<CostCalculationResult> {
    const breakdown: any = {};
    let actualCost = 0;

    switch (pricingModel.type) {
      case 'per_request':
        const baseCost = parseFloat(pricingModel.baseCost);
        breakdown.baseCost = baseCost;
        actualCost = baseCost;
        break;

      case 'per_kb':
        const requestKB = metrics.requestSize / 1024;
        const responseKB = metrics.responseSize / 1024;
        const requestCost = requestKB * parseFloat(pricingModel.costPerKbRequest);
        const responseCost = responseKB * parseFloat(pricingModel.costPerKbResponse);

        breakdown.requestCost = requestCost;
        breakdown.responseCost = responseCost;
        actualCost = requestCost + responseCost;
        break;

      case 'per_minute':
        if (metrics.duration) {
          const minutes = metrics.duration / 60000;
          const durationCost = minutes * parseFloat(pricingModel.costPerMinute);
          breakdown.durationCost = durationCost;
          actualCost = durationCost;
        }
        break;

      case 'tiered':
        if (userId) {
          // Get user's monthly request count
          const monthlyCount = await usageRecordRepository.getMonthlyRequestCount(userId);
          const tier = this.findApplicableTier(monthlyCount, pricingModel.tiers as any);
          if (tier) {
            breakdown.tierCost = tier.costPerRequest;
            breakdown.monthlyRequests = monthlyCount;
            actualCost = tier.costPerRequest;
          }
        }
        break;
    }

    return {
      estimatedCost: await this.estimateCost(pricingModel, metrics.requestSize),
      actualCost,
      breakdown,
      pricingModel,
    };
  }

  private findApplicableTier(requestCount: number, tiers: any[]): any {
    if (!tiers || tiers.length === 0) return null;

    for (const tier of tiers) {
      if (!tier.upToRequests || requestCount < tier.upToRequests) {
        return tier;
      }
    }

    // Return last tier (unlimited)
    return tiers[tiers.length - 1];
  }
}

export const pricingService = new PricingService();
