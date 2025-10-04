// Pricing Model Types
export type PricingModelType = 'usage_based' | 'subscription' | 'freemium' | 'hybrid';
export type BillingCycle = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type PromotionType = 'percentage_discount' | 'fixed_discount' | 'tier_upgrade' | 'free_trial';

// Pricing Configuration interfaces
export interface PricingModelConfig {
  id?: number;
  uid?: string;
  name: string;
  description?: string;
  type: PricingModelType;
  billingCycle: BillingCycle;
  currency: string;
  basePrice?: number;
  config: PricingConfiguration;
  isActive?: boolean;
}

export interface PricingConfiguration {
  tiers?: PricingTierConfig[];
  includedUsage?: UsageAllocation;
  overage?: OverageConfig;
  quotas?: QuotaConfig;
  features?: string[];
}

export interface PricingTierConfig {
  name: string;
  limitRequests: number | null; // null = unlimited
  pricePerUnit: number;
  baseFee: number;
  features?: string[];
}

export interface UsageAllocation {
  requests: number;
  dataTransferGB?: number;
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
}

export interface OverageConfig {
  enabled: boolean;
  requestsPricePerUnit: number;
  dataPricePerGB?: number;
  graceRequests?: number;
  graceDataGB?: number;
}

export interface QuotaConfig {
  requestsPerHour?: number;
  requestsPerDay?: number;
  requestsPerMonth?: number;
  dataTransferGB?: number;
  concurrentRequests?: number;
  burstLimit?: number;
}

// Price Calculation Types
export interface PriceCalculation {
  baseAmount: number;
  usageAmount: number;
  overageAmount: number;
  discountAmount?: number;
  taxAmount?: number;
  totalBeforeTax: number;
  totalAmount: number;
  breakdown: PriceBreakdownItem[];
  appliedPromotions?: AppliedPromotion[];
  metadata?: Record<string, any>;
}

export interface PriceBreakdownItem {
  tier?: string;
  description: string;
  quantity?: number;
  rate?: number;
  amount: number;
  metadata?: Record<string, any>;
}

export interface AppliedPromotion {
  id: number;
  code?: string;
  name: string;
  type: PromotionType;
  discountAmount: number;
}

// Usage Data for Billing
export interface UsageData {
  subscriptionId: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  dataTransferredBytes: number;
  dataTransferredGB: number;
  periodStart: Date;
  periodEnd: Date;
  peakHourlyRequests?: number;
  averageResponseTime?: number;
}

// Promotion Types
export interface PromotionCondition {
  type: 'first_subscription' | 'usage_threshold' | 'user_created_after' | 'api_category' | 'custom';
  metric?: string;
  value?: any;
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
}

export interface PromotionConfig {
  id?: number;
  uid?: string;
  code?: string;
  name: string;
  description?: string;
  type: PromotionType;
  value: number;
  maxUses?: number;
  currentUses?: number;
  validFrom: Date;
  validUntil?: Date;
  conditions: PromotionCondition[];
  isActive: boolean;
  priority: number;
}

// Billing Period Types
export interface BillingPeriod {
  id: number;
  uid: string;
  subscriptionId: number;
  pricingModelId: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'closed' | 'cancelled';
  usageSnapshot?: UsageData;
  calculatedAmount?: number;
}

// Invoice Types
export interface Invoice {
  id: number;
  uid: string;
  invoiceNumber: string;
  subscriptionId: number;
  billingPeriodId?: number;
  userId: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  currency: string;

  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;

  breakdown: PriceBreakdownItem[];
  appliedPromotions?: AppliedPromotion[];

  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// Subscription Pricing Change Types
export interface SubscriptionPricingChange {
  id?: number;
  subscriptionId: number;
  pricingModelId: number;
  changeType: 'upgrade' | 'downgrade' | 'initial' | 'renewal';
  oldPricingModelId?: number;
  effectiveDate: Date;
  prorationCredit?: number;
  notes?: string;
}

// YAML Configuration Types (for config file loading)
export interface PricingYAMLConfig {
  pricing_models: PricingModelYAML[];
  promotions?: PromotionYAML[];
  settings?: PricingSettings;
}

export interface PricingModelYAML {
  id: string;
  name: string;
  description?: string;
  type: PricingModelType;
  billing_cycle: BillingCycle;
  currency: string;
  base_price?: number;

  tiers?: PricingTierYAML[];
  included_usage?: {
    requests: number;
    data_transfer_gb?: number;
    features?: string[];
  };
  overage?: {
    enabled: boolean;
    requests_price_per_unit?: number;
    data_price_per_gb?: number;
    grace_requests?: number;
  };
  quotas?: {
    requests_per_hour?: number;
    requests_per_day?: number;
    requests_per_month?: number;
    data_transfer_gb?: number;
    concurrent_requests?: number;
  };
}

export interface PricingTierYAML {
  name: string;
  limit: number | null;
  price_per_unit: number;
  base_fee: number;
  features?: string[];
}

export interface PromotionYAML {
  id: string;
  code?: string;
  name: string;
  description?: string;
  type: PromotionType;
  value: number;
  max_uses?: number;
  valid_from: string;
  valid_until?: string;
  duration_months?: number;
  conditions: Array<{
    type: string;
    metric?: string;
    value?: any;
    operator?: string;
  }>;
}

export interface PricingSettings {
  billing_grace_period_days: number;
  usage_calculation_precision: number;
  prorated_billing: boolean;
  tax_calculation: 'inclusive' | 'exclusive';
  currency_conversion: boolean;
  default_currency: string;
}

// Quota Status Types
export interface QuotaStatus {
  subscriptionId: number;
  periodStart: Date;
  periodEnd: Date;
  requestsUsed: number;
  requestsLimit: number;
  dataTransferredBytes: number;
  dataTransferLimitBytes?: number;
  isOverRequestLimit: boolean;
  isOverDataLimit: boolean;
  percentageUsed: number;
  nextResetAt: Date;
}

// Subscription Upgrade/Downgrade Types
export interface SubscriptionUpgrade {
  subscription: any; // Subscription type
  newPricingModel: PricingModelConfig;
  oldPricingModel?: PricingModelConfig;
  billingAdjustment: BillingAdjustment;
  effectiveDate: Date;
}

export interface BillingAdjustment {
  prorationCredit: number;
  prorationCharge: number;
  netAdjustment: number;
  description: string;
  nextBillingAmount: number;
  nextBillingDate: Date;
}

// Metering Types
export interface MeteringEvent {
  subscriptionId: number;
  apiId: number;
  apiKeyId: number;
  timestamp: Date;
  requests: number;
  dataTransferred: number;
  responseTime: number;
  statusCode: number;
  isSuccessful: boolean;
}

// Pricing Engine Result Types
export interface PricingEngineResult {
  calculation: PriceCalculation;
  quotaStatus: QuotaStatus;
  warnings: string[];
  recommendations?: string[];
}