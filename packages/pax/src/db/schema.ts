import { pgTable, serial, varchar, text, timestamp, boolean, integer, uuid, decimal, index, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Payment Gateway Transactions table
export const paymentTransactions = pgTable('payment_transactions', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  userId: integer('user_id').notNull(), // Reference to user in platform-api
  provider: varchar('provider', { length: 50 }).notNull(), // 'razorpay', 'stripe', 'paypal'
  providerTransactionId: varchar('provider_transaction_id', { length: 255 }).unique(),
  providerOrderId: varchar('provider_order_id', { length: 255 }), // For Razorpay orders

  // Amount details
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),

  // Status
  status: varchar('status', { length: 20 }).notNull(), // 'pending', 'processing', 'completed', 'failed', 'refunded'

  // Payment method
  paymentMethod: varchar('payment_method', { length: 50 }), // 'card', 'upi', 'netbanking', 'wallet'

  // Metadata
  metadata: jsonb('metadata'), // Store additional provider-specific data

  // Webhook tracking
  webhookReceived: boolean('webhook_received').default(false).notNull(),
  webhookProcessedAt: timestamp('webhook_processed_at'),

  // Error tracking
  errorCode: varchar('error_code', { length: 100 }),
  errorDescription: text('error_description'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  userIdx: index('payment_tx_user_idx').on(table.userId),
  providerIdx: index('payment_tx_provider_idx').on(table.provider),
  statusIdx: index('payment_tx_status_idx').on(table.status),
  providerTxIdx: index('payment_tx_provider_tx_idx').on(table.providerTransactionId),
  providerOrderIdx: index('payment_tx_provider_order_idx').on(table.providerOrderId),
  createdAtIdx: index('payment_tx_created_at_idx').on(table.createdAt),
}));

// Refunds table
export const refunds = pgTable('refunds', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  paymentTransactionId: integer('payment_transaction_id').references(() => paymentTransactions.id).notNull(),
  providerRefundId: varchar('provider_refund_id', { length: 255 }).unique(),

  // Amount
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),

  // Status
  status: varchar('status', { length: 20 }).notNull(), // 'pending', 'completed', 'failed'

  // Reason
  reason: text('reason'),

  // Metadata
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  paymentTxIdx: index('refunds_payment_tx_idx').on(table.paymentTransactionId),
  providerRefundIdx: index('refunds_provider_refund_idx').on(table.providerRefundId),
  statusIdx: index('refunds_status_idx').on(table.status),
}));

// Webhook Events table
export const webhookEvents = pgTable('webhook_events', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'razorpay', 'stripe', 'paypal'
  eventId: varchar('event_id', { length: 255 }).unique().notNull(), // Provider's event ID
  eventType: varchar('event_type', { length: 100 }).notNull(), // e.g., 'payment.captured', 'refund.processed'

  // Payload
  payload: jsonb('payload').notNull(), // Full webhook payload
  rawPayload: text('raw_payload'), // Raw string for signature verification

  // Processing
  processed: boolean('processed').default(false).notNull(),
  processedAt: timestamp('processed_at'),
  processingError: text('processing_error'),
  retryCount: integer('retry_count').default(0).notNull(),

  // Signature verification
  signatureValid: boolean('signature_valid').default(false).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  providerIdx: index('webhook_events_provider_idx').on(table.provider),
  eventIdIdx: index('webhook_events_event_id_idx').on(table.eventId),
  processedIdx: index('webhook_events_processed_idx').on(table.processed),
  createdAtIdx: index('webhook_events_created_at_idx').on(table.createdAt),
}));

// Relations
export const paymentTransactionsRelations = relations(paymentTransactions, ({ many }) => ({
  refunds: many(refunds),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  paymentTransaction: one(paymentTransactions, {
    fields: [refunds.paymentTransactionId],
    references: [paymentTransactions.id],
  }),
}));

