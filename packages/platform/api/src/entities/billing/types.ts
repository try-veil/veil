export enum BillingPeriod {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  ONE_TIME = 'ONE_TIME',
  PERUSE = 'PERUSE',
}

export enum BillingPlanVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum BillingPlanVersionStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum BillingItemType {
  RECURRING = 'RECURRING',
  USAGE = 'USAGE',
  ONE_TIME = 'ONE_TIME',
}

export enum BillingPricing {
  PERUSE = 'PERUSE',
  PAID = 'PAID',
  FREE = 'FREE',
}

export enum EnabledBillingFeatureStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface LocalePrice {
  price: number | null;
  symbol: string | null;
}

export interface RateLimit {
  enabled: boolean;
  unit: number;
  unitName: string;
  amount: number;
}

export interface BillingPlan {
  id: string;
  apiId: string;
  name: string;
  visibility: BillingPlanVisibility;
  recommended?: boolean;
  allowedPlanDeveloperIds?: string[];
  shouldRequestApproval?: boolean;
  requestApprovalQuestion?: string;
  hidden?: boolean;
  legalDocumentId?: string;
  legalAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingPlanVersion {
  id: string;
  billingPlanId: string;
  name: string;
  period: BillingPeriod;
  price: number;
  status: BillingPlanVersionStatus;
  current: boolean;
  localePrice?: {
    price: number | null;
    symbol: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingLimit {
  id: string;
  billingPlanVersionId: string;
  billingItemId: string;
  period: BillingPeriod;
  amount: number;
  unlimited?: boolean;
  overagePrice?: number;
  overageLocalePrice?: {
    price: number | null;
    symbol: string | null;
  };
  tiersDefinitions?: any;
  limitType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingItem {
  id: string;
  name: string;
  title?: string;
  description?: string;
  type: BillingItemType;
  allEndpoints?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingFeature {
  id: string;
  name: string;
  description?: string;
  type: 'BOOLEAN' | 'METERED' | 'CONFIG';
  createdAt: Date;
  updatedAt: Date;
}

export interface EnabledBillingFeature {
  id: string;
  billingFeatureId: string;
  billingPlanVersionId: string;
  status: EnabledBillingFeatureStatus;
  note?: string;
  isEnabled?: boolean;
  usageLimit?: number | null;
  usageResetPeriod?: BillingPeriod;
  isSoftLimit?: boolean;
  staticValue?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export enum SubscriptionPauseStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum SubscriptionPauseMode {
  IMMEDIATE = 'IMMEDIATE',
  PERIOD_END = 'PERIOD_END',
  SCHEDULED = 'SCHEDULED',
}

export enum SubscriptionResumeMode {
  IMMEDIATE = 'IMMEDIATE',
  SCHEDULED = 'SCHEDULED',
  AUTO = 'AUTO', // Auto-resume based on pause_end or pause_days
}

export interface SubscriptionPause {
  id: string;
  subscriptionId: string;
  status: SubscriptionPauseStatus;
  pauseMode: SubscriptionPauseMode;
  resumeMode: SubscriptionResumeMode;
  pauseStart: Date;
  pauseEnd?: Date;
  pauseDays?: number;
  resumedAt?: Date;
  originalPeriodStart: Date;
  originalPeriodEnd: Date;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubscriptionPauseState {
  NONE = 'NONE',
  ACTIVE = 'ACTIVE',
  SCHEDULED = 'SCHEDULED',
}

export interface Subscription {
  id: string;
  customerId: string;
  billingPlanVersionId: string;
  status: SubscriptionStatus;
  pauseState: SubscriptionPauseState;
  activePauseId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  billingSequence: number;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
  cancellationType?: 'IMMEDIATE' | 'END_OF_PERIOD';
}

export enum InvoiceType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  ONE_OFF = 'ONE_OFF',
  CREDIT = 'CREDIT',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  VOIDED = 'VOIDED',
}

export enum InvoicePaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export enum SubscriptionLineItemInvoiceCadence {
  ADVANCE = 'ADVANCE',
  ARREAR = 'ARREAR',
}

export interface SubscriptionLineItem {
  id: string;
  subscriptionId: string;
  customerId: string;
  planId?: string;
  planDisplayName?: string;
  priceId: string;
  priceType?: string;
  meterId?: string;
  meterDisplayName?: string;
  displayName?: string;
  quantity: number;
  currency: string;
  billingPeriod: BillingPeriod;
  invoiceCadence: SubscriptionLineItemInvoiceCadence;
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  customerId: string;
  subscriptionId?: string;
  subscriptionLineItemId?: string; // Link back to the specific subscription line item
  priceId?: string;
  meterId?: string;
  amount: number;
  quantity: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  description?: string; // Description for this specific line item
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  subscriptionId?: string;
  invoiceType: InvoiceType;
  invoiceStatus: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  currency: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  description?: string;
  dueDate?: Date;
  paidAt?: Date;
  voidedAt?: Date;
  finalizedAt?: Date;
  invoicePdfUrl?: string;
  billingReason?: string;
  idempotencyKey?: string;
  periodStart?: Date;
  periodEnd?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentMethodType {
  OFFLINE = 'OFFLINE',
  CREDITS = 'CREDITS',
  CARD = 'CARD',
  ACH = 'ACH',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentDestinationType {
  INVOICE = 'INVOICE',
  // Add other types like WALLET_TOPUP if needed
}

export interface Payment {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  destinationType: PaymentDestinationType;
  destinationId: string;
  paymentMethodType: PaymentMethodType;
  paymentMethodId?: string; // e.g., Card ID, Bank Account ID, Wallet ID
  paymentGateway?: string; // e.g., 'stripe', 'paypal'
  gatewayPaymentId?: string;
  amount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  trackAttempts: boolean;
  metadata?: Record<string, any>;
  succeededAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentAttemptStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export interface PaymentAttempt {
  id: string;
  tenantId: string;
  paymentId: string;
  attemptNumber: number;
  paymentStatus: PaymentAttemptStatus;
  gatewayAttemptId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  id: string;
  tenantId: string;
  customerId: string;
  balance: number; // Overall balance (could include non-credit funds in future)
  creditBalance: number; // Specific balance from credits
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum WalletTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum WalletTransactionSubtype {
  PAID = 'PAID', // Purchased credits
  FREE = 'FREE', // Free/Loyalty credits
  EXPIRY = 'EXPIRY', // Debit due to expired credits
  PAYMENT = 'PAYMENT', // Debit used to pay for something (e.g., invoice)
  REFUND = 'REFUND', // Credit due to refund
  MANUAL = 'MANUAL', // Manual admin adjustment
}

export enum WalletTransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum WalletTransactionReferenceType {
  INVOICE = 'INVOICE',
  PAYMENT = 'PAYMENT',
  EXTERNAL = 'EXTERNAL',
  // Add others as needed
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  tenantId: string;
  customerId: string;
  type: WalletTransactionType; // CREDIT or DEBIT
  subtype: WalletTransactionSubtype;
  status: WalletTransactionStatus;
  amount: number; // Amount of this specific transaction
  creditsAvailable?: number; // Remaining balance for CREDIT transactions
  expiryDate?: Date; // Expiry for CREDIT transactions
  referenceType?: WalletTransactionReferenceType;
  referenceId?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
