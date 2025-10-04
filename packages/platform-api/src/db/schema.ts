import { pgTable, serial, varchar, text, timestamp, boolean, integer, uuid, decimal, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).default('user').notNull(), // 'user', 'seller', 'admin'
  fusionAuthId: varchar('fusion_auth_id', { length: 255 }).unique(),
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  uidIdx: index('users_uid_idx').on(table.uid),
  fusionAuthIdIdx: index('users_fusion_auth_id_idx').on(table.fusionAuthId),
}));

// API Categories table
export const apiCategories = pgTable('api_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// APIs table
export const apis = pgTable('apis', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  sellerId: integer('seller_id').references(() => users.id).notNull(),
  categoryId: integer('category_id').references(() => apiCategories.id),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description').notNull(),
  version: varchar('version', { length: 50 }).default('1.0.0').notNull(),
  endpoint: varchar('endpoint', { length: 500 }).notNull(),
  baseUrl: varchar('base_url', { length: 500 }).notNull(),
  documentation: text('documentation'),
  price: decimal('price', { precision: 10, scale: 2 }).default('0.00').notNull(),
  pricingModel: varchar('pricing_model', { length: 50 }).default('per_request').notNull(), // 'per_request', 'monthly', 'yearly'
  requestLimit: integer('request_limit').default(1000).notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0.00'),
  totalRatings: integer('total_ratings').default(0).notNull(),
  totalSubscriptions: integer('total_subscriptions').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sellerIdx: index('apis_seller_idx').on(table.sellerId),
  categoryIdx: index('apis_category_idx').on(table.categoryId),
  activeIdx: index('apis_active_idx').on(table.isActive),
  publicIdx: index('apis_public_idx').on(table.isPublic),
}));

// API Subscriptions table
export const apiSubscriptions = pgTable('api_subscriptions', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  apiId: integer('api_id').references(() => apis.id).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active', 'suspended', 'cancelled'
  startDate: timestamp('start_date').defaultNow().notNull(),
  endDate: timestamp('end_date'),
  requestsUsed: integer('requests_used').default(0).notNull(),
  requestsLimit: integer('requests_limit').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('subscriptions_user_idx').on(table.userId),
  apiIdx: index('subscriptions_api_idx').on(table.apiId),
  statusIdx: index('subscriptions_status_idx').on(table.status),
}));

// API Keys table
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  subscriptionId: integer('subscription_id').references(() => apiSubscriptions.id).notNull(),
  keyValue: varchar('key_value', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastUsed: timestamp('last_used'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  subscriptionIdx: index('api_keys_subscription_idx').on(table.subscriptionId),
  keyValueIdx: index('api_keys_value_idx').on(table.keyValue),
  activeIdx: index('api_keys_active_idx').on(table.isActive),
}));

// API Ratings table
export const apiRatings = pgTable('api_ratings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  apiId: integer('api_id').references(() => apis.id).notNull(),
  rating: integer('rating').notNull(), // 1-5 stars
  review: text('review'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userApiIdx: index('ratings_user_api_idx').on(table.userId, table.apiId),
}));

// API Usage Analytics table
export const apiUsageAnalytics = pgTable('api_usage_analytics', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').references(() => apiSubscriptions.id).notNull(),
  date: timestamp('date').defaultNow().notNull(),
  requestCount: integer('request_count').default(0).notNull(),
  successfulRequests: integer('successful_requests').default(0).notNull(),
  failedRequests: integer('failed_requests').default(0).notNull(),
  avgResponseTime: decimal('avg_response_time', { precision: 8, scale: 2 }),
  totalDataTransferred: integer('total_data_transferred').default(0).notNull(), // in bytes
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  subscriptionIdx: index('analytics_subscription_idx').on(table.subscriptionId),
  dateIdx: index('analytics_date_idx').on(table.date),
}));