// Credit Accounts table
export const creditAccounts = pgTable('credit_accounts', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  userId: integer('user_id').notNull(), // Reference to user in platform-api

  // Balance tracking
  balance: decimal('balance', { precision: 12, scale: 4 }).default('0.0000').notNull(),
  reservedBalance: decimal('reserved_balance', { precision: 12, scale: 4 }).default('0.0000').notNull(),
  totalCredits: decimal('total_credits', { precision: 12, scale: 4 }).default('0.0000').notNull(),
  totalSpent: decimal('total_spent', { precision: 12, scale: 4 }).default('0.0000').notNull(),

  // Currency
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),

  // Settings
  lowBalanceThreshold: decimal('low_balance_threshold', { precision: 12, scale: 4 }).default('10.0000'),
  autoRechargeEnabled: boolean('auto_recharge_enabled').default(false).notNull(),
  autoRechargeAmount: decimal('auto_recharge_amount', { precision: 12, scale: 4 }).default('100.0000'),
  autoRechargeThreshold: decimal('auto_recharge_threshold', { precision: 12, scale: 4 }).default('5.0000'),

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  isSuspended: boolean('is_suspended').default(false).notNull(),
  suspensionReason: text('suspension_reason'),

  // Timestamps
  lastTransactionAt: timestamp('last_transaction_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('credit_accounts_user_idx').on(table.userId),
  balanceIdx: index('credit_accounts_balance_idx').on(table.balance),
  activeIdx: index('credit_accounts_active_idx').on(table.isActive),
}));

// Credit Transactions table
export const creditTransactions = pgTable('credit_transactions', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  creditAccountId: integer('credit_account_id').references(() => creditAccounts.id).notNull(),

  // Transaction details
  type: varchar('type', { length: 20 }).notNull(), // 'credit', 'debit', 'reserve', 'release', 'refund', 'adjustment'
  amount: decimal('amount', { precision: 12, scale: 4 }).notNull(),

  // Balance snapshots
  balanceBefore: decimal('balance_before', { precision: 12, scale: 4 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 12, scale: 4 }).notNull(),
  reservedBalanceBefore: decimal('reserved_balance_before', { precision: 12, scale: 4 }),
  reservedBalanceAfter: decimal('reserved_balance_after', { precision: 12, scale: 4 }),

  // Reference tracking
  referenceType: varchar('reference_type', { length: 50 }), // 'payment', 'proxy_request', 'subscription', 'refund', 'admin_adjustment'
  referenceId: varchar('reference_id', { length: 255 }), // UID of the referenced entity

  // Description
  description: text('description'),

  // Metadata
  metadata: jsonb('metadata'),

  // Status (for reversible transactions)
  status: varchar('status', { length: 20 }).default('completed').notNull(), // 'pending', 'completed', 'reversed'
  reversedBy: integer('reversed_by').references(() => creditTransactions.id),
  reversedAt: timestamp('reversed_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  accountIdx: index('credit_tx_account_idx').on(table.creditAccountId),
  typeIdx: index('credit_tx_type_idx').on(table.type),
  referenceIdx: index('credit_tx_reference_idx').on(table.referenceType, table.referenceId),
  createdIdx: index('credit_tx_created_idx').on(table.createdAt),
  statusIdx: index('credit_tx_status_idx').on(table.status),
}));

// Credit Reservations table
export const creditReservations = pgTable('credit_reservations', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  creditAccountId: integer('credit_account_id').references(() => creditAccounts.id).notNull(),
  transactionId: integer('transaction_id').references(() => creditTransactions.id),

  // Reservation details
  amount: decimal('amount', { precision: 12, scale: 4 }).notNull(),
  purpose: varchar('purpose', { length: 50 }).notNull(), // 'proxy_request', 'subscription_hold'

  // Reference
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: varchar('reference_id', { length: 255 }),

  // Status
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active', 'settled', 'released', 'expired'

  // Settlement
  settledAmount: decimal('settled_amount', { precision: 12, scale: 4 }),
  settledAt: timestamp('settled_at'),
  settleTransactionId: integer('settle_transaction_id').references(() => creditTransactions.id),

  // Release
  releasedAmount: decimal('released_amount', { precision: 12, scale: 4 }),
  releasedAt: timestamp('released_at'),
  releaseTransactionId: integer('release_transaction_id').references(() => creditTransactions.id),

  // Expiration
  expiresAt: timestamp('expires_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  accountIdx: index('credit_res_account_idx').on(table.creditAccountId),
  statusIdx: index('credit_res_status_idx').on(table.status),
  expiresIdx: index('credit_res_expires_idx').on(table.expiresAt),
  referenceIdx: index('credit_res_reference_idx').on(table.referenceType, table.referenceId),
}));

