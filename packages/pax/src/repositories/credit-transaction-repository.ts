import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { db, creditTransactions } from '../db';

export interface CreateCreditTransactionData {
  creditAccountId: number;
  type: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  reservedBalanceBefore?: string;
  reservedBalanceAfter?: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  metadata?: any;
  status?: string;
}

export class CreditTransactionRepository {
  /**
   * Create a new credit transaction
   */
  async create(data: CreateCreditTransactionData, tx?: any) {
    const dbInstance = tx || db;
    console.log(`📝 Creating credit transaction - type: ${data.type}, amount: ${data.amount}, tx: ${tx ? 'provided' : 'none'}`);
    const [transaction] = await dbInstance.insert(creditTransactions).values(data).returning();
    console.log(`✅ Credit transaction created - id: ${transaction.id}, uid: ${transaction.uid}`);
    return transaction;
  }

  /**
   * Find transaction by UID
   */
  async findByUid(uid: string) {
    const [transaction] = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.uid, uid));

    return transaction;
  }

  /**
   * Find transaction by reference
   */
  async findByReference(referenceType: string, referenceId: string) {
    const [transaction] = await db
      .select()
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.referenceType, referenceType),
          eq(creditTransactions.referenceId, referenceId)
        )
      );

    return transaction;
  }

  /**
   * Get transactions for an account
   */
  async findByAccount(
    creditAccountId: number,
    filters?: {
      type?: string;
      referenceType?: string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    let query = db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.creditAccountId, creditAccountId))
      .orderBy(desc(creditTransactions.createdAt));

    const conditions = [eq(creditTransactions.creditAccountId, creditAccountId)];

    if (filters?.type) {
      conditions.push(eq(creditTransactions.type, filters.type));
    }

    if (filters?.referenceType) {
      conditions.push(eq(creditTransactions.referenceType, filters.referenceType));
    }

    if (filters?.fromDate) {
      conditions.push(gte(creditTransactions.createdAt, filters.fromDate));
    }

    if (filters?.toDate) {
      conditions.push(lte(creditTransactions.createdAt, filters.toDate));
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions)) as any;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  /**
   * Get transaction summary for an account
   */
  async getSummary(
    creditAccountId: number,
    fromDate?: Date,
    toDate?: Date
  ) {
    const conditions = [eq(creditTransactions.creditAccountId, creditAccountId)];

    if (fromDate) {
      conditions.push(gte(creditTransactions.createdAt, fromDate));
    }

    if (toDate) {
      conditions.push(lte(creditTransactions.createdAt, toDate));
    }

    let query = db
      .select({
        totalCredits: sql<string>`SUM(CASE WHEN ${creditTransactions.type} = 'credit' THEN ${creditTransactions.amount} ELSE 0 END)`,
        totalDebits: sql<string>`SUM(CASE WHEN ${creditTransactions.type} = 'debit' THEN ${creditTransactions.amount} ELSE 0 END)`,
        totalRefunds: sql<string>`SUM(CASE WHEN ${creditTransactions.type} = 'refund' THEN ${creditTransactions.amount} ELSE 0 END)`,
        transactionCount: sql<number>`COUNT(*)`,
      })
      .from(creditTransactions);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const [summary] = await query;

    return {
      totalCredits: parseFloat(summary.totalCredits || '0'),
      totalDebits: parseFloat(summary.totalDebits || '0'),
      totalRefunds: parseFloat(summary.totalRefunds || '0'),
      netChange: parseFloat(summary.totalCredits || '0') - parseFloat(summary.totalDebits || '0') + parseFloat(summary.totalRefunds || '0'),
      transactionCount: summary.transactionCount || 0,
    };
  }

  /**
   * Reverse a transaction
   */
  async reverse(transactionId: number, reason: string) {
    const [updated] = await db
      .update(creditTransactions)
      .set({
        status: 'reversed',
        reversedAt: new Date(),
      })
      .where(eq(creditTransactions.id, transactionId))
      .returning();

    return updated;
  }
}

export const creditTransactionRepository = new CreditTransactionRepository();
