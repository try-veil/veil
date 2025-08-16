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
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  uidIdx: index('users_uid_idx').on(table.uid),
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