// Credit Packages table
export const creditPackages = pgTable('credit_packages', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),

  // Package details
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  credits: decimal('credits', { precision: 12, scale: 4 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),

  // Bonus
  bonusCredits: decimal('bonus_credits', { precision: 12, scale: 4 }).default('0.0000'),

  // Display
  isPopular: boolean('is_popular').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),

  // Status
  isActive: boolean('is_active').default(true).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  activeIdx: index('credit_packages_active_idx').on(table.isActive),
  orderIdx: index('credit_packages_order_idx').on(table.displayOrder),
}));

// Credit Purchase History table
export const creditPurchases = pgTable('credit_purchases', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  creditAccountId: integer('credit_account_id').references(() => creditAccounts.id).notNull(),
  packageId: integer('package_id').references(() => creditPackages.id),
  paymentTransactionId: integer('payment_transaction_id').references(() => paymentTransactions.id),

  // Purchase details
  credits: decimal('credits', { precision: 12, scale: 4 }).notNull(),
  bonusCredits: decimal('bonus_credits', { precision: 12, scale: 4 }).default('0.0000'),
  totalCredits: decimal('total_credits', { precision: 12, scale: 4 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),

  // Status
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'completed', 'failed', 'refunded'

  // Processing
  creditedAt: timestamp('credited_at'),
  creditTransactionId: integer('credit_transaction_id').references(() => creditTransactions.id),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  accountIdx: index('credit_purchases_account_idx').on(table.creditAccountId),
  paymentIdx: index('credit_purchases_payment_idx').on(table.paymentTransactionId),
  statusIdx: index('credit_purchases_status_idx').on(table.status),
}));

// Relations for credit tables
export const creditAccountsRelations = relations(creditAccounts, ({ many }) => ({
  transactions: many(creditTransactions),
  reservations: many(creditReservations),
  purchases: many(creditPurchases),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  creditAccount: one(creditAccounts, {
    fields: [creditTransactions.creditAccountId],
    references: [creditAccounts.id],
  }),
  reversedByTransaction: one(creditTransactions, {
    fields: [creditTransactions.reversedBy],
    references: [creditTransactions.id],
  }),
}));

export const creditReservationsRelations = relations(creditReservations, ({ one }) => ({
  creditAccount: one(creditAccounts, {
    fields: [creditReservations.creditAccountId],
    references: [creditAccounts.id],
  }),
  transaction: one(creditTransactions, {
    fields: [creditReservations.transactionId],
    references: [creditTransactions.id],
  }),
  settleTransaction: one(creditTransactions, {
    fields: [creditReservations.settleTransactionId],
    references: [creditTransactions.id],
  }),
  releaseTransaction: one(creditTransactions, {
    fields: [creditReservations.releaseTransactionId],
    references: [creditTransactions.id],
  }),
}));

export const creditPackagesRelations = relations(creditPackages, ({ many }) => ({
  purchases: many(creditPurchases),
}));

export const creditPurchasesRelations = relations(creditPurchases, ({ one }) => ({
  creditAccount: one(creditAccounts, {
    fields: [creditPurchases.creditAccountId],
    references: [creditAccounts.id],
  }),
  package: one(creditPackages, {
    fields: [creditPurchases.packageId],
    references: [creditPackages.id],
  }),
  paymentTransaction: one(paymentTransactions, {
    fields: [creditPurchases.paymentTransactionId],
    references: [paymentTransactions.id],
  }),
  creditTransaction: one(creditTransactions, {
    fields: [creditPurchases.creditTransactionId],
    references: [creditTransactions.id],
  }),
}));

