import { AnalyticsRepository, AnalyticsResult } from '../repositories/analytics-repository';

export interface DashboardData {
  overview: {
    totalAPIs: number;
    totalUsers: number;
    totalRequests: number;
    totalRevenue: number;
    growthMetrics: {
      usersGrowth: number;
      revenueGrowth: number;
      requestsGrowth: number;
    };
  };
  quickStats: Array<{
    title: string;
    value: string;
    change: number;
    trend: 'up' | 'down' | 'stable';
    icon: string;
  }>;
  charts: {
    requestsOverTime: AnalyticsResult;
    revenueOverTime: AnalyticsResult;
    topAPIs: Array<{
      name: string;
      requests: number;
      revenue: number;
    }>;
    userGrowth: AnalyticsResult;
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
  }>;
}

export interface CustomReport {
  id: string;
  name: string;
  description?: string;
  data: AnalyticsResult;
  generatedAt: Date;
  parameters: Record<string, any>;
}

export interface AlertConfiguration {
  id: string;
  name: string;
  description?: string;
  metric: string;
  threshold: {
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
    value: number;
    unit?: string;
  };
  conditions?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'contains' | 'in' | 'not_in';
    value: any;
  }>;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: Array<{
    type: 'email' | 'webhook' | 'slack' | 'sms' | 'pagerduty';
    config: Record<string, any>;
  }>;
  enabled: boolean;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class AnalyticsService {
  private analyticsRepository: AnalyticsRepository;

  constructor() {
    this.analyticsRepository = new AnalyticsRepository();
  }

  /**
   * Get comprehensive dashboard data for a user
   */
  async getUserDashboard(userId: number): Promise<DashboardData> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get parallel analytics data
      const [
        apiUsageResult,
        revenueResult,
        userResult,
        subscriptionResult
      ] = await Promise.all([
        this.analyticsRepository.getAPIUsageAnalytics(userId, undefined, thirtyDaysAgo, now),
        this.analyticsRepository.getRevenueAnalytics(userId, thirtyDaysAgo, now),
        this.analyticsRepository.getUserAnalytics(thirtyDaysAgo, now),
        this.analyticsRepository.getSubscriptionAnalytics(userId, thirtyDaysAgo, now)
      ]);

      // Calculate overview metrics
      const totalRequests = apiUsageResult.metrics.find(m => m.metric === 'total_requests')?.value || 0;
      const totalRevenue = revenueResult.metrics.find(m => m.metric === 'total_revenue')?.value || 0;
      const totalUsers = userResult.metrics.find(m => m.metric === 'active_users')?.value || 0;
      const totalAPIs = 5; // Mock value - would come from API count query

      const overview = {
        totalAPIs,
        totalUsers,
        totalRequests,
        totalRevenue,
        growthMetrics: {
          usersGrowth: userResult.metrics.find(m => m.metric === 'new_users')?.change || 0,
          revenueGrowth: revenueResult.metrics.find(m => m.metric === 'total_revenue')?.change || 0,
          requestsGrowth: apiUsageResult.metrics.find(m => m.metric === 'total_requests')?.change || 0,
        }
      };

      // Generate quick stats
      const quickStats = [
        {
          title: 'Total API Calls',
          value: this.formatNumber(totalRequests),
          change: overview.growthMetrics.requestsGrowth,
          trend: overview.growthMetrics.requestsGrowth > 0 ? 'up' as const : 
                 overview.growthMetrics.requestsGrowth < 0 ? 'down' as const : 'stable' as const,
          icon: 'activity'
        },
        {
          title: 'Revenue',
          value: `$${this.formatNumber(totalRevenue)}`,
          change: overview.growthMetrics.revenueGrowth,
          trend: overview.growthMetrics.revenueGrowth > 0 ? 'up' as const : 
                 overview.growthMetrics.revenueGrowth < 0 ? 'down' as const : 'stable' as const,
          icon: 'dollar-sign'
        },
        {
          title: 'Active Users',
          value: this.formatNumber(totalUsers),
          change: overview.growthMetrics.usersGrowth,
          trend: overview.growthMetrics.usersGrowth > 0 ? 'up' as const : 
                 overview.growthMetrics.usersGrowth < 0 ? 'down' as const : 'stable' as const,
          icon: 'users'
        },
        {
          title: 'Success Rate',
          value: `${apiUsageResult.metrics.find(m => m.metric === 'success_rate')?.value.toFixed(1) || '95.0'}%`,
          change: apiUsageResult.metrics.find(m => m.metric === 'success_rate')?.change || 0,
          trend: (apiUsageResult.metrics.find(m => m.metric === 'success_rate')?.change || 0) > 0 ? 'up' as const : 'down' as const,
          icon: 'check-circle'
        }
      ];

      // Mock top APIs data
      const topAPIs = [
        { name: 'Weather API', requests: Math.floor(totalRequests * 0.3), revenue: Math.floor(totalRevenue * 0.35) },
        { name: 'Payment API', requests: Math.floor(totalRequests * 0.25), revenue: Math.floor(totalRevenue * 0.4) },
        { name: 'User Management API', requests: Math.floor(totalRequests * 0.2), revenue: Math.floor(totalRevenue * 0.15) },
        { name: 'Analytics API', requests: Math.floor(totalRequests * 0.15), revenue: Math.floor(totalRevenue * 0.07) },
        { name: 'Notification API', requests: Math.floor(totalRequests * 0.1), revenue: Math.floor(totalRevenue * 0.03) },
      ];

      // Mock alerts
      const alerts = [
        {
          id: 'alert_1',
          type: 'warning' as const,
          message: 'API response time increased by 15% in the last hour',
          timestamp: new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago
        },
        {
          id: 'alert_2',
          type: 'info' as const,
          message: 'Monthly quota at 80% for Weather API',
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
        }
      ];

      return {
        overview,
        quickStats,
        charts: {
          requestsOverTime: apiUsageResult,
          revenueOverTime: revenueResult,
          topAPIs,
          userGrowth: userResult
        },
        alerts
      };

    } catch (error) {
      console.error('Error generating dashboard data:', error);
      throw new Error('Failed to generate dashboard data');
    }
  }

  /**
   * Get API usage analytics
   */
  async getAPIUsageAnalytics(
    userId?: number,
    apiUid?: string,
    fromDate?: Date,
    toDate?: Date,
    granularity: string = 'day',
    metrics: string[] = ['total_requests', 'success_rate']
  ): Promise<AnalyticsResult> {
    try {
      return await this.analyticsRepository.getAPIUsageAnalytics(
        userId,
        apiUid,
        fromDate,
        toDate,
        granularity
      );
    } catch (error) {
      console.error('Error fetching API usage analytics:', error);
      throw error;
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(
    userId?: number,
    fromDate?: Date,
    toDate?: Date,
    granularity: string = 'month',
    currency: string = 'USD'
  ): Promise<AnalyticsResult> {
    try {
      return await this.analyticsRepository.getRevenueAnalytics(
        userId,
        fromDate,
        toDate,
        granularity
      );
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      throw error;
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(
    fromDate?: Date,
    toDate?: Date,
    granularity: string = 'day',
    userType: string = 'all'
  ): Promise<AnalyticsResult> {
    try {
      return await this.analyticsRepository.getUserAnalytics(
        fromDate,
        toDate,
        granularity
      );
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      throw error;
    }
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
    try {
      return await this.analyticsRepository.getSubscriptionAnalytics(
        userId,
        fromDate,
        toDate,
        granularity
      );
    } catch (error) {
      console.error('Error fetching subscription analytics:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(
    durationMinutes: number = 60,
    metrics: string[] = ['active_requests', 'requests_per_second'],
    apiUid?: string
  ): Promise<any> {
    try {
      return await this.analyticsRepository.getRealTimeMetrics(durationMinutes);
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      throw error;
    }
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(
    apiUid: string,
    fromDate?: Date,
    toDate?: Date,
    percentiles: number[] = [50, 95, 99]
  ): Promise<any> {
    try {
      return await this.analyticsRepository.getPerformanceMetrics(
        apiUid,
        fromDate,
        toDate,
        percentiles
      );
    } catch (error) {
      console.error('Error fetching performance analytics:', error);
      throw error;
    }
  }

  /**
   * Get geographic analytics
   */
  async getGeographicAnalytics(
    fromDate?: Date,
    toDate?: Date,
    countryCodes?: string[],
    metrics: string[] = ['request_volume', 'unique_users']
  ): Promise<any> {
    try {
      const data = await this.analyticsRepository.getGeographicAnalytics(fromDate, toDate);
      
      // Filter by country codes if provided
      if (countryCodes && countryCodes.length > 0) {
        return data.filter(item => countryCodes.includes(item.countryCode));
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching geographic analytics:', error);
      throw error;
    }
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(
    userId: number,
    reportConfig: {
      name: string;
      description?: string;
      type: 'api_usage' | 'revenue' | 'user' | 'subscription' | 'performance' | 'geographic';
      parameters: Record<string, any>;
      metrics: string[];
    }
  ): Promise<CustomReport> {
    try {
      let data: AnalyticsResult;
      
      const { type, parameters } = reportConfig;
      
      switch (type) {
        case 'api_usage':
          data = await this.getAPIUsageAnalytics(
            userId,
            parameters.apiUid,
            parameters.fromDate ? new Date(parameters.fromDate) : undefined,
            parameters.toDate ? new Date(parameters.toDate) : undefined,
            parameters.granularity || 'day',
            reportConfig.metrics
          );
          break;
          
        case 'revenue':
          data = await this.getRevenueAnalytics(
            userId,
            parameters.fromDate ? new Date(parameters.fromDate) : undefined,
            parameters.toDate ? new Date(parameters.toDate) : undefined,
            parameters.granularity || 'month'
          );
          break;
          
        case 'user':
          data = await this.getUserAnalytics(
            parameters.fromDate ? new Date(parameters.fromDate) : undefined,
            parameters.toDate ? new Date(parameters.toDate) : undefined,
            parameters.granularity || 'day'
          );
          break;
          
        case 'subscription':
          data = await this.getSubscriptionAnalytics(
            userId,
            parameters.fromDate ? new Date(parameters.fromDate) : undefined,
            parameters.toDate ? new Date(parameters.toDate) : undefined,
            parameters.granularity || 'month'
          );
          break;
          
        default:
          throw new Error(`Unsupported report type: ${type}`);
      }

      const report: CustomReport = {
        id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: reportConfig.name,
        description: reportConfig.description,
        data,
        generatedAt: new Date(),
        parameters: reportConfig.parameters
      };

      console.log(`Custom report generated: ${report.id} for user ${userId}`);
      
      return report;

    } catch (error) {
      console.error('Error generating custom report:', error);
      throw error;
    }
  }

  /**
   * Create alert configuration
   */
  async createAlert(
    userId: number,
    alertConfig: {
      name: string;
      description?: string;
      metric: string;
      threshold: {
        operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
        value: number;
        unit?: string;
      };
      conditions?: Array<{
        field: string;
        operator: 'eq' | 'ne' | 'contains' | 'in' | 'not_in';
        value: any;
      }>;
      duration: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      channels: Array<{
        type: 'email' | 'webhook' | 'slack' | 'sms' | 'pagerduty';
        config: Record<string, any>;
      }>;
    }
  ): Promise<AlertConfiguration> {
    try {
      const alert: AlertConfiguration = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        ...alertConfig,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // TODO: Store in database
      console.log(`Alert configuration created: ${alert.id} for user ${userId}`);
      
      return alert;

    } catch (error) {
      console.error('Error creating alert configuration:', error);
      throw error;
    }
  }

  /**
   * Export dashboard data
   */
  async exportDashboard(
    userId: number,
    dashboardUid: string,
    format: 'json' | 'pdf' | 'png',
    dateRange: { from: Date; to: Date },
    includeData: boolean = true
  ): Promise<{
    downloadUrl: string;
    expiresAt: Date;
    format: string;
    size: number;
  }> {
    try {
      // Mock export functionality
      const exportId = `export_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // In real implementation, this would:
      // 1. Generate the export file (PDF/PNG/JSON)
      // 2. Store it temporarily in object storage
      // 3. Return a signed URL for download
      
      return {
        downloadUrl: `https://api.example.com/exports/${exportId}.${format}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        format,
        size: Math.floor(Math.random() * 5000000) + 100000 // Mock file size in bytes
      };

    } catch (error) {
      console.error('Error exporting dashboard:', error);
      throw error;
    }
  }

  /**
   * Calculate A/B test results
   */
  async calculateABTestResults(
    testId: string,
    confidenceLevel: number = 0.95,
    metrics: string[] = ['conversion_rate']
  ): Promise<{
    testId: string;
    variants: Array<{
      name: string;
      conversions: number;
      visitors: number;
      conversionRate: number;
      confidence?: number;
      significant?: boolean;
    }>;
    winner?: string;
    confidence: number;
    sampleSize: number;
    duration: number;
  }> {
    try {
      // Mock A/B test results
      const variants = [
        {
          name: 'Control',
          conversions: 156,
          visitors: 2430,
          conversionRate: 6.42,
          confidence: 87.5,
          significant: false
        },
        {
          name: 'Variant A',
          conversions: 189,
          visitors: 2387,
          conversionRate: 7.92,
          confidence: 95.3,
          significant: true
        }
      ];

      return {
        testId,
        variants,
        winner: 'Variant A',
        confidence: 95.3,
        sampleSize: 4817,
        duration: 14 // days
      };

    } catch (error) {
      console.error('Error calculating A/B test results:', error);
      throw error;
    }
  }

  /**
   * Perform cohort analysis
   */
  async performCohortAnalysis(
    cohortType: 'registration' | 'first_purchase' | 'first_api_call' = 'registration',
    cohortSize: 'daily' | 'weekly' | 'monthly' = 'monthly',
    periods: number = 12,
    metric: 'retention' | 'revenue' | 'activity' = 'retention'
  ): Promise<{
    cohorts: Array<{
      period: string;
      size: number;
      data: number[];
    }>;
    averageRetention: number[];
    totalCohorts: number;
  }> {
    try {
      // Mock cohort analysis
      const cohorts = [];
      const averageRetention = [];
      
      for (let i = 0; i < periods; i++) {
        const period = new Date();
        period.setMonth(period.getMonth() - i);
        
        const size = Math.floor(Math.random() * 200) + 50;
        const data = [];
        
        for (let j = 0; j < periods - i; j++) {
          const retention = Math.max(0, (100 - j * 5 - Math.random() * 10));
          data.push(Math.floor(retention));
        }
        
        cohorts.push({
          period: period.toISOString().slice(0, 7), // YYYY-MM
          size,
          data
        });
      }

      // Calculate average retention
      for (let period = 0; period < periods; period++) {
        const periodRetention = cohorts
          .filter(c => c.data[period] !== undefined)
          .map(c => c.data[period]);
        
        if (periodRetention.length > 0) {
          averageRetention.push(
            Math.floor(periodRetention.reduce((sum, val) => sum + val, 0) / periodRetention.length)
          );
        }
      }

      return {
        cohorts: cohorts.reverse(), // Show oldest first
        averageRetention,
        totalCohorts: cohorts.length
      };

    } catch (error) {
      console.error('Error performing cohort analysis:', error);
      throw error;
    }
  }

  /**
   * Helper method to format numbers
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}