// Payment Records table
export const paymentRecords = pgTable('payment_records', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  subscriptionId: integer('subscription_id').references(() => apiSubscriptions.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'pending', 'completed', 'failed', 'refunded'
  paymentProvider: varchar('payment_provider', { length: 50 }).notNull(), // 'stripe', 'paypal'
  paymentProviderTransactionId: varchar('payment_provider_transaction_id', { length: 255 }),
  paymentMethod: varchar('payment_method', { length: 50 }), // 'card', 'bank_transfer', 'paypal'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  subscriptionIdx: index('payments_subscription_idx').on(table.subscriptionId),
  statusIdx: index('payments_status_idx').on(table.status),
  createdAtIdx: index('payments_created_at_idx').on(table.createdAt),
}));

// API Required Headers table (for storing dynamic headers per API)
export const apiRequiredHeaders = pgTable('api_required_headers', {
  id: serial('id').primaryKey(),
  apiId: integer('api_id').references(() => apis.id).notNull(),
  headerName: varchar('header_name', { length: 100 }).notNull(),
  headerValue: varchar('header_value', { length: 255 }), // Optional default value
  isStatic: boolean('is_static').default(false).notNull(), // true = fixed value, false = dynamic
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  apiIdx: index('api_headers_api_idx').on(table.apiId),
}));

// API Allowed Methods table (for storing HTTP methods per API)
export const apiAllowedMethods = pgTable('api_allowed_methods', {
  id: serial('id').primaryKey(),
  apiId: integer('api_id').references(() => apis.id).notNull(),
  method: varchar('method', { length: 10 }).notNull(), // 'GET', 'POST', 'PUT', 'DELETE', etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  apiIdx: index('api_methods_api_idx').on(table.apiId),
  methodIdx: index('api_methods_method_idx').on(table.method),
}));

// Usage Records table (for tracking API usage and analytics)
export const usageRecords = pgTable('usage_records', {
  id: serial('id').primaryKey(),
  apiKeyId: integer('api_key_id').references(() => apiKeys.id).notNull(),
  apiId: integer('api_id').references(() => apis.id).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  endpoint: varchar('endpoint', { length: 500 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  statusCode: integer('status_code').notNull(),
  responseTime: integer('response_time').notNull(), // in milliseconds
  requestSize: integer('request_size').default(0).notNull(), // in bytes
  responseSize: integer('response_size').default(0).notNull(), // in bytes
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 compatible
}, (table) => ({
  apiKeyIdx: index('usage_records_api_key_idx').on(table.apiKeyId),
  apiIdx: index('usage_records_api_idx').on(table.apiId),
  timestampIdx: index('usage_records_timestamp_idx').on(table.timestamp),
  statusIdx: index('usage_records_status_idx').on(table.statusCode),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  apis: many(apis),
  subscriptions: many(apiSubscriptions),
  ratings: many(apiRatings),
}));

export const apiCategoriesRelations = relations(apiCategories, ({ many }) => ({
  apis: many(apis),
}));

export const apisRelations = relations(apis, ({ one, many }) => ({
  seller: one(users, {
    fields: [apis.sellerId],
    references: [users.id],
  }),
  category: one(apiCategories, {
    fields: [apis.categoryId],
    references: [apiCategories.id],
  }),
  subscriptions: many(apiSubscriptions),
  ratings: many(apiRatings),
  requiredHeaders: many(apiRequiredHeaders),
  allowedMethods: many(apiAllowedMethods),
}));

export const apiSubscriptionsRelations = relations(apiSubscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [apiSubscriptions.userId],
    references: [users.id],
  }),
  api: one(apis, {
    fields: [apiSubscriptions.apiId],
    references: [apis.id],
  }),
  apiKeys: many(apiKeys),
  analytics: many(apiUsageAnalytics),
  paymentRecords: many(paymentRecords),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  subscription: one(apiSubscriptions, {
    fields: [apiKeys.subscriptionId],
    references: [apiSubscriptions.id],
  }),
}));

export const apiRatingsRelations = relations(apiRatings, ({ one }) => ({
  user: one(users, {
    fields: [apiRatings.userId],
    references: [users.id],
  }),
  api: one(apis, {
    fields: [apiRatings.apiId],
    references: [apis.id],
  }),
}));

export const apiUsageAnalyticsRelations = relations(apiUsageAnalytics, ({ one }) => ({
  subscription: one(apiSubscriptions, {
    fields: [apiUsageAnalytics.subscriptionId],
    references: [apiSubscriptions.id],
  }),
}));

