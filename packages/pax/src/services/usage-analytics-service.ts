import { usageRecordRepository } from '../repositories/usage-record-repository';
import { UsageFilters } from '../types';

export class UsageAnalyticsService {
  async getUsageRecords(filters: UsageFilters) {
    return await usageRecordRepository.findByFilters(filters);
  }

  async getUsageAnalytics(filters: UsageFilters) {
    return await usageRecordRepository.getAnalytics(filters);
  }

  async getUserSummary(userId: number, fromDate?: Date, toDate?: Date) {
    const filters: UsageFilters = {
      userId,
      fromDate,
      toDate,
    };

    const analytics = await usageRecordRepository.getAnalytics(filters);

    return {
      totalRequests: analytics.totalRequests,
      totalCost: analytics.totalCost,
      avgCostPerRequest: analytics.avgCostPerRequest,
      period: {
        from: fromDate?.toISOString(),
        to: toDate?.toISOString(),
      },
      byApi: analytics.byApi,
      byDate: analytics.byDate,
      topEndpoints: analytics.topEndpoints,
    };
  }

  async getApiSummary(apiId: number, fromDate?: Date, toDate?: Date) {
    const filters: UsageFilters = {
      apiId,
      fromDate,
      toDate,
    };

    return await usageRecordRepository.getAnalytics(filters);
  }
}

export const usageAnalyticsService = new UsageAnalyticsService();
