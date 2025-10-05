import { eq, sql } from 'drizzle-orm';
import { db, creditAccounts } from '../db';

export interface CreateCreditAccountData {
  userId: number;
  currency?: string;
}

export interface UpdateAccountSettingsData {
  lowBalanceThreshold?: string;
  autoRechargeEnabled?: boolean;
  autoRechargeAmount?: string;
  autoRechargeThreshold?: string;
}

export class CreditAccountRepository {
  /**
   * Create a new credit account
   */
  async create(data: CreateCreditAccountData) {
    const [account] = await db.insert(creditAccounts).values({
      userId: data.userId,
      currency: data.currency || 'INR',
    }).returning();

    return account;
  }

  /**
   * Find account by user ID
   */
  async findByUserId(userId: number) {
    const [account] = await db
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.userId, userId));

    return account;
  }

  /**
   * Find account by UID
   */
  async findByUid(uid: string) {
    const [account] = await db
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.uid, uid));

    return account;
  }

  /**
   * Get or create account for user
   */
  async getOrCreate(userId: number) {
    let account = await this.findByUserId(userId);

    if (!account) {
      account = await this.create({ userId });
    }

    return account;
  }

  /**
   * Update account settings
   */
  async updateSettings(userId: number, settings: UpdateAccountSettingsData) {
    const [updated] = await db
      .update(creditAccounts)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.userId, userId))
      .returning();

    return updated;
  }

  /**
   * Update balance (should be called within transaction)
   */
  async updateBalance(id: number, balanceDelta: number | string, reservedDelta?: number | string, tx?: any) {
    console.log(`💰 updateBalance called - id: ${id}, balanceDelta: ${balanceDelta}, reservedDelta: ${reservedDelta}, tx: ${tx ? 'provided' : 'none'}`);
    const dbInstance = tx || db;

    const updates: any = {
      balance: sql`${creditAccounts.balance} + ${balanceDelta}`,
      lastTransactionAt: new Date(),
      updatedAt: new Date(),
    };

    if (reservedDelta !== undefined) {
      updates.reservedBalance = sql`${creditAccounts.reservedBalance} + ${reservedDelta}`;
    }

    console.log(`⏳ Executing UPDATE on credit_accounts...`);
    const [updated] = await dbInstance
      .update(creditAccounts)
      .set(updates)
      .where(eq(creditAccounts.id, id))
      .returning();

    console.log(`✅ UPDATE completed - new balance: ${updated.balance}, new reserved: ${updated.reservedBalance}`);
    return updated;
  }

  /**
   * Update total credits (for tracking)
   */
  async updateTotalCredits(id: number, amount: string) {
    await db
      .update(creditAccounts)
      .set({
        totalCredits: sql`${creditAccounts.totalCredits} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.id, id));
  }

  /**
   * Update total spent (for tracking)
   */
  async updateTotalSpent(id: number, amount: string) {
    await db
      .update(creditAccounts)
      .set({
        totalSpent: sql`${creditAccounts.totalSpent} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.id, id));
  }

  /**
   * Update totals (credits and spent) within a transaction
   */
  async updateTotals(id: number, creditsDelta: number | string, spentDelta: number | string, tx?: any) {
    const dbInstance = tx || db;

    await dbInstance
      .update(creditAccounts)
      .set({
        totalCredits: sql`${creditAccounts.totalCredits} + ${creditsDelta}`,
        totalSpent: sql`${creditAccounts.totalSpent} + ${spentDelta}`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.id, id));
  }

  /**
   * Suspend account
   */
  async suspend(userId: number, reason: string) {
    const [updated] = await db
      .update(creditAccounts)
      .set({
        isSuspended: true,
        suspensionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.userId, userId))
      .returning();

    return updated;
  }

  /**
   * Unsuspend account
   */
  async unsuspend(userId: number) {
    const [updated] = await db
      .update(creditAccounts)
      .set({
        isSuspended: false,
        suspensionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.userId, userId))
      .returning();

    return updated;
  }

  /**
   * Check if account is active and not suspended
   */
  async isAccountActive(userId: number): Promise<boolean> {
    const account = await this.findByUserId(userId);
    return account ? account.isActive && !account.isSuspended : false;
  }

  /**
   * Lock account for update (within transaction)
   * Uses SKIP LOCKED to avoid deadlocks - if row is locked, returns undefined
   */
  async lockForUpdate(accountId: number, tx?: any) {
    console.log(`🔐 lockForUpdate called for account ${accountId}, tx: ${tx ? 'provided' : 'none'}`);
    const dbInstance = tx || db;

    console.log(`⏳ Executing SELECT FOR UPDATE SKIP LOCKED...`);

    try {
      // Set a statement timeout for this query (2 seconds)
      await dbInstance.execute(sql`SET LOCAL statement_timeout = '2s'`);

      const [account] = await dbInstance
        .select()
        .from(creditAccounts)
        .where(eq(creditAccounts.id, accountId))
        .for('update', { skipLocked: true });

      console.log(`✅ lockForUpdate completed for account ${accountId}, found: ${!!account}`);

      if (!account) {
        throw new Error(`Account ${accountId} is currently locked by another transaction`);
      }

      return account;
    } catch (error: any) {
      console.error(`❌ lockForUpdate failed for account ${accountId}:`, error.message);
      throw error;
    }
  }
}

export const creditAccountRepository = new CreditAccountRepository();