export const paymentRecordsRelations = relations(paymentRecords, ({ one }) => ({
  subscription: one(apiSubscriptions, {
    fields: [paymentRecords.subscriptionId],
    references: [apiSubscriptions.id],
  }),
}));

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [usageRecords.apiKeyId],
    references: [apiKeys.id],
  }),
  api: one(apis, {
    fields: [usageRecords.apiId],
    references: [apis.id],
  }),
}));

export const apiRequiredHeadersRelations = relations(apiRequiredHeaders, ({ one }) => ({
  api: one(apis, {
    fields: [apiRequiredHeaders.apiId],
    references: [apis.id],
  }),
}));

export const apiAllowedMethodsRelations = relations(apiAllowedMethods, ({ one }) => ({
  api: one(apis, {
    fields: [apiAllowedMethods.apiId],
    references: [apis.id],
  }),
}));

// Pricing Models table
export const pricingModels = pgTable('pricing_models', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // 'usage_based', 'subscription', 'freemium', 'hybrid'
  billingCycle: varchar('billing_cycle', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly', 'yearly'
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }), // For subscription/hybrid models
  configJson: text('config_json').notNull(), // JSON storage for flexible configuration
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('pricing_models_type_idx').on(table.type),
  activeIdx: index('pricing_models_active_idx').on(table.isActive),
}));

// Pricing Tiers table
export const pricingTiers = pgTable('pricing_tiers', {
  id: serial('id').primaryKey(),
  pricingModelId: integer('pricing_model_id').references(() => pricingModels.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  tierOrder: integer('tier_order').notNull(), // Ordering of tiers
  limitRequests: integer('limit_requests'), // null = unlimited
  pricePerUnit: decimal('price_per_unit', { precision: 10, scale: 6 }).notNull(),
  baseFee: decimal('base_fee', { precision: 10, scale: 2 }).default('0.00').notNull(),
  features: text('features'), // JSON array of feature IDs
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  modelIdx: index('pricing_tiers_model_idx').on(table.pricingModelId),
  orderIdx: index('pricing_tiers_order_idx').on(table.tierOrder),
}));

// Promotions table
export const promotions = pgTable('promotions', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  code: varchar('code', { length: 50 }).unique(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // 'percentage_discount', 'fixed_discount', 'tier_upgrade', 'free_trial'
  value: decimal('value', { precision: 10, scale: 2 }).notNull(), // Discount amount or percentage
  maxUses: integer('max_uses'), // null = unlimited
  currentUses: integer('current_uses').default(0).notNull(),
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until'),
  conditions: text('conditions'), // JSON for complex conditions
  isActive: boolean('is_active').default(true).notNull(),
  priority: integer('priority').default(0).notNull(), // Higher priority applied first
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  codeIdx: index('promotions_code_idx').on(table.code),
  activeIdx: index('promotions_active_idx').on(table.isActive),
  validFromIdx: index('promotions_valid_from_idx').on(table.validFrom),
  validUntilIdx: index('promotions_valid_until_idx').on(table.validUntil),
}));

// Billing Periods table
export const billingPeriods = pgTable('billing_periods', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  subscriptionId: integer('subscription_id').references(() => apiSubscriptions.id).notNull(),
  pricingModelId: integer('pricing_model_id').references(() => pricingModels.id).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active', 'closed', 'cancelled'
  usageSnapshot: text('usage_snapshot'), // JSON snapshot of usage metrics
  calculatedAmount: decimal('calculated_amount', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  subscriptionIdx: index('billing_periods_subscription_idx').on(table.subscriptionId),
  statusIdx: index('billing_periods_status_idx').on(table.status),
  dateIdx: index('billing_periods_date_idx').on(table.startDate, table.endDate),
}));

