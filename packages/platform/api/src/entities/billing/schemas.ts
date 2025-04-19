import { z } from 'zod';
import {
  BillingPeriod,
  BillingPlanVisibility,
  BillingPlanVersionStatus,
  BillingItemType,
  EnabledBillingFeatureStatus,
  SubscriptionStatus,
  InvoiceType,
  InvoiceStatus,
  InvoicePaymentStatus,
  PaymentMethodType,
  PaymentStatus,
  PaymentDestinationType,
  PaymentAttemptStatus,
  WalletTransactionType,
  WalletTransactionSubtype,
  WalletTransactionStatus,
  WalletTransactionReferenceType,
  SubscriptionPauseStatus,
  SubscriptionPauseMode,
  SubscriptionResumeMode,
  SubscriptionPauseState,
  SubscriptionLineItemInvoiceCadence,
} from './types';

export const billingPeriodSchema = z.nativeEnum(BillingPeriod);
export const billingPlanVisibilitySchema = z.nativeEnum(BillingPlanVisibility);
export const billingPlanVersionStatusSchema = z.nativeEnum(
  BillingPlanVersionStatus,
);
export const billingItemTypeSchema = z.nativeEnum(BillingItemType);
export const enabledBillingFeatureStatusSchema = z.nativeEnum(
  EnabledBillingFeatureStatus,
);
export const subscriptionStatusSchema = z.nativeEnum(SubscriptionStatus);
export const invoiceTypeSchema = z.nativeEnum(InvoiceType);
export const invoiceStatusSchema = z.nativeEnum(InvoiceStatus);
export const invoicePaymentStatusSchema = z.nativeEnum(InvoicePaymentStatus);

export const billingPlanSchema = z.object({
  id: z.string().uuid(),
  apiId: z.string().uuid(),
  name: z.string(),
  visibility: billingPlanVisibilitySchema,
  recommended: z.boolean().optional(),
  allowedPlanDeveloperIds: z.array(z.string().uuid()).optional(),
  shouldRequestApproval: z.boolean().optional(),
  requestApprovalQuestion: z.string().optional(),
  hidden: z.boolean().optional(),
  legalDocumentId: z.string().optional(),
  legalAccountId: z.string().optional(),
});

const localePriceSchema = z.object({
  price: z.number().nullable(),
  symbol: z.string().nullable(),
});

export const billingPlanVersionSchema = z.object({
  id: z.string().uuid(),
  billingPlanId: z.string().uuid(),
  name: z.string(),
  period: billingPeriodSchema,
  price: z.number().min(0),
  status: billingPlanVersionStatusSchema,
  current: z.boolean(),
  localePrice: localePriceSchema.optional(),
});

export const billingLimitSchema = z.object({
  id: z.string().uuid(),
  billingPlanVersionId: z.string().uuid(),
  billingItemId: z.string().uuid(),
  period: billingPeriodSchema,
  amount: z.number().min(0),
  unlimited: z.boolean().optional(),
  overagePrice: z.number().min(0).optional(),
  overageLocalePrice: localePriceSchema.optional(),
  tiersDefinitions: z.any().optional(),
  limitType: z.string().optional(),
});

export const billingItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: billingItemTypeSchema,
  allEndpoints: z.boolean().optional(),
});

export const billingFeatureSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['BOOLEAN', 'METERED', 'CONFIG']),
});

export const enabledBillingFeatureSchema = z.object({
  id: z.string().uuid(),
  billingFeatureId: z.string().uuid(),
  billingPlanVersionId: z.string().uuid(),
  status: enabledBillingFeatureStatusSchema,
  note: z.string().optional(),
  isEnabled: z.boolean().optional(), // For BOOLEAN
  usageLimit: z.number().nullable().optional(), // For METERED
  usageResetPeriod: billingPeriodSchema.optional(), // For METERED
  isSoftLimit: z.boolean().optional(), // For METERED
  staticValue: z.string().optional(), // For CONFIG
});

export const subscriptionPauseStatusSchema = z.nativeEnum(
  SubscriptionPauseStatus,
);
export const subscriptionPauseModeSchema = z.nativeEnum(SubscriptionPauseMode);
export const subscriptionResumeModeSchema = z.nativeEnum(
  SubscriptionResumeMode,
);
export const subscriptionPauseStateSchema = z.nativeEnum(
  SubscriptionPauseState,
);
export const subscriptionLineItemInvoiceCadenceSchema = z.nativeEnum(
  SubscriptionLineItemInvoiceCadence,
);

export const subscriptionPauseSchema = z
  .object({
    id: z.string().uuid(),
    subscriptionId: z.string().uuid(),
    status: subscriptionPauseStatusSchema,
    pauseMode: subscriptionPauseModeSchema,
    resumeMode: subscriptionResumeModeSchema,
    pauseStart: z.date(),
    pauseEnd: z.date().optional(),
    pauseDays: z.number().int().positive().optional(),
    resumedAt: z.date().optional(),
    originalPeriodStart: z.date(),
    originalPeriodEnd: z.date(),
    reason: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .refine((data) => !(data.pauseEnd && data.pauseDays), {
    message: 'Cannot specify both pauseEnd and pauseDays',
    path: ['pauseEnd', 'pauseDays'],
  })
  .refine((data) => !data.pauseEnd || data.pauseEnd > data.pauseStart, {
    message: 'pauseEnd must be after pauseStart',
    path: ['pauseEnd'],
  });

export const subscriptionSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  billingPlanVersionId: z.string().uuid(),
  status: subscriptionStatusSchema,
  pauseState: subscriptionPauseStateSchema,
  activePauseId: z.string().uuid().optional(),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  billingSequence: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  cancelledAt: z.date().optional(),
  cancellationType: z.enum(['IMMEDIATE', 'END_OF_PERIOD']).optional(),
});

