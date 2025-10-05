import { eq, desc } from 'drizzle-orm';
import { db, creditPurchases } from '../db';

export interface CreatePurchaseData {
  creditAccountId: number;
  packageId?: number;
  credits: string;
  bonusCredits?: string;
  totalCredits: string;
  price: string;
  currency: string;
}

export class CreditPurchaseRepository {
  /**
   * Create a new purchase
   */
  async create(data: CreatePurchaseData) {
    const [purchase] = await db.insert(creditPurchases).values(data).returning();
    return purchase;
  }

  /**
   * Find purchase by UID
   */
  async findByUid(uid: string) {
    const [purchase] = await db
      .select()
      .from(creditPurchases)
      .where(eq(creditPurchases.uid, uid));

    return purchase;
  }

  /**
   * Find purchase by payment transaction ID
   */
  async findByPaymentTransaction(paymentTransactionId: number) {
    const [purchase] = await db
      .select()
      .from(creditPurchases)
      .where(eq(creditPurchases.paymentTransactionId, paymentTransactionId));

    return purchase;
  }

  /**
   * Get purchases for an account
   */
  async findByAccount(creditAccountId: number, limit = 50) {
    const purchases = await db
      .select()
      .from(creditPurchases)
      .where(eq(creditPurchases.creditAccountId, creditAccountId))
      .orderBy(desc(creditPurchases.createdAt))
      .limit(limit);

    return purchases;
  }

  /**
   * Update purchase with payment transaction
   */
  async linkPayment(uid: string, paymentTransactionId: number) {
    const [updated] = await db
      .update(creditPurchases)
      .set({
        paymentTransactionId,
        updatedAt: new Date(),
      })
      .where(eq(creditPurchases.uid, uid))
      .returning();

    return updated;
  }

  /**
   * Mark purchase as completed
   */
  async complete(uid: string, creditTransactionId: number) {
    const [updated] = await db
      .update(creditPurchases)
      .set({
        status: 'completed',
        creditedAt: new Date(),
        creditTransactionId,
        updatedAt: new Date(),
      })
      .where(eq(creditPurchases.uid, uid))
      .returning();

    return updated;
  }

  /**
   * Mark purchase as failed
   */
  async fail(uid: string) {
    const [updated] = await db
      .update(creditPurchases)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(creditPurchases.uid, uid))
      .returning();

    return updated;
  }

  /**
   * Mark purchase as refunded
   */
  async refund(uid: string) {
    const [updated] = await db
      .update(creditPurchases)
      .set({
        status: 'refunded',
        updatedAt: new Date(),
      })
      .where(eq(creditPurchases.uid, uid))
      .returning();

    return updated;
  }
}

export const creditPurchaseRepository = new CreditPurchaseRepository();
