import { db, paymentRecords, apiSubscriptions, apis, users } from '../db';
import { eq, and, desc, sql, gte, lte, between } from 'drizzle-orm';

export interface CreatePaymentData {
  subscriptionId: number;
  amount: string; // Store as string to preserve precision
  currency: string;
  paymentProvider: string;
  paymentMethodType: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  providerPaymentId?: string;
  providerCustomerId?: string;
  metadata?: Record<string, any>;
  billingAddress?: Record<string, any>;
  description?: string;
}

export interface UpdatePaymentData {
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  providerPaymentId?: string;
  providerCustomerId?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  processedAt?: Date;
  refundedAmount?: string;
  refundReason?: string;
}

export interface PaymentWithDetails {
  id: number;
  uid: string;
  subscriptionId: number;
  amount: string;
  currency: string;
  status: string;
  paymentProvider: string;
  paymentMethodType: string;
  providerPaymentId: string | null;
  providerCustomerId: string | null;
  metadata: Record<string, any> | null;
  billingAddress: Record<string, any> | null;
  description: string | null;
  failureReason: string | null;
  processedAt: Date | null;
  refundedAmount: string | null;
  refundReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  subscription: {
    id: number;
    uid: string;
    userId: number;
    status: string;
    requestsLimit: number;
    requestsUsed: number;
  };
  api: {
    id: number;
    uid: string;
    name: string;
    description: string;
    price: string;
    pricingModel: string;
  };
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface PaymentFilters {
  subscriptionId?: number;
  userId?: number;
  status?: string;
  paymentProvider?: string;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface PaymentAnalytics {
  totalRevenue: string;
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  refundedPayments: number;
  averageTransactionValue: string;
  conversionRate: number;
  topPaymentMethods: Array<{
    method: string;
    count: number;
    revenue: string;
  }>;
  revenueByProvider: Array<{
    provider: string;
    revenue: string;
    count: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: string;
    count: number;
  }>;
}

export class PaymentRepository {
  /**
   * Create a new payment record
   */
  async create(data: CreatePaymentData) {
    const [payment] = await db
      .insert(paymentRecords)
      .values({
        subscriptionId: data.subscriptionId,
        amount: data.amount,
        currency: data.currency,
        paymentProvider: data.paymentProvider,
        paymentMethodType: data.paymentMethodType,
        status: data.status || 'pending',
        providerPaymentId: data.providerPaymentId,
        providerCustomerId: data.providerCustomerId,
        metadata: JSON.stringify(data.metadata || {}),
        billingAddress: JSON.stringify(data.billingAddress || {}),
        description: data.description,
      })
      .returning();

    return payment;
  }

  /**
   * Find payment by ID with full details
   */
  async findById(id: number): Promise<PaymentWithDetails | null> {
    const result = await db
      .select({
        payment: paymentRecords,
        subscription: {
          id: apiSubscriptions.id,
          uid: apiSubscriptions.uid,
          userId: apiSubscriptions.userId,
          status: apiSubscriptions.status,
          requestsLimit: apiSubscriptions.requestsLimit,
          requestsUsed: apiSubscriptions.requestsUsed,
        },
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          description: apis.description,
          price: apis.price,
          pricingModel: apis.pricingModel,
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(paymentRecords)
      .leftJoin(apiSubscriptions, eq(paymentRecords.subscriptionId, apiSubscriptions.id))
      .leftJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .leftJoin(users, eq(apiSubscriptions.userId, users.id))
      .where(eq(paymentRecords.id, id))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return {
      ...row.payment,
      metadata: JSON.parse(row.payment.metadata || '{}'),
      billingAddress: JSON.parse(row.payment.billingAddress || '{}'),
      subscription: row.subscription,
      api: row.api,
      user: row.user,
    };
  }

  /**
   * Find payment by UID with full details
   */
  async findByUid(uid: string): Promise<PaymentWithDetails | null> {
    const result = await db
      .select({ id: paymentRecords.id })
      .from(paymentRecords)
      .where(eq(paymentRecords.uid, uid))
      .limit(1);

    if (result.length === 0) return null;

    return this.findById(result[0].id);
  }

  /**
   * Find payment by provider payment ID
   */
  async findByProviderPaymentId(providerPaymentId: string): Promise<PaymentWithDetails | null> {
    const result = await db
      .select({ id: paymentRecords.id })
      .from(paymentRecords)
      .where(eq(paymentRecords.providerPaymentId, providerPaymentId))
      .limit(1);

    if (result.length === 0) return null;

    return this.findById(result[0].id);
  }

  /**
   * Get payments for a user
   */
  async findByUser(
    userId: number,
    filters?: PaymentFilters
  ): Promise<PaymentWithDetails[]> {
    let query = db
      .select({
        payment: paymentRecords,
        subscription: {
          id: apiSubscriptions.id,
          uid: apiSubscriptions.uid,
          userId: apiSubscriptions.userId,
          status: apiSubscriptions.status,
          requestsLimit: apiSubscriptions.requestsLimit,
          requestsUsed: apiSubscriptions.requestsUsed,
        },
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          description: apis.description,
          price: apis.price,
          pricingModel: apis.pricingModel,
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(paymentRecords)
      .leftJoin(apiSubscriptions, eq(paymentRecords.subscriptionId, apiSubscriptions.id))
      .leftJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .leftJoin(users, eq(apiSubscriptions.userId, users.id))
      .where(eq(apiSubscriptions.userId, userId));

    // Apply filters
    if (filters?.subscriptionId) {
      query = query.where(eq(paymentRecords.subscriptionId, filters.subscriptionId));
    }

    if (filters?.status) {
      query = query.where(eq(paymentRecords.status, filters.status));
    }

    if (filters?.paymentProvider) {
      query = query.where(eq(paymentRecords.paymentProvider, filters.paymentProvider));
    }

    if (filters?.fromDate) {
      query = query.where(gte(paymentRecords.createdAt, filters.fromDate));
    }

    if (filters?.toDate) {
      query = query.where(lte(paymentRecords.createdAt, filters.toDate));
    }

    if (filters?.minAmount) {
      query = query.where(gte(sql`CAST(${paymentRecords.amount} AS DECIMAL)`, filters.minAmount));
    }

    if (filters?.maxAmount) {
      query = query.where(lte(sql`CAST(${paymentRecords.amount} AS DECIMAL)`, filters.maxAmount));
    }

    const results = await query.orderBy(desc(paymentRecords.createdAt));

    return results.map(row => ({
      ...row.payment,
      metadata: JSON.parse(row.payment.metadata || '{}'),
      billingAddress: JSON.parse(row.payment.billingAddress || '{}'),
      subscription: row.subscription,
      api: row.api,
      user: row.user,
    }));
  }

  /**
   * Get payments for a subscription
   */
  async findBySubscription(subscriptionId: number): Promise<PaymentWithDetails[]> {
    const results = await db
      .select({
        payment: paymentRecords,
        subscription: {
          id: apiSubscriptions.id,
          uid: apiSubscriptions.uid,
          userId: apiSubscriptions.userId,
          status: apiSubscriptions.status,
          requestsLimit: apiSubscriptions.requestsLimit,
          requestsUsed: apiSubscriptions.requestsUsed,
        },
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          description: apis.description,
          price: apis.price,
          pricingModel: apis.pricingModel,
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(paymentRecords)
      .leftJoin(apiSubscriptions, eq(paymentRecords.subscriptionId, apiSubscriptions.id))
      .leftJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .leftJoin(users, eq(apiSubscriptions.userId, users.id))
      .where(eq(paymentRecords.subscriptionId, subscriptionId))
      .orderBy(desc(paymentRecords.createdAt));

    return results.map(row => ({
      ...row.payment,
      metadata: JSON.parse(row.payment.metadata || '{}'),
      billingAddress: JSON.parse(row.payment.billingAddress || '{}'),
      subscription: row.subscription,
      api: row.api,
      user: row.user,
    }));
  }

  /**
   * Update payment record
   */
  async update(id: number, data: UpdatePaymentData) {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.metadata) {
      updateData.metadata = JSON.stringify(data.metadata);
    }

    const [payment] = await db
      .update(paymentRecords)
      .set(updateData)
      .where(eq(paymentRecords.id, id))
      .returning();

    return payment || null;
  }

  /**
   * Mark payment as completed
   */
  async markCompleted(id: number, providerPaymentId: string, processedAt?: Date) {
    const [payment] = await db
      .update(paymentRecords)
      .set({
        status: 'completed',
        providerPaymentId,
        processedAt: processedAt || new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentRecords.id, id))
      .returning();

    return payment || null;
  }

  /**
   * Mark payment as failed
   */
  async markFailed(id: number, failureReason: string) {
    const [payment] = await db
      .update(paymentRecords)
      .set({
        status: 'failed',
        failureReason,
        updatedAt: new Date(),
      })
      .where(eq(paymentRecords.id, id))
      .returning();

    return payment || null;
  }

  /**
   * Process refund
   */
  async processRefund(id: number, refundAmount: string, reason: string) {
    const [payment] = await db
      .update(paymentRecords)
      .set({
        status: 'refunded',
        refundedAmount: refundAmount,
        refundReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(paymentRecords.id, id))
      .returning();

    return payment || null;
  }

  /**
   * Get payment analytics
   */
  async getAnalytics(
    userId?: number,
    fromDate?: Date,
    toDate?: Date
  ): Promise<PaymentAnalytics> {
    let baseQuery = db
      .select({
        amount: paymentRecords.amount,
        status: paymentRecords.status,
        paymentProvider: paymentRecords.paymentProvider,
        paymentMethodType: paymentRecords.paymentMethodType,
        createdAt: paymentRecords.createdAt,
      })
      .from(paymentRecords);

    if (userId) {
      baseQuery = baseQuery
        .leftJoin(apiSubscriptions, eq(paymentRecords.subscriptionId, apiSubscriptions.id))
        .where(eq(apiSubscriptions.userId, userId));
    }

    if (fromDate) {
      baseQuery = baseQuery.where(gte(paymentRecords.createdAt, fromDate));
    }

    if (toDate) {
      baseQuery = baseQuery.where(lte(paymentRecords.createdAt, toDate));
    }

    const payments = await baseQuery;

    // Calculate analytics
    const totalPayments = payments.length;
    const successfulPayments = payments.filter(p => p.status === 'completed').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;
    const refundedPayments = payments.filter(p => p.status === 'refunded').length;

    const totalRevenue = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const averageTransactionValue = totalPayments > 0 ? totalRevenue / totalPayments : 0;
    const conversionRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    // Group by payment methods
    const methodGroups = payments.reduce((acc, p) => {
      if (p.status === 'completed') {
        const key = p.paymentMethodType;
        if (!acc[key]) {
          acc[key] = { count: 0, revenue: 0 };
        }
        acc[key].count++;
        acc[key].revenue += parseFloat(p.amount);
      }
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    const topPaymentMethods = Object.entries(methodGroups).map(([method, data]) => ({
      method,
      count: data.count,
      revenue: data.revenue.toFixed(2),
    }));

    // Group by providers
    const providerGroups = payments.reduce((acc, p) => {
      if (p.status === 'completed') {
        const key = p.paymentProvider;
        if (!acc[key]) {
          acc[key] = { count: 0, revenue: 0 };
        }
        acc[key].count++;
        acc[key].revenue += parseFloat(p.amount);
      }
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    const revenueByProvider = Object.entries(providerGroups).map(([provider, data]) => ({
      provider,
      count: data.count,
      revenue: data.revenue.toFixed(2),
    }));

    // Monthly trends (last 12 months)
    const monthlyGroups = payments.reduce((acc, p) => {
      if (p.status === 'completed') {
        const month = new Date(p.createdAt).toISOString().slice(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = { count: 0, revenue: 0 };
        }
        acc[month].count++;
        acc[month].revenue += parseFloat(p.amount);
      }
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    const monthlyTrends = Object.entries(monthlyGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        count: data.count,
        revenue: data.revenue.toFixed(2),
      }));

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalPayments,
      successfulPayments,
      failedPayments,
      refundedPayments,
      averageTransactionValue: averageTransactionValue.toFixed(2),
      conversionRate: Math.round(conversionRate * 100) / 100,
      topPaymentMethods,
      revenueByProvider,
      monthlyTrends,
    };
  }

  /**
   * Get pending payments (for cleanup/processing)
   */
  async getPendingPayments(olderThanMinutes: number = 30): Promise<PaymentWithDetails[]> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - olderThanMinutes);

    const results = await db
      .select({
        payment: paymentRecords,
        subscription: {
          id: apiSubscriptions.id,
          uid: apiSubscriptions.uid,
          userId: apiSubscriptions.userId,
          status: apiSubscriptions.status,
          requestsLimit: apiSubscriptions.requestsLimit,
          requestsUsed: apiSubscriptions.requestsUsed,
        },
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          description: apis.description,
          price: apis.price,
          pricingModel: apis.pricingModel,
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(paymentRecords)
      .leftJoin(apiSubscriptions, eq(paymentRecords.subscriptionId, apiSubscriptions.id))
      .leftJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .leftJoin(users, eq(apiSubscriptions.userId, users.id))
      .where(and(
        eq(paymentRecords.status, 'pending'),
        lte(paymentRecords.createdAt, cutoffTime)
      ));

    return results.map(row => ({
      ...row.payment,
      metadata: JSON.parse(row.payment.metadata || '{}'),
      billingAddress: JSON.parse(row.payment.billingAddress || '{}'),
      subscription: row.subscription,
      api: row.api,
      user: row.user,
    }));
  }

  /**
   * Delete payment record (admin only)
   */
  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(paymentRecords)
      .where(eq(paymentRecords.id, id));

    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Check if payment exists
   */
  async exists(id: number): Promise<boolean> {
    const [payment] = await db
      .select({ id: paymentRecords.id })
      .from(paymentRecords)
      .where(eq(paymentRecords.id, id))
      .limit(1);

    return !!payment;
  }
}