import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { db, paymentTransactions } from '../db';
import { CreatePaymentTransactionData, UpdatePaymentTransactionData } from '../types';

export class PaymentRepository {
  /**
   * Create a new payment transaction
   */
  async create(data: CreatePaymentTransactionData) {
    const [payment] = await db.insert(paymentTransactions).values({
      userId: data.userId,
      provider: data.provider,
      amount: data.amount,
      currency: data.currency,
      status: 'pending',
      metadata: data.metadata,
      providerOrderId: data.providerOrderId,
    }).returning();

    return payment;
  }

  /**
   * Find payment by UID
   */
  async findByUid(uid: string) {
    const [payment] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.uid, uid));

    return payment;
  }

  /**
   * Find payment by ID
   */
  async findById(id: number) {
    const [payment] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, id));

    return payment;
  }

  /**
   * Find payment by provider transaction ID
   */
  async findByProviderTransactionId(providerTransactionId: string) {
    const [payment] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.providerTransactionId, providerTransactionId));

    return payment;
  }

  /**
   * Find payment by provider order ID
   */
  async findByProviderOrderId(providerOrderId: string) {
    const [payment] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.providerOrderId, providerOrderId));

    return payment;
  }

  /**
   * Update payment transaction
   */
  async update(id: number, data: UpdatePaymentTransactionData) {
    const [updated] = await db
      .update(paymentTransactions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, id))
      .returning();

    return updated;
  }

  /**
   * Mark payment as completed
   */
  async markCompleted(id: number, providerTransactionId: string) {
    return this.update(id, {
      status: 'completed',
      providerTransactionId,
      completedAt: new Date(),
    });
  }

  /**
   * Mark payment as failed
   */
  async markFailed(id: number, errorDescription: string, errorCode?: string) {
    return this.update(id, {
      status: 'failed',
      errorDescription,
      errorCode,
    });
  }

  /**
   * Get user payments
   */
  async findByUserId(userId: number, limit = 50, offset = 0) {
    const payments = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.userId, userId))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    return payments;
  }

  /**
   * Get payments by status
   */
  async findByStatus(status: string, limit = 50) {
    const payments = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.status, status))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(limit);

    return payments;
  }

  /**
   * Get payment analytics for a user
   */
  async getAnalytics(userId?: number, fromDate?: Date, toDate?: Date) {
    let query = db
      .select({
        totalAmount: sql<string>`SUM(${paymentTransactions.amount})`,
        totalCount: sql<number>`COUNT(*)`,
        successfulCount: sql<number>`COUNT(*) FILTER (WHERE ${paymentTransactions.status} = 'completed')`,
        failedCount: sql<number>`COUNT(*) FILTER (WHERE ${paymentTransactions.status} = 'failed')`,
        avgAmount: sql<string>`AVG(${paymentTransactions.amount})`,
      })
      .from(paymentTransactions);

    const conditions = [];

    if (userId) {
      conditions.push(eq(paymentTransactions.userId, userId));
    }

    if (fromDate) {
      conditions.push(gte(paymentTransactions.createdAt, fromDate));
    }

    if (toDate) {
      conditions.push(lte(paymentTransactions.createdAt, toDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const [analytics] = await query;

    return {
      totalAmount: parseFloat(analytics.totalAmount || '0'),
      totalCount: analytics.totalCount || 0,
      successfulCount: analytics.successfulCount || 0,
      failedCount: analytics.failedCount || 0,
      avgAmount: parseFloat(analytics.avgAmount || '0'),
    };
  }

  /**
   * Get pending payments older than specified minutes
   */
  async getPendingPayments(olderThanMinutes: number) {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    const payments = await db
      .select()
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.status, 'pending'),
          lte(paymentTransactions.createdAt, cutoffTime)
        )
      );

    return payments;
  }
}