// Invoices table
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).unique().notNull(),
  subscriptionId: integer('subscription_id').references(() => apiSubscriptions.id).notNull(),
  billingPeriodId: integer('billing_period_id').references(() => billingPeriods.id),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 20 }).default('draft').notNull(), // 'draft', 'pending', 'paid', 'overdue', 'cancelled'
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),

  // Amounts
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),

  // Breakdown stored as JSON
  breakdown: text('breakdown').notNull(), // JSON array of line items
  appliedPromotions: text('applied_promotions'), // JSON array of promotions applied

  // Dates
  issueDate: timestamp('issue_date').defaultNow().notNull(),
  dueDate: timestamp('due_date').notNull(),
  paidDate: timestamp('paid_date'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  subscriptionIdx: index('invoices_subscription_idx').on(table.subscriptionId),
  userIdx: index('invoices_user_idx').on(table.userId),
  statusIdx: index('invoices_status_idx').on(table.status),
  dueDateIdx: index('invoices_due_date_idx').on(table.dueDate),
  invoiceNumberIdx: index('invoices_number_idx').on(table.invoiceNumber),
}));

// Subscription Pricing History (track pricing changes)
export const subscriptionPricingHistory = pgTable('subscription_pricing_history', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').references(() => apiSubscriptions.id).notNull(),
  pricingModelId: integer('pricing_model_id').references(() => pricingModels.id).notNull(),
  changetype: varchar('change_type', { length: 50 }).notNull(), // 'upgrade', 'downgrade', 'initial', 'renewal'
  oldPricingModelId: integer('old_pricing_model_id').references(() => pricingModels.id),
  effectiveDate: timestamp('effective_date').notNull(),
  prorationCredit: decimal('proration_credit', { precision: 10, scale: 2 }).default('0.00'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  subscriptionIdx: index('sub_pricing_history_subscription_idx').on(table.subscriptionId),
  effectiveDateIdx: index('sub_pricing_history_date_idx').on(table.effectiveDate),
}));

// Relations for new tables
export const pricingModelsRelations = relations(pricingModels, ({ many }) => ({
  tiers: many(pricingTiers),
  billingPeriods: many(billingPeriods),
  pricingHistory: many(subscriptionPricingHistory),
}));

export const pricingTiersRelations = relations(pricingTiers, ({ one }) => ({
  pricingModel: one(pricingModels, {
    fields: [pricingTiers.pricingModelId],
    references: [pricingModels.id],
  }),
}));

export const promotionsRelations = relations(promotions, ({ many }) => ({
  // Will be linked through applied_promotions JSON
}));

export const billingPeriodsRelations = relations(billingPeriods, ({ one, many }) => ({
  subscription: one(apiSubscriptions, {
    fields: [billingPeriods.subscriptionId],
    references: [apiSubscriptions.id],
  }),
  pricingModel: one(pricingModels, {
    fields: [billingPeriods.pricingModelId],
    references: [pricingModels.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  subscription: one(apiSubscriptions, {
    fields: [invoices.subscriptionId],
    references: [apiSubscriptions.id],
  }),
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  billingPeriod: one(billingPeriods, {
    fields: [invoices.billingPeriodId],
    references: [billingPeriods.id],
  }),
}));

export const subscriptionPricingHistoryRelations = relations(subscriptionPricingHistory, ({ one }) => ({
  subscription: one(apiSubscriptions, {
    fields: [subscriptionPricingHistory.subscriptionId],
    references: [apiSubscriptions.id],
  }),
  pricingModel: one(pricingModels, {
    fields: [subscriptionPricingHistory.pricingModelId],
    references: [pricingModels.id],
  }),
  oldPricingModel: one(pricingModels, {
    fields: [subscriptionPricingHistory.oldPricingModelId],
    references: [pricingModels.id],
  }),
}));

// Approval System tables
export const approvals = pgTable('approvals', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'api_submission', 'provider_registration', etc.
  entityId: varchar('entity_id', { length: 255 }).notNull(), // UID of the entity being approved
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'api', 'user', 'subscription', etc.
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'approved', 'rejected', 'escalated', 'expired'
  priority: varchar('priority', { length: 20 }).default('medium').notNull(), // 'low', 'medium', 'high', 'urgent'
  requestedBy: integer('requested_by').references(() => users.id).notNull(),
  assignedTo: integer('assigned_to').references(() => users.id),
  processedBy: integer('processed_by').references(() => users.id),
  data: text('data'), // JSON data specific to the approval type
  reason: text('reason').notNull(),
  attachments: text('attachments'), // JSON array of attachment URLs
  tags: text('tags'), // JSON array of tags
  expectedResolution: timestamp('expected_resolution'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('approvals_type_idx').on(table.type),
  entityIdx: index('approvals_entity_idx').on(table.entityType, table.entityId),
  statusIdx: index('approvals_status_idx').on(table.status),
  priorityIdx: index('approvals_priority_idx').on(table.priority),
  requestedByIdx: index('approvals_requested_by_idx').on(table.requestedBy),
  assignedToIdx: index('approvals_assigned_to_idx').on(table.assignedTo),
  expectedResolutionIdx: index('approvals_expected_resolution_idx').on(table.expectedResolution),
}));

export const approvalComments = pgTable('approval_comments', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().unique().notNull(),
  approvalId: integer('approval_id').references(() => approvals.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  isInternal: boolean('is_internal').default(false).notNull(),
  attachments: text('attachments'), // JSON array of attachment URLs
  mentionedUsers: text('mentioned_users'), // JSON array of user IDs
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  approvalIdx: index('approval_comments_approval_idx').on(table.approvalId),
  userIdx: index('approval_comments_user_idx').on(table.userId),
  createdAtIdx: index('approval_comments_created_at_idx').on(table.createdAt),
}));

export const approvalHistory = pgTable('approval_history', {
  id: serial('id').primaryKey(),
  approvalId: integer('approval_id').references(() => approvals.id).notNull(),
  action: varchar('action', { length: 50 }).notNull(), // 'created', 'assigned', 'status_changed', 'escalated', etc.
  performedBy: integer('performed_by').references(() => users.id).notNull(),
  fromValue: text('from_value'), // Previous value (JSON)
  toValue: text('to_value'), // New value (JSON)
  metadata: text('metadata'), // Additional context (JSON)
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  approvalIdx: index('approval_history_approval_idx').on(table.approvalId),
  actionIdx: index('approval_history_action_idx').on(table.action),
  performedByIdx: index('approval_history_performed_by_idx').on(table.performedBy),
  createdAtIdx: index('approval_history_created_at_idx').on(table.createdAt),
}));

