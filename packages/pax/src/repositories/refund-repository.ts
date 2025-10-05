import { eq, desc } from 'drizzle-orm';
import { db, refunds } from '../db';
import { CreateRefundData } from '../types';

export class RefundRepository {
  /**
   * Create a new refund
   */
  async create(data: CreateRefundData) {
    const [refund] = await db.insert(refunds).values({
      paymentTransactionId: data.paymentTransactionId,
      amount: data.amount,
      currency: data.currency,
      status: 'pending',
      reason: data.reason,
      providerRefundId: data.providerRefundId,
      metadata: data.metadata,
    }).returning();

    return refund;
  }

  /**
   * Find refund by UID
   */
  async findByUid(uid: string) {
    const [refund] = await db
      .select()
      .from(refunds)
      .where(eq(refunds.uid, uid));

    return refund;
  }

  /**
   * Find refund by provider refund ID
   */
  async findByProviderRefundId(providerRefundId: string) {
    const [refund] = await db
      .select()
      .from(refunds)
      .where(eq(refunds.providerRefundId, providerRefundId));

    return refund;
  }

  /**
   * Get refunds for a payment transaction
   */
  async findByPaymentTransactionId(paymentTransactionId: number) {
    const refundList = await db
      .select()
      .from(refunds)
      .where(eq(refunds.paymentTransactionId, paymentTransactionId))
      .orderBy(desc(refunds.createdAt));

    return refundList;
  }

  /**
   * Update refund status
   */
  async updateStatus(id: number, status: string, completedAt?: Date) {
    const [updated] = await db
      .update(refunds)
      .set({
        status,
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(refunds.id, id))
      .returning();

    return updated;
  }

  /**
   * Mark refund as completed
   */
  async markCompleted(id: number) {
    return this.updateStatus(id, 'completed', new Date());
  }

  /**
   * Mark refund as failed
   */
  async markFailed(id: number) {
    return this.updateStatus(id, 'failed');
  }
}
