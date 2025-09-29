import { db, apiSubscriptions, apis, users, apiKeys, paymentRecords } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface CreateSubscriptionData {
  userId: number;
  apiId: number;
  requestsLimit: number;
  status?: 'active' | 'suspended' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
}

export interface UpdateSubscriptionData {
  status?: 'active' | 'suspended' | 'cancelled';
  requestsLimit?: number;
  requestsUsed?: number;
  endDate?: Date;
}

export interface SubscriptionWithDetails {
  id: number;
  uid: string;
  userId: number;
  apiId: number;
  status: string;
  startDate: Date;
  endDate: Date | null;
  requestsUsed: number;
  requestsLimit: number;
  createdAt: Date;
  updatedAt: Date;
  api: {
    id: number;
    uid: string;
    name: string;
    description: string;
    version: string;
    endpoint: string;
    baseUrl: string;
    price: string;
    pricingModel: string;
    isActive: boolean;
  };
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  apiKeys: Array<{
    id: number;
    uid: string;
    keyValue: string;
    name: string;
    isActive: boolean;
    lastUsed: Date | null;
    expiresAt: Date | null;
  }>;
  paymentRecords: Array<{
    id: number;
    uid: string;
    amount: string;
    currency: string;
    status: string;
    paymentProvider: string;
    createdAt: Date;
  }>;
}

export interface SubscriptionFilters {
  userId?: number;
  apiId?: number;
  status?: string;
  isActive?: boolean;
}

export class SubscriptionRepository {
  async create(data: CreateSubscriptionData) {
    const [subscription] = await db
      .insert(apiSubscriptions)
      .values({
        userId: data.userId,
        apiId: data.apiId,
        requestsLimit: data.requestsLimit,
        status: data.status || 'active',
        startDate: data.startDate || new Date(),
        endDate: data.endDate,
      })
      .returning();

    return subscription;
  }

