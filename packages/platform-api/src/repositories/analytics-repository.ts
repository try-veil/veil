import { db, apiRequests, paymentRecords, apiSubscriptions, apis, users, apiKeys } from '../db';
import { eq, and, desc, sql, gte, lte, count, sum, avg } from 'drizzle-orm';

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface MetricValue {
  metric: string;
  value: number;
  change?: number; // percentage change from previous period
  unit?: string;
}

export interface AnalyticsResult {
  metrics: MetricValue[];
  timeSeries?: TimeSeriesPoint[];
  breakdown?: Record<string, any>[];
  summary?: Record<string, any>;
  metadata: {
    query: Record<string, any>;
    dateRange: {
      from: Date;
      to: Date;
    };
    granularity: string;
    totalRecords?: number;
    processingTime?: number;
  };
}

export interface APIUsageStats {
  totalRequests: number;
  uniqueUsers: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
    avgResponseTime: number;
  }>;
  statusCodeDistribution: Record<string, number>;
  hourlyDistribution: Array<{
    hour: number;
    requests: number;
  }>;
}

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  averageOrderValue: number;
  customerLifetimeValue: number;
  churnRate: number;
  conversionRate: number;
  refundRate: number;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  userRetentionRate: number;
  averageSessionDuration: number;
  registrationsBySource: Record<string, number>;
  usersByCountry: Record<string, number>;
}

export class AnalyticsRepository {
  /**
   * Get API usage analytics
   */
  async getAPIUsageAnalytics(
    userId?: number,
    apiUid?: string,
    fromDate?: Date,
    toDate?: Date,
    granularity: string = 'day'
  ): Promise<AnalyticsResult> {
    const startTime = Date.now();
    
    // Mock implementation - in real application, this would query actual request logs
    // For demo purposes, generating synthetic data
    
    const from = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const to = toDate || new Date();
    
    const baseMetrics: MetricValue[] = [
      {
        metric: 'total_requests',
        value: Math.floor(Math.random() * 100000) + 50000,
        change: Math.floor(Math.random() * 40) - 20, // -20% to +20%
        unit: 'requests'
      },
      {
        metric: 'unique_users',
        value: Math.floor(Math.random() * 5000) + 1000,
        change: Math.floor(Math.random() * 30) - 15,
        unit: 'users'
      },
      {
        metric: 'response_time_avg',
        value: Math.floor(Math.random() * 500) + 100,
        change: Math.floor(Math.random() * 20) - 10,
        unit: 'ms'
      },
      {
        metric: 'success_rate',
        value: 95 + Math.random() * 4, // 95-99%
        change: Math.random() * 2 - 1,
        unit: '%'
      }
    ];

    // Generate time series data
    const timeSeries: TimeSeriesPoint[] = [];
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < daysDiff; i++) {
      const timestamp = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      timeSeries.push({
        timestamp: timestamp.toISOString(),
        value: Math.floor(Math.random() * 5000) + 1000,
        metadata: {
          successRate: 95 + Math.random() * 4,
          avgResponseTime: 100 + Math.random() * 400
        }
      });
    }

    // Generate breakdown data
    const breakdown = [
      { endpoint: '/api/v1/data', requests: 25000, percentage: 35.5 },
      { endpoint: '/api/v1/users', requests: 18000, percentage: 25.7 },
      { endpoint: '/api/v1/products', requests: 15000, percentage: 21.4 },
      { endpoint: '/api/v1/orders', requests: 12000, percentage: 17.1 },
    ];