export const subscriptionLineItemSchema = z.object({
  id: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  customerId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  planDisplayName: z.string().optional(),
  priceId: z.string().uuid(),
  priceType: z.string().optional(),
  meterId: z.string().uuid().optional(),
  meterDisplayName: z.string().optional(),
  displayName: z.string().optional(),
  quantity: z.number().min(0),
  currency: z.string().length(3),
  billingPeriod: billingPeriodSchema,
  invoiceCadence: subscriptionLineItemInvoiceCadenceSchema,
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const invoiceLineItemSchema = z
  .object({
    id: z.string().uuid(),
    invoiceId: z.string().uuid(),
    customerId: z.string().uuid(),
    subscriptionId: z.string().uuid().optional(),
    subscriptionLineItemId: z.string().uuid().optional(),
    priceId: z.string().uuid().optional(),
    meterId: z.string().uuid().optional(),
    amount: z.number().min(0),
    quantity: z.number().min(0),
    currency: z.string().length(3),
    periodStart: z.date(),
    periodEnd: z.date(),
    description: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .refine(
    (data) =>
      !data.periodEnd ||
      !data.periodStart ||
      data.periodEnd >= data.periodStart,
    {
      message: 'periodEnd must be after periodStart',
      path: ['periodEnd'], // Field to associate the error with
    },
  );

export const invoiceSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    customerId: z.string().uuid(),
    subscriptionId: z.string().uuid().optional(),
    invoiceType: invoiceTypeSchema,
    invoiceStatus: invoiceStatusSchema,
    paymentStatus: invoicePaymentStatusSchema,
    currency: z.string().length(3),
    amountDue: z.number().min(0),
    amountPaid: z.number().min(0),
    amountRemaining: z.number().min(0),
    description: z.string().optional(),
    dueDate: z.date().optional(),
    paidAt: z.date().optional(),
    voidedAt: z.date().optional(),
    finalizedAt: z.date().optional(),
    invoicePdfUrl: z.string().url().optional(),
    billingReason: z.string().optional(),
    idempotencyKey: z.string().optional(),
    periodStart: z.date().optional(),
    periodEnd: z.date().optional(),
    metadata: z.record(z.any()).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .refine(
    (data) =>
      !data.periodEnd ||
      !data.periodStart ||
      data.periodEnd >= data.periodStart,
    {
      message: 'periodEnd must be after periodStart',
      path: ['periodEnd'],
    },
  );

export const paymentMethodTypeSchema = z.nativeEnum(PaymentMethodType);
export const paymentStatusSchema = z.nativeEnum(PaymentStatus);
export const paymentDestinationTypeSchema = z.nativeEnum(
  PaymentDestinationType,
);
export const paymentAttemptStatusSchema = z.nativeEnum(PaymentAttemptStatus);
export const walletTransactionTypeSchema = z.nativeEnum(WalletTransactionType);
export const walletTransactionSubtypeSchema = z.nativeEnum(
  WalletTransactionSubtype,
);
export const walletTransactionStatusSchema = z.nativeEnum(
  WalletTransactionStatus,
);
export const walletTransactionReferenceTypeSchema = z.nativeEnum(
  WalletTransactionReferenceType,
);

export const paymentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  idempotencyKey: z.string(),
  destinationType: paymentDestinationTypeSchema,
  destinationId: z.string(), // Could be invoice ID, wallet ID, etc.
  paymentMethodType: paymentMethodTypeSchema,
  paymentMethodId: z.string().optional(),
  paymentGateway: z.string().optional(),
  gatewayPaymentId: z.string().optional(),
  amount: z.number().positive(), // Payments should likely be positive
  currency: z.string().length(3),
  paymentStatus: paymentStatusSchema,
  trackAttempts: z.boolean(),
  metadata: z.record(z.any()).optional(),
  succeededAt: z.date().optional(),
  failedAt: z.date().optional(),
  refundedAt: z.date().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const paymentAttemptSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  paymentId: z.string().uuid(),
  attemptNumber: z.number().int().positive(),
  paymentStatus: paymentAttemptStatusSchema,
  gatewayAttemptId: z.string().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const walletSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  balance: z.number(), // Can be negative if allowed
  creditBalance: z.number().min(0), // Credits usually shouldn't be negative
  currency: z.string().length(3),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const walletTransactionSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  type: walletTransactionTypeSchema,
  subtype: walletTransactionSubtypeSchema,
  status: walletTransactionStatusSchema,
  amount: z.number(), // Can be positive (credit) or negative (debit)
  creditsAvailable: z.number().min(0).optional(), // Only relevant for CREDIT types
  expiryDate: z.date().optional(), // Only relevant for CREDIT types
  referenceType: walletTransactionReferenceTypeSchema.optional(),
  referenceId: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
