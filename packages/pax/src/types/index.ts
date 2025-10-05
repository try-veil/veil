// Payment Provider Interfaces
export interface PaymentProvider {
  name: string;
  createPayment(data: PaymentProviderRequest): Promise<PaymentProviderResponse>;
  processPayment(data: ProcessPaymentProviderRequest): Promise<PaymentProviderResponse>;
  refundPayment(data: RefundPaymentProviderRequest): Promise<RefundProviderResponse>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse>;
  validateWebhook(payload: any, signature: string): boolean;
}

export interface PaymentProviderRequest {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ProcessPaymentProviderRequest {
  paymentId: string;
  paymentToken: string;
  additionalData?: Record<string, any>;
}

export interface RefundPaymentProviderRequest {
  paymentId: string;
  amount?: number;
  reason: string;
}

export interface PaymentProviderResponse {
  success: boolean;
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  clientSecret?: string;
  redirectUrl?: string;
  metadata?: Record<string, any>;
}

export interface RefundProviderResponse {
  success: boolean;
  refundId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  amount: number;
  currency: string;
  processedAt?: Date;
  failureReason?: string;
}

// Payment Transaction Types
export interface CreatePaymentTransactionData {
  userId: number;
  provider: string;
  amount: string;
  currency: string;
  metadata?: any;
  providerOrderId?: string;
}

export interface UpdatePaymentTransactionData {
  status?: string;
  providerTransactionId?: string;
  paymentMethod?: string;
  metadata?: any;
  webhookReceived?: boolean;
  webhookProcessedAt?: Date;
  errorCode?: string;
  errorDescription?: string;
  completedAt?: Date;
}

// Webhook Event Types
export interface CreateWebhookEventData {
  provider: string;
  eventId: string;
  eventType: string;
  payload: any;
  rawPayload?: string;
  signatureValid: boolean;
}

// Refund Types
export interface CreateRefundData {
  paymentTransactionId: number;
  amount: string;
  currency: string;
  reason?: string;
  providerRefundId?: string;
  metadata?: any;
}

// Credit System Types

// Credit Account Types
export interface CreditAccount {
  id: number;
  uid: string;
  userId: number;
  balance: string;
  reservedBalance: string;
  totalCredits: string;
  totalSpent: string;
  currency: string;
  lowBalanceThreshold: string;
  autoRechargeEnabled: boolean;
  autoRechargeAmount: string;
  autoRechargeThreshold: string;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string | null;
  lastTransactionAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BalanceInfo {
  balance: number;
  reservedBalance: number;
  availableBalance: number;
  currency: string;
  lowBalanceThreshold: number;
  isLowBalance: boolean;
}

export interface AccountSettings {
  lowBalanceThreshold?: number;
  autoRechargeEnabled?: boolean;
  autoRechargeAmount?: number;
  autoRechargeThreshold?: number;
}

// Credit Transaction Types
export interface CreditTransaction {
  id: number;
  uid: string;
  creditAccountId: number;
  type: 'credit' | 'debit' | 'reserve' | 'release' | 'refund' | 'adjustment';
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  reservedBalanceBefore?: string | null;
  reservedBalanceAfter?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  metadata?: any;
  status: 'pending' | 'completed' | 'reversed';
  reversedBy?: number | null;
  reversedAt?: Date | null;
  createdAt: Date;
}

export interface CreateCreditTransactionData {
  creditAccountId: number;
  type: 'credit' | 'debit' | 'reserve' | 'release' | 'refund' | 'adjustment';
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  reservedBalanceBefore?: string;
  reservedBalanceAfter?: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  metadata?: any;
  status?: 'pending' | 'completed' | 'reversed';
}

export interface TransactionFilters {
  type?: string;
  referenceType?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface TransactionSummary {
  totalCredits: number;
  totalDebits: number;
  netChange: number;
  transactionCount: number;
  byType: Record<string, { count: number; amount: number }>;
}

// Credit Reservation Types
export interface CreditReservation {
  id: number;
  uid: string;
  creditAccountId: number;
  transactionId?: number | null;
  amount: string;
  purpose: string;
  referenceType?: string | null;
  referenceId?: string | null;
  status: 'active' | 'settled' | 'released' | 'expired';
  settledAmount?: string | null;
  settledAt?: Date | null;
  settleTransactionId?: number | null;
  releasedAmount?: string | null;
  releasedAt?: Date | null;
  releaseTransactionId?: number | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReservationData {
  creditAccountId: number;
  transactionId?: number;
  amount: string;
  purpose: string;
  referenceType?: string;
  referenceId?: string;
  expiresAt?: Date;
}

// Credit Package Types
export interface CreditPackage {
  id: number;
  uid: string;
  name: string;
  description?: string | null;
  credits: string;
  price: string;
  currency: string;
  bonusCredits: string;
  isPopular: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePackageData {
  name: string;
  description?: string;
  credits: number;
  price: number;
  currency?: string;
  bonusCredits?: number;
  isPopular?: boolean;
  displayOrder?: number;
}

export interface UpdatePackageData {
  name?: string;
  description?: string;
  credits?: number;
  price?: number;
  bonusCredits?: number;
  isPopular?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

// Credit Purchase Types
export interface CreditPurchase {
  id: number;
  uid: string;
  creditAccountId: number;
  packageId?: number | null;
  paymentTransactionId?: number | null;
  credits: string;
  bonusCredits: string;
  totalCredits: string;
  price: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  creditedAt?: Date | null;
  creditTransactionId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePurchaseData {
  creditAccountId: number;
  packageId?: number;
  paymentTransactionId?: number;
  credits: string;
  bonusCredits: string;
  totalCredits: string;
  price: string;
  currency: string;
}

// Service Response Types
export interface PurchaseInitiationResponse {
  purchaseUid: string;
  paymentOrder: {
    uid: string;
    orderId: string;
    amount: number;
    currency: string;
  };
}

// Error Types
export class InsufficientBalanceError extends Error {
  constructor(message: string = 'Insufficient balance') {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export class AccountSuspendedError extends Error {
  constructor(message: string = 'Account is suspended') {
    super(message);
    this.name = 'AccountSuspendedError';
  }
}

export class ReservationNotFoundError extends Error {
  constructor(message: string = 'Reservation not found') {
    super(message);
    this.name = 'ReservationNotFoundError';
  }
}

export class InvalidReservationStatusError extends Error {
  constructor(message: string = 'Invalid reservation status') {
    super(message);
    this.name = 'InvalidReservationStatusError';
  }
}

// Proxy System Types

// Proxy API Types
export interface ProxyApi {
  id: number;
  uid: string;
  slug: string;
  name: string;
  description?: string | null;
  upstreamUrl: string;
  isActive: boolean;
  defaultPricingModelId?: number | null;
  defaultHeaders?: any;
  stripHeaders?: any;
  timeoutSeconds: number;
  rateLimitPerMinute?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProxyApiData {
  slug: string;
  name: string;
  description?: string;
  upstreamUrl: string;
  defaultPricingModelId?: number;
  defaultHeaders?: Record<string, string>;
  stripHeaders?: string[];
  timeoutSeconds?: number;
  rateLimitPerMinute?: number;
}

export interface UpdateProxyApiData {
  name?: string;
  description?: string;
  upstreamUrl?: string;
  isActive?: boolean;
  defaultPricingModelId?: number;
  defaultHeaders?: Record<string, string>;
  stripHeaders?: string[];
  timeoutSeconds?: number;
  rateLimitPerMinute?: number;
}

// Proxy Route Types
export interface ProxyRoute {
  id: number;
  uid: string;
  apiId: number;
  pathPattern: string;
  method: string;
  pricingModelId?: number | null;
  rateLimitPerMinute?: number | null;
  timeoutSeconds?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProxyRouteData {
  apiId: number;
  pathPattern: string;
  method: string;
  pricingModelId?: number;
  rateLimitPerMinute?: number;
  timeoutSeconds?: number;
}

// Pricing Model Types
export type PricingModelType = 'per_request' | 'per_kb' | 'per_minute' | 'tiered';

export interface PricingModel {
  id: number;
  uid: string;
  name: string;
  type: PricingModelType;
  baseCost: string;
  costPerKbRequest: string;
  costPerKbResponse: string;
  costPerMinute: string;
  tiers?: PricingTier[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingTier {
  upToRequests?: number | null;
  costPerRequest: number;
}

export interface CreatePricingModelData {
  name: string;
  type: PricingModelType;
  baseCost?: number;
  costPerKbRequest?: number;
  costPerKbResponse?: number;
  costPerMinute?: number;
  tiers?: PricingTier[];
}

export interface UpdatePricingModelData {
  name?: string;
  type?: PricingModelType;
  baseCost?: number;
  costPerKbRequest?: number;
  costPerKbResponse?: number;
  costPerMinute?: number;
  tiers?: PricingTier[];
  isActive?: boolean;
}

// Usage Record Types
export interface UsageRecord {
  id: number;
  uid: string;
  userId: number;
  subscriptionId?: number | null;
  apiKeyId?: number | null;
  apiId: number;
  creditReservationId?: number | null;
  creditTransactionId?: number | null;
  method: string;
  path: string;
  fullUrl?: string | null;
  statusCode?: number | null;
  requestSize: number;
  responseSize: number;
  startTime: Date;
  endTime?: Date | null;
  duration?: number | null;
  estimatedCost: string;
  actualCost: string;
  pricingModelId?: number | null;
  pricingCalculation?: any;
  userAgent?: string | null;
  ipAddress?: string | null;
  errorMessage?: string | null;
  createdAt: Date;
}

export interface CreateUsageRecordData {
  userId: number;
  subscriptionId?: number;
  apiKeyId?: number;
  apiId: number;
  creditReservationId?: number;
  creditTransactionId?: number;
  method: string;
  path: string;
  fullUrl?: string;
  statusCode?: number;
  requestSize: number;
  responseSize: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  estimatedCost: string;
  actualCost: string;
  pricingModelId?: number;
  pricingCalculation?: any;
  userAgent?: string;
  ipAddress?: string;
  errorMessage?: string;
}

// Proxy Request/Response Types
export interface ProxyRequestContext {
  api: ProxyApi;
  route?: ProxyRoute;
  pricingModel: PricingModel;
  userId: number;
  apiKey?: string;
  subscriptionId?: number;
  apiKeyId?: number;
}

export interface ProxyRequestMetrics {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  requestSize: number;
  responseSize: number;
  statusCode?: number;
}

export interface CostCalculationResult {
  estimatedCost: number;
  actualCost: number;
  breakdown: {
    baseCost?: number;
    requestCost?: number;
    responseCost?: number;
    durationCost?: number;
    tierCost?: number;
  };
  pricingModel: PricingModel;
}

// Usage Analytics Types
export interface UsageAnalytics {
  totalRequests: number;
  totalCost: number;
  avgCostPerRequest: number;
  byApi: Record<string, { requests: number; cost: number }>;
  byDate: Array<{ date: string; requests: number; cost: number }>;
  topEndpoints: Array<{ path: string; requests: number; cost: number }>;
}

export interface UsageFilters {
  userId?: number;
  apiId?: number;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}