// Relations for approval tables
export const approvalsRelations = relations(approvals, ({ one, many }) => ({
  requester: one(users, {
    fields: [approvals.requestedBy],
    references: [users.id],
    relationName: 'approvalRequester',
  }),
  assignee: one(users, {
    fields: [approvals.assignedTo],
    references: [users.id],
    relationName: 'approvalAssignee',
  }),
  processor: one(users, {
    fields: [approvals.processedBy],
    references: [users.id],
    relationName: 'approvalProcessor',
  }),
  comments: many(approvalComments),
  history: many(approvalHistory),
}));

export const approvalCommentsRelations = relations(approvalComments, ({ one }) => ({
  approval: one(approvals, {
    fields: [approvalComments.approvalId],
    references: [approvals.id],
  }),
  user: one(users, {
    fields: [approvalComments.userId],
    references: [users.id],
  }),
}));

export const approvalHistoryRelations = relations(approvalHistory, ({ one }) => ({
  approval: one(approvals, {
    fields: [approvalHistory.approvalId],
    references: [approvals.id],
  }),
  performer: one(users, {
    fields: [approvalHistory.performedBy],
    references: [users.id],
  }),
}));

// Event Queue table for reliable event processing with retries
export const eventQueue = pgTable('event_queue', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 100 }).notNull(),
  payload: text('payload').notNull(), // JSON payload
  priority: varchar('priority', { length: 20 }).default('normal').notNull(), // 'high', 'normal', 'low'
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'processing', 'completed', 'failed', 'dead_letter'
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(5).notNull(),
  nextRetryAt: timestamp('next_retry_at'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
}, (table) => ({
  typeIdx: index('event_queue_type_idx').on(table.type),
  statusIdx: index('event_queue_status_idx').on(table.status),
  priorityIdx: index('event_queue_priority_idx').on(table.priority),
  nextRetryAtIdx: index('event_queue_next_retry_at_idx').on(table.nextRetryAt),
  createdAtIdx: index('event_queue_created_at_idx').on(table.createdAt),
  statusRetryIdx: index('event_queue_status_retry_idx').on(table.status, table.nextRetryAt),
}));