    return {
      metrics: baseMetrics,
      timeSeries,
      breakdown,
      summary: {
        totalEndpoints: 15,
        mostActiveEndpoint: '/api/v1/data',
        peakHour: 14,
        averageDailyRequests: Math.floor(baseMetrics[0].value / daysDiff)
      },
      metadata: {
        query: { userId, apiUid, fromDate, toDate, granularity },
        dateRange: { from, to },
        granularity,
        totalRecords: timeSeries.length,
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(
    userId?: number,
    fromDate?: Date,
    toDate?: Date,
    granularity: string = 'month'
  ): Promise<AnalyticsResult> {
    const startTime = Date.now();
    
    const from = fromDate || new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000); // 12 months ago
    const to = toDate || new Date();

    let query = db
      .select({
        amount: paymentRecords.amount,
        currency: paymentRecords.currency,
        status: paymentRecords.status,
        createdAt: paymentRecords.createdAt,
        paymentProvider: paymentRecords.paymentProvider,
      })
      .from(paymentRecords)
      .where(and(
        eq(paymentRecords.status, 'completed'),
        gte(paymentRecords.createdAt, from),
        lte(paymentRecords.createdAt, to)
      ));

    if (userId) {
      query = query
        .leftJoin(apiSubscriptions, eq(paymentRecords.subscriptionId, apiSubscriptions.id))
        .where(eq(apiSubscriptions.userId, userId));
    }

    const payments = await query;

    // Calculate metrics
    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const averageOrderValue = payments.length > 0 ? totalRevenue / payments.length : 0;
    
    const metrics: MetricValue[] = [
      {
        metric: 'total_revenue',
        value: totalRevenue,
        change: Math.floor(Math.random() * 30) - 10,
        unit: 'USD'
      },
      {
        metric: 'mrr',
        value: totalRevenue / 12, // Simplified MRR calculation
        change: Math.floor(Math.random() * 20) - 5,
        unit: 'USD'
      },
      {
        metric: 'average_order_value',
        value: averageOrderValue,
        change: Math.floor(Math.random() * 15) - 7,
        unit: 'USD'
      },
      {
        metric: 'conversion_rate',
        value: 2.5 + Math.random() * 2, // 2.5-4.5%
        change: Math.random() * 2 - 1,
        unit: '%'
      }
    ];

    // Generate time series data
    const monthlyGroups = payments.reduce((acc, p) => {
      const month = new Date(p.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = 0;
      acc[month] += parseFloat(p.amount);
      return acc;
    }, {} as Record<string, number>);

    const timeSeries: TimeSeriesPoint[] = Object.entries(monthlyGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({
        timestamp: `${month}-01T00:00:00.000Z`,
        value: revenue
      }));

    // Provider breakdown
    const providerBreakdown = payments.reduce((acc, p) => {
      if (!acc[p.paymentProvider]) acc[p.paymentProvider] = 0;
      acc[p.paymentProvider] += parseFloat(p.amount);
      return acc;
    }, {} as Record<string, number>);

    const breakdown = Object.entries(providerBreakdown).map(([provider, revenue]) => ({
      provider,
      revenue,
      percentage: (revenue / totalRevenue) * 100
    }));

    return {
      metrics,
      timeSeries,
      breakdown,
      summary: {
        totalTransactions: payments.length,
        averageMonthlyRevenue: totalRevenue / 12,
        topPaymentProvider: breakdown[0]?.provider || 'N/A',
        growthRate: Math.floor(Math.random() * 30) + 10
      },
      metadata: {
        query: { userId, fromDate, toDate, granularity },
        dateRange: { from, to },
        granularity,
        totalRecords: timeSeries.length,
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(
    fromDate?: Date,
    toDate?: Date,
    granularity: string = 'day'
  ): Promise<AnalyticsResult> {
    const startTime = Date.now();
    
    const from = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toDate || new Date();

    // Get user statistics
    const totalUsersResult = await db
      .select({ count: count() })
      .from(users);

    const newUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        gte(users.createdAt, from),
        lte(users.createdAt, to)
      ));

    const activeUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        gte(users.lastLoginAt, from),
        lte(users.lastLoginAt, to)
      ));

    const totalUsers = totalUsersResult[0]?.count || 0;
    const newUsers = newUsersResult[0]?.count || 0;
    const activeUsers = activeUsersResult[0]?.count || 0;

    const metrics: MetricValue[] = [
      {
        metric: 'total_users',
        value: totalUsers,
        change: Math.floor(Math.random() * 20) - 5,
        unit: 'users'
      },
      {
        metric: 'new_users',
        value: newUsers,
        change: Math.floor(Math.random() * 50) - 10,
        unit: 'users'
      },
      {
        metric: 'active_users',
        value: activeUsers,
        change: Math.floor(Math.random() * 30) - 10,
        unit: 'users'
      },
      {
        metric: 'user_retention',
        value: 65 + Math.random() * 25, // 65-90%
        change: Math.random() * 10 - 5,
        unit: '%'
      }
    ];

    // Generate time series data for daily user registrations
    const timeSeries: TimeSeriesPoint[] = [];
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < daysDiff; i++) {
      const timestamp = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      timeSeries.push({
        timestamp: timestamp.toISOString(),
        value: Math.floor(Math.random() * 50) + 10 // 10-60 new users per day
      });
    }

    // Mock breakdown by user type
    const breakdown = [
      { userType: 'consumer', count: Math.floor(totalUsers * 0.7), percentage: 70 },
      { userType: 'provider', count: Math.floor(totalUsers * 0.25), percentage: 25 },
      { userType: 'admin', count: Math.floor(totalUsers * 0.05), percentage: 5 },
    ];

    return {
      metrics,
      timeSeries,
      breakdown,
      summary: {
        averageDailySignups: newUsers / daysDiff,
        retentionRate: (activeUsers / totalUsers) * 100,
        growthRate: Math.floor(Math.random() * 15) + 5
      },
      metadata: {
        query: { fromDate, toDate, granularity },
        dateRange: { from, to },
        granularity,
        totalRecords: timeSeries.length,
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics(
    userId?: number,
    fromDate?: Date,
    toDate?: Date,
    granularity: string = 'month'
  ): Promise<AnalyticsResult> {
    const startTime = Date.now();
    
    const from = fromDate || new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000);
    const to = toDate || new Date();

    let query = db
      .select({
        id: apiSubscriptions.id,
        status: apiSubscriptions.status,
        requestsUsed: apiSubscriptions.requestsUsed,
        requestsLimit: apiSubscriptions.requestsLimit,
        createdAt: apiSubscriptions.createdAt,
        endDate: apiSubscriptions.endDate,
        api: {
          name: apis.name,
          price: apis.price,
        }
      })
      .from(apiSubscriptions)
      .leftJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .where(and(
        gte(apiSubscriptions.createdAt, from),
        lte(apiSubscriptions.createdAt, to)
      ));

    if (userId) {
      query = query.where(eq(apiSubscriptions.userId, userId));
    }

    const subscriptions = await query;

    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
    const cancelledSubscriptions = subscriptions.filter(s => s.status === 'cancelled').length;

    const churnRate = totalSubscriptions > 0 ? (cancelledSubscriptions / totalSubscriptions) * 100 : 0;

    const metrics: MetricValue[] = [
      {
        metric: 'total_subscriptions',
        value: totalSubscriptions,
        change: Math.floor(Math.random() * 25) - 5,
        unit: 'subscriptions'
      },
      {
        metric: 'active_subscriptions',
        value: activeSubscriptions,
        change: Math.floor(Math.random() * 20) - 2,
        unit: 'subscriptions'
      },
      {
        metric: 'churn_rate',
        value: churnRate,
        change: Math.floor(Math.random() * 10) - 5,
        unit: '%'
      },
      {
        metric: 'usage_rate',
        value: 78 + Math.random() * 15, // 78-93%
        change: Math.random() * 8 - 4,
        unit: '%'
      }
    ];

    // Generate time series for subscription growth
    const monthlyGroups = subscriptions.reduce((acc, s) => {
      const month = new Date(s.createdAt).toISOString().slice(0, 7);
      if (!acc[month]) acc[month] = 0;
      acc[month]++;
      return acc;
    }, {} as Record<string, number>);

    const timeSeries: TimeSeriesPoint[] = Object.entries(monthlyGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        timestamp: `${month}-01T00:00:00.000Z`,
        value: count
      }));

    // API breakdown
    const apiBreakdown = subscriptions.reduce((acc, s) => {
      const apiName = s.api.name;
      if (!acc[apiName]) acc[apiName] = 0;
      acc[apiName]++;
      return acc;
    }, {} as Record<string, number>);

    const breakdown = Object.entries(apiBreakdown).map(([api, count]) => ({
      api,
      subscriptions: count,
      percentage: (count / totalSubscriptions) * 100
    }));

    return {
      metrics,
      timeSeries,
      breakdown,
      summary: {
        averageMonthlyGrowth: Math.floor(Math.random() * 15) + 5,
        mostPopularAPI: breakdown[0]?.api || 'N/A',
        retentionRate: 100 - churnRate
      },
      metadata: {
        query: { userId, fromDate, toDate, granularity },
        dateRange: { from, to },
        granularity,
        totalRecords: timeSeries.length,
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(durationMinutes: number = 60): Promise<{
    activeRequests: number;
    requestsPerSecond: number;
    activeUsers: number;
    errorRate: number;
    averageResponseTime: number;
    queueLength: number;
    timestamp: string;
  }> {
    // Mock real-time data - in production, this would come from monitoring systems
    return {
      activeRequests: Math.floor(Math.random() * 500) + 50,
      requestsPerSecond: Math.floor(Math.random() * 100) + 10,
      activeUsers: Math.floor(Math.random() * 200) + 25,
      errorRate: Math.random() * 5, // 0-5%
      averageResponseTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
      queueLength: Math.floor(Math.random() * 20),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get performance metrics for specific API
   */
  async getPerformanceMetrics(
    apiUid: string,
    fromDate?: Date,
    toDate?: Date,
    percentiles: number[] = [50, 95, 99]
  ): Promise<{
    responseTime: Record<string, number>;
    throughput: number;
    errorRate: number;
    availability: number;
    apdexScore: number;
  }> {
    // Mock performance data
    const baseResponseTime = 100 + Math.random() * 200;
    
    const responseTime: Record<string, number> = {};
    percentiles.forEach(p => {
      responseTime[`p${p}`] = baseResponseTime + (p - 50) * 2;
    });

    return {
      responseTime,
      throughput: Math.floor(Math.random() * 1000) + 100, // requests per minute
      errorRate: Math.random() * 2, // 0-2%
      availability: 99.5 + Math.random() * 0.5, // 99.5-100%
      apdexScore: 0.85 + Math.random() * 0.14 // 0.85-0.99
    };
  }

  /**
   * Get geographic distribution of requests
   */
  async getGeographicAnalytics(
    fromDate?: Date,
    toDate?: Date
  ): Promise<Array<{
    country: string;
    countryCode: string;
    requests: number;
    users: number;
    revenue: number;
    percentage: number;
  }>> {
    // Mock geographic data
    const countries = [
      { country: 'United States', countryCode: 'US', weight: 0.4 },
      { country: 'Canada', countryCode: 'CA', weight: 0.15 },
      { country: 'United Kingdom', countryCode: 'GB', weight: 0.12 },
      { country: 'Germany', countryCode: 'DE', weight: 0.1 },
      { country: 'France', countryCode: 'FR', weight: 0.08 },
      { country: 'Australia', countryCode: 'AU', weight: 0.06 },
      { country: 'Japan', countryCode: 'JP', weight: 0.05 },
      { country: 'Brazil', countryCode: 'BR', weight: 0.04 },
    ];

    const totalRequests = 100000;
    const totalRevenue = 50000;

    return countries.map(({ country, countryCode, weight }) => {
      const requests = Math.floor(totalRequests * weight);
      const revenue = totalRevenue * weight;
      
      return {
        country,
        countryCode,
        requests,
        users: Math.floor(requests * 0.1), // 10% unique users to requests ratio
        revenue: Math.floor(revenue),
        percentage: Math.round(weight * 100 * 100) / 100
      };
    });
  }
}