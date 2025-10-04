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
  role: varchar('role', { length: 20 }).default('buyer').notNull(), // 'buyer', 'seller', 'admin'
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

// Webhook Events table - for storing and processing payment provider webhooks
export const webhookEvents = pgTable('webhook_events', {
  id: serial('id').primaryKey(),
  eventId: varchar('event_id', { length: 255 }).unique().notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'razorpay', 'stripe', 'paypal'
  eventType: varchar('event_type', { length: 100 }).notNull(), // 'payment.captured', 'subscription.charged', etc.
  payload: text('payload').notNull(), // JSON payload from webhook
  processed: boolean('processed').default(false).notNull(),
  processedAt: timestamp('processed_at'),
  retryCount: integer('retry_count').default(0).notNull(),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdIdx: index('webhook_events_event_id_idx').on(table.eventId),
  providerIdx: index('webhook_events_provider_idx').on(table.provider),
  processedIdx: index('webhook_events_processed_idx').on(table.processed),
  createdAtIdx: index('webhook_events_created_at_idx').on(table.createdAt),
}));