// Proxy APIs table
export const proxyApis = pgTable('proxy_apis', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  upstreamUrl: varchar('upstream_url', { length: 500 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  defaultPricingModelId: integer('default_pricing_model_id'),

  // Headers
  defaultHeaders: jsonb('default_headers'), // Headers to add to all requests
  stripHeaders: jsonb('strip_headers'), // Headers to remove before proxying

  // Timeouts
  timeoutSeconds: integer('timeout_seconds').default(30).notNull(),

  // Rate limiting
  rateLimitPerMinute: integer('rate_limit_per_minute'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('proxy_apis_slug_idx').on(table.slug),
  activeIdx: index('proxy_apis_active_idx').on(table.isActive),
}));

// Proxy Routes table
export const proxyRoutes = pgTable('proxy_routes', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  apiId: integer('api_id').references(() => proxyApis.id).notNull(),
  pathPattern: varchar('path_pattern', { length: 500 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(), // GET, POST, *, etc.

  // Override pricing for this route
  pricingModelId: integer('pricing_model_id'),

  // Route-specific settings
  rateLimitPerMinute: integer('rate_limit_per_minute'),
  timeoutSeconds: integer('timeout_seconds'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  apiIdx: index('proxy_routes_api_idx').on(table.apiId),
}));

// Pricing Models table
export const pricingModels = pgTable('pricing_models', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'per_request', 'per_kb', 'per_minute', 'tiered'

  // Per request pricing
  baseCost: decimal('base_cost', { precision: 10, scale: 6 }).default('0.000000'),

  // Per KB pricing
  costPerKbRequest: decimal('cost_per_kb_request', { precision: 10, scale: 6 }).default('0.000000'),
  costPerKbResponse: decimal('cost_per_kb_response', { precision: 10, scale: 6 }).default('0.000000'),

  // Per minute pricing
  costPerMinute: decimal('cost_per_minute', { precision: 10, scale: 6 }).default('0.000000'),

  // Tiered pricing
  tiers: jsonb('tiers'), // [{ upToRequests: 1000, costPerRequest: 0.01 }, ...]

  // Status
  isActive: boolean('is_active').default(true).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  activeIdx: index('pricing_models_active_idx').on(table.isActive),
}));

// Usage Records table
export const usageRecords = pgTable('usage_records', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),

  // References
  userId: integer('user_id').notNull(),
  subscriptionId: integer('subscription_id'),
  apiKeyId: integer('api_key_id'),
  apiId: integer('api_id').references(() => proxyApis.id).notNull(),
  creditReservationId: integer('credit_reservation_id').references(() => creditReservations.id),
  creditTransactionId: integer('credit_transaction_id').references(() => creditTransactions.id),

  // Request details
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 1000 }).notNull(),
  fullUrl: text('full_url'),
  statusCode: integer('status_code'),

  // Size metrics (bytes)
  requestSize: integer('request_size').default(0).notNull(),
  responseSize: integer('response_size').default(0).notNull(),

  // Timing
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  duration: integer('duration'), // milliseconds

  // Cost
  estimatedCost: decimal('estimated_cost', { precision: 12, scale: 6 }).default('0.000000').notNull(),
  actualCost: decimal('actual_cost', { precision: 12, scale: 6 }).default('0.000000').notNull(),
  pricingModelId: integer('pricing_model_id'),
  pricingCalculation: jsonb('pricing_calculation'), // Store how cost was calculated

  // Metadata
  userAgent: varchar('user_agent', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  errorMessage: text('error_message'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index('usage_records_user_created_idx').on(table.userId, table.createdAt),
  apiCreatedIdx: index('usage_records_api_created_idx').on(table.apiId, table.createdAt),
  subscriptionIdx: index('usage_records_subscription_idx').on(table.subscriptionId),
  createdIdx: index('usage_records_created_idx').on(table.createdAt),
}));

// Relations for proxy tables
export const proxyApisRelations = relations(proxyApis, ({ many, one }) => ({
  routes: many(proxyRoutes),
  usageRecords: many(usageRecords),
  defaultPricingModel: one(pricingModels, {
    fields: [proxyApis.defaultPricingModelId],
    references: [pricingModels.id],
  }),
}));

export const proxyRoutesRelations = relations(proxyRoutes, ({ one }) => ({
  api: one(proxyApis, {
    fields: [proxyRoutes.apiId],
    references: [proxyApis.id],
  }),
  pricingModel: one(pricingModels, {
    fields: [proxyRoutes.pricingModelId],
    references: [pricingModels.id],
  }),
}));

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  api: one(proxyApis, {
    fields: [usageRecords.apiId],
    references: [proxyApis.id],
  }),
  creditReservation: one(creditReservations, {
    fields: [usageRecords.creditReservationId],
    references: [creditReservations.id],
  }),
  creditTransaction: one(creditTransactions, {
    fields: [usageRecords.creditTransactionId],
    references: [creditTransactions.id],
  }),
  pricingModel: one(pricingModels, {
    fields: [usageRecords.pricingModelId],
    references: [pricingModels.id],
  }),
}));