  async findById(id: number): Promise<SubscriptionWithDetails | null> {
    const result = await db
      .select({
        subscription: apiSubscriptions,
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          description: apis.description,
          version: apis.version,
          endpoint: apis.endpoint,
          baseUrl: apis.baseUrl,
          price: apis.price,
          pricingModel: apis.pricingModel,
          isActive: apis.isActive,
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(apiSubscriptions)
      .leftJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .leftJoin(users, eq(apiSubscriptions.userId, users.id))
      .where(eq(apiSubscriptions.id, id))
      .limit(1);

    if (result.length === 0) return null;

    const subscription = result[0];

    // Get API keys for this subscription
    const keys = await db
      .select({
        id: apiKeys.id,
        uid: apiKeys.uid,
        keyValue: apiKeys.keyValue,
        name: apiKeys.name,
        isActive: apiKeys.isActive,
        lastUsed: apiKeys.lastUsed,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.subscriptionId, id));

    // Get payment records for this subscription
    const payments = await db
      .select({
        id: paymentRecords.id,
        uid: paymentRecords.uid,
        amount: paymentRecords.amount,
        currency: paymentRecords.currency,
        status: paymentRecords.status,
        paymentProvider: paymentRecords.paymentProvider,
        createdAt: paymentRecords.createdAt,
      })
      .from(paymentRecords)
      .where(eq(paymentRecords.subscriptionId, id))
      .orderBy(desc(paymentRecords.createdAt));

    return {
      ...subscription.subscription,
      api: subscription.api,
      user: subscription.user,
      apiKeys: keys,
      paymentRecords: payments,
    };
  }

  async findByUid(uid: string): Promise<SubscriptionWithDetails | null> {
    const result = await db
      .select({ id: apiSubscriptions.id })
      .from(apiSubscriptions)
      .where(eq(apiSubscriptions.uid, uid))
      .limit(1);

    if (result.length === 0) return null;

    return this.findById(result[0].id);
  }

  async findByUserAndAPI(userId: number, apiId: number) {
    const [subscription] = await db
      .select()
      .from(apiSubscriptions)
      .where(and(
        eq(apiSubscriptions.userId, userId),
        eq(apiSubscriptions.apiId, apiId)
      ))
      .orderBy(desc(apiSubscriptions.createdAt))
      .limit(1);

    return subscription || null;
  }

  async findByUser(
    userId: number,
    filters?: SubscriptionFilters
  ): Promise<SubscriptionWithDetails[]> {
    let query = db
      .select({
        subscription: apiSubscriptions,
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          description: apis.description,
          version: apis.version,
          endpoint: apis.endpoint,
          baseUrl: apis.baseUrl,
          price: apis.price,
          pricingModel: apis.pricingModel,
          isActive: apis.isActive,
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(apiSubscriptions)
      .leftJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .leftJoin(users, eq(apiSubscriptions.userId, users.id))
      .where(eq(apiSubscriptions.userId, userId));

    if (filters?.status) {
      query = query.where(eq(apiSubscriptions.status, filters.status));
    }

    if (filters?.apiId) {
      query = query.where(eq(apiSubscriptions.apiId, filters.apiId));
    }

    const results = await query.orderBy(desc(apiSubscriptions.createdAt));

    // Get API keys and payments for each subscription
    const subscriptionsWithDetails = await Promise.all(
      results.map(async (result) => {
        const keys = await db
          .select({
            id: apiKeys.id,
            uid: apiKeys.uid,
            keyValue: apiKeys.keyValue,
            name: apiKeys.name,
            isActive: apiKeys.isActive,
            lastUsed: apiKeys.lastUsed,
            expiresAt: apiKeys.expiresAt,
          })
          .from(apiKeys)
          .where(eq(apiKeys.subscriptionId, result.subscription.id));

        const payments = await db
          .select({
            id: paymentRecords.id,
            uid: paymentRecords.uid,
            amount: paymentRecords.amount,
            currency: paymentRecords.currency,
            status: paymentRecords.status,
            paymentProvider: paymentRecords.paymentProvider,
            createdAt: paymentRecords.createdAt,
          })
          .from(paymentRecords)
          .where(eq(paymentRecords.subscriptionId, result.subscription.id))
          .orderBy(desc(paymentRecords.createdAt));

        return {
          ...result.subscription,
          api: result.api,
          user: result.user,
          apiKeys: keys,
          paymentRecords: payments,
        };
      })
    );

    return subscriptionsWithDetails;
  }

  async update(id: number, data: UpdateSubscriptionData) {
    const [subscription] = await db
      .update(apiSubscriptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(apiSubscriptions.id, id))
      .returning();

    return subscription || null;
  }

  async updateUsage(id: number, requestsUsed: number) {
    const [subscription] = await db
      .update(apiSubscriptions)
      .set({
        requestsUsed,
        updatedAt: new Date(),
      })
      .where(eq(apiSubscriptions.id, id))
      .returning();

    return subscription || null;
  }

  async incrementUsage(id: number, increment: number = 1) {
    const [subscription] = await db
      .update(apiSubscriptions)
      .set({
        requestsUsed: sql`${apiSubscriptions.requestsUsed} + ${increment}`,
        updatedAt: new Date(),
      })
      .where(eq(apiSubscriptions.id, id))
      .returning();

    return subscription || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(apiSubscriptions)
      .where(eq(apiSubscriptions.id, id));

    return result.rowCount !== null && result.rowCount > 0;
  }

  async cancel(id: number) {
    const [subscription] = await db
      .update(apiSubscriptions)
      .set({
        status: 'cancelled',
        endDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(apiSubscriptions.id, id))
      .returning();

    return subscription || null;
  }

  async suspend(id: number) {
    const [subscription] = await db
      .update(apiSubscriptions)
      .set({
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(eq(apiSubscriptions.id, id))
      .returning();

    return subscription || null;
  }

  async activate(id: number) {
    const [subscription] = await db
      .update(apiSubscriptions)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(apiSubscriptions.id, id))
      .returning();

    return subscription || null;
  }

  async exists(id: number): Promise<boolean> {
    const [subscription] = await db
      .select({ id: apiSubscriptions.id })
      .from(apiSubscriptions)
      .where(eq(apiSubscriptions.id, id))
      .limit(1);

    return !!subscription;
  }

  async hasActiveSubscription(userId: number, apiId: number): Promise<boolean> {
    const [subscription] = await db
      .select({ id: apiSubscriptions.id })
      .from(apiSubscriptions)
      .where(and(
        eq(apiSubscriptions.userId, userId),
        eq(apiSubscriptions.apiId, apiId),
        eq(apiSubscriptions.status, 'active')
      ))
      .limit(1);

    return !!subscription;
  }

  async getUsageStats(subscriptionId: number) {
    const [subscription] = await db
      .select({
        requestsUsed: apiSubscriptions.requestsUsed,
        requestsLimit: apiSubscriptions.requestsLimit,
        status: apiSubscriptions.status,
      })
      .from(apiSubscriptions)
      .where(eq(apiSubscriptions.id, subscriptionId))
      .limit(1);

    if (!subscription) return null;

    const usagePercentage = (subscription.requestsUsed / subscription.requestsLimit) * 100;
    const remainingRequests = Math.max(0, subscription.requestsLimit - subscription.requestsUsed);

    return {
      requestsUsed: subscription.requestsUsed,
      requestsLimit: subscription.requestsLimit,
      remainingRequests,
      usagePercentage: Math.round(usagePercentage * 100) / 100, // Round to 2 decimal places
      status: subscription.status,
      isOverLimit: subscription.requestsUsed >= subscription.requestsLimit,
    };
  }
}