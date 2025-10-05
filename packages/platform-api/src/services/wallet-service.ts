import { db } from '../db';
import { userWallets, walletTransactions, users, paymentRecords } from '../db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { ledgerService } from './ledger-service';

export interface CreateWalletData {
  userId: number;
  currency?: string;
  initialBalance?: string;
}

export interface AddCreditsData {
  userId: number;
  amount: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  paymentRecordId?: number;
  createdBy?: number;
  metadata?: Record<string, any>;
}

export interface DeductCreditsData {
  userId: number;
  amount: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  createdBy?: number;
  metadata?: Record<string, any>;
}

export interface WalletBalance {
  walletId: number;
  walletUid: string;
  userId: number;
  balance: string;
  lockedBalance: string;
  availableBalance: string;
  currency: string;
  isActive: boolean;
}

export interface WalletTransactionHistory {
  transactions: Array<{
    id: number;
    uid: string;
    type: string;
    amount: string;
    balanceBefore: string;
    balanceAfter: string;
    status: string;
    description: string;
    referenceType: string | null;
    referenceId: string | null;
    createdAt: Date;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class WalletService {
  /**
   * Create a new wallet for a user
   */
  async createWallet(data: CreateWalletData) {
    try {
      // Check if wallet already exists for user
      const existing = await this.getWalletByUserId(data.userId);
      if (existing) {
        throw new Error('Wallet already exists for this user');
      }

      // Get or create user's ledger account
      const userCreditAccount = await ledgerService.getAccountByCode('1300'); // User Wallets account
      if (!userCreditAccount) {
        throw new Error('User Wallets ledger account not found. Please initialize system accounts first.');
      }

      // Create wallet
      const [wallet] = await db.insert(userWallets).values({
        userId: data.userId,
        balance: data.initialBalance || '0.00',
        currency: data.currency || 'INR',
        ledgerAccountId: userCreditAccount.id,
        isActive: true,
      }).returning();

      // If initial balance provided, create ledger entry
      if (data.initialBalance && parseFloat(data.initialBalance) > 0) {
        const revenueAccount = await ledgerService.getAccountByCode('4100'); // Credit Purchase Revenue

        if (revenueAccount) {
          await ledgerService.createTransaction({
            transactionDate: new Date(),
            type: 'initial_credit',
            description: `Initial wallet balance for user ${data.userId}`,
            referenceType: 'wallet',
            referenceId: wallet.uid,
            userId: data.userId,
            entries: [
              {
                accountId: userCreditAccount.id,
                entryType: 'debit',
                amount: data.initialBalance,
                description: 'User wallet credited',
              },
              {
                accountId: revenueAccount.id,
                entryType: 'credit',
                amount: data.initialBalance,
                description: 'Credit revenue recognized',
              },
            ],
          });
        }
      }

      return wallet;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet by user ID
   */
  async getWalletByUserId(userId: number): Promise<WalletBalance | null> {
    const [wallet] = await db
      .select()
      .from(userWallets)
      .where(eq(userWallets.userId, userId));

    if (!wallet) {
      return null;
    }

    const balance = parseFloat(wallet.balance);
    const lockedBalance = parseFloat(wallet.lockedBalance);
    const availableBalance = balance - lockedBalance;

    return {
      walletId: wallet.id,
      walletUid: wallet.uid,
      userId: wallet.userId,
      balance: wallet.balance,
      lockedBalance: wallet.lockedBalance,
      availableBalance: availableBalance.toFixed(2),
      currency: wallet.currency,
      isActive: wallet.isActive,
    };
  }

  /**
   * Get or create wallet for user
   */
  async getOrCreateWallet(userId: number, currency: string = 'INR') {
    let wallet = await this.getWalletByUserId(userId);

    if (!wallet) {
      const created = await this.createWallet({ userId, currency });
      wallet = await this.getWalletByUserId(userId);
    }

    return wallet;
  }

  /**
   * Add credits to user wallet
   */
  async addCredits(data: AddCreditsData) {
    try {
      const amount = parseFloat(data.amount);
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get wallet
      const wallet = await this.getOrCreateWallet(data.userId);
      if (!wallet) {
        throw new Error('Failed to get or create wallet');
      }

      const walletRecord = await db
        .select()
        .from(userWallets)
        .where(eq(userWallets.id, wallet.walletId))
        .then(rows => rows[0]);

      const balanceBefore = parseFloat(walletRecord.balance);
      const balanceAfter = balanceBefore + amount;

      // Update wallet balance
      await db
        .update(userWallets)
        .set({
          balance: balanceAfter.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(userWallets.id, wallet.walletId));

      // Create wallet transaction record
      const [transaction] = await db.insert(walletTransactions).values({
        walletId: wallet.walletId,
        type: 'credit',
        amount: data.amount,
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        currency: wallet.currency,
        status: 'completed',
        description: data.description,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        paymentRecordId: data.paymentRecordId,
        createdBy: data.createdBy,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      }).returning();

      // Create ledger entries
      const userWalletAccount = await ledgerService.getAccountByCode('1300'); // User Wallets
      const liabilityAccount = await ledgerService.getAccountByCode('2100'); // User Credit Liability

      if (userWalletAccount && liabilityAccount) {
        const ledgerTx = await ledgerService.createTransaction({
          transactionDate: new Date(),
          type: 'wallet_credit',
          description: data.description,
          referenceType: 'wallet_transaction',
          referenceId: transaction.uid,
          userId: data.userId,
          createdBy: data.createdBy,
          entries: [
            {
              accountId: userWalletAccount.id,
              entryType: 'debit',
              amount: data.amount,
              description: `Credit added to user ${data.userId} wallet`,
            },
            {
              accountId: liabilityAccount.id,
              entryType: 'credit',
              amount: data.amount,
              description: 'User credit liability increased',
            },
          ],
          metadata: data.metadata,
        });

        // Link ledger transaction to wallet transaction
        await db
          .update(walletTransactions)
          .set({
            ledgerTransactionId: ledgerTx.transaction.id,
          })
          .where(eq(walletTransactions.id, transaction.id));
      }

      return {
        transaction,
        newBalance: balanceAfter.toFixed(2),
      };
    } catch (error) {
      console.error('Error adding credits:', error);
      throw error;
    }
  }

  /**
   * Deduct credits from user wallet
   */
  async deductCredits(data: DeductCreditsData) {
    try {
      const amount = parseFloat(data.amount);
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get wallet
      const wallet = await this.getWalletByUserId(data.userId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const walletRecord = await db
        .select()
        .from(userWallets)
        .where(eq(userWallets.id, wallet.walletId))
        .then(rows => rows[0]);

      const balanceBefore = parseFloat(walletRecord.balance);
      const availableBalance = parseFloat(wallet.availableBalance);

      if (amount > availableBalance) {
        throw new Error(`Insufficient balance. Available: ${availableBalance}, Required: ${amount}`);
      }

      const balanceAfter = balanceBefore - amount;

      // Update wallet balance
      await db
        .update(userWallets)
        .set({
          balance: balanceAfter.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(userWallets.id, wallet.walletId));

      // Create wallet transaction record
      const [transaction] = await db.insert(walletTransactions).values({
        walletId: wallet.walletId,
        type: 'debit',
        amount: data.amount,
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        currency: wallet.currency,
        status: 'completed',
        description: data.description,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        createdBy: data.createdBy,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      }).returning();

      // Create ledger entries
      const userWalletAccount = await ledgerService.getAccountByCode('1300'); // User Wallets
      const liabilityAccount = await ledgerService.getAccountByCode('2100'); // User Credit Liability

      if (userWalletAccount && liabilityAccount) {
        const ledgerTx = await ledgerService.createTransaction({
          transactionDate: new Date(),
          type: 'wallet_debit',
          description: data.description,
          referenceType: 'wallet_transaction',
          referenceId: transaction.uid,
          userId: data.userId,
          createdBy: data.createdBy,
          entries: [
            {
              accountId: liabilityAccount.id,
              entryType: 'debit',
              amount: data.amount,
              description: 'User credit liability decreased',
            },
            {
              accountId: userWalletAccount.id,
              entryType: 'credit',
              amount: data.amount,
              description: `Credit deducted from user ${data.userId} wallet`,
            },
          ],
          metadata: data.metadata,
        });

        // Link ledger transaction to wallet transaction
        await db
          .update(walletTransactions)
          .set({
            ledgerTransactionId: ledgerTx.transaction.id,
          })
          .where(eq(walletTransactions.id, transaction.id));
      }

      return {
        transaction,
        newBalance: balanceAfter.toFixed(2),
      };
    } catch (error) {
      console.error('Error deducting credits:', error);
      throw error;
    }
  }

  /**
   * Lock credits (for pending transactions)
   */
  async lockCredits(userId: number, amount: string, description: string) {
    try {
      const lockAmount = parseFloat(amount);
      if (lockAmount <= 0) {
        throw new Error('Lock amount must be greater than 0');
      }

      const wallet = await this.getWalletByUserId(userId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const availableBalance = parseFloat(wallet.availableBalance);
      if (lockAmount > availableBalance) {
        throw new Error(`Insufficient balance to lock. Available: ${availableBalance}, Required: ${lockAmount}`);
      }

      const newLockedBalance = parseFloat(wallet.lockedBalance) + lockAmount;

      await db
        .update(userWallets)
        .set({
          lockedBalance: newLockedBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(userWallets.userId, userId));

      return {
        lockedAmount: lockAmount.toFixed(2),
        totalLocked: newLockedBalance.toFixed(2),
      };
    } catch (error) {
      console.error('Error locking credits:', error);
      throw error;
    }
  }

  /**
   * Unlock credits
   */
  async unlockCredits(userId: number, amount: string) {
    try {
      const unlockAmount = parseFloat(amount);
      if (unlockAmount <= 0) {
        throw new Error('Unlock amount must be greater than 0');
      }

      const wallet = await this.getWalletByUserId(userId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const currentLocked = parseFloat(wallet.lockedBalance);
      if (unlockAmount > currentLocked) {
        throw new Error(`Cannot unlock more than locked amount. Locked: ${currentLocked}, Unlock: ${unlockAmount}`);
      }

      const newLockedBalance = currentLocked - unlockAmount;

      await db
        .update(userWallets)
        .set({
          lockedBalance: newLockedBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(userWallets.userId, userId));

      return {
        unlockedAmount: unlockAmount.toFixed(2),
        totalLocked: newLockedBalance.toFixed(2),
      };
    } catch (error) {
      console.error('Error unlocking credits:', error);
      throw error;
    }
  }

  /**
   * Get wallet transaction history
   */
  async getTransactionHistory(
    userId: number,
    page: number = 1,
    limit: number = 50,
    fromDate?: Date,
    toDate?: Date,
    type?: string
  ): Promise<WalletTransactionHistory> {
    try {
      const wallet = await this.getWalletByUserId(userId);
      if (!wallet) {
        return {
          transactions: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }

      let query = db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.walletId, wallet.walletId))
        .orderBy(desc(walletTransactions.createdAt));

      // Apply filters
      const conditions = [eq(walletTransactions.walletId, wallet.walletId)];

      if (fromDate) {
        conditions.push(gte(walletTransactions.createdAt, fromDate));
      }

      if (toDate) {
        conditions.push(lte(walletTransactions.createdAt, toDate));
      }

      if (type) {
        conditions.push(eq(walletTransactions.type, type));
      }

      query = query.where(and(...conditions));

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(walletTransactions)
        .where(and(...conditions));

      // Get paginated results
      const offset = (page - 1) * limit;
      const transactions = await query.limit(limit).offset(offset);

      return {
        transactions: transactions.map(tx => ({
          id: tx.id,
          uid: tx.uid,
          type: tx.type,
          amount: tx.amount,
          balanceBefore: tx.balanceBefore,
          balanceAfter: tx.balanceAfter,
          status: tx.status,
          description: tx.description,
          referenceType: tx.referenceType,
          referenceId: tx.referenceId,
          createdAt: tx.createdAt,
        })),
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * Refund credits
   */
  async refundCredits(data: AddCreditsData) {
    const refundData: AddCreditsData = {
      ...data,
      description: `Refund: ${data.description}`,
    };

    return await this.addCredits(refundData);
  }

  /**
   * Get wallet statistics
   */
  async getWalletStatistics(userId: number, fromDate?: Date, toDate?: Date) {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) {
      return null;
    }

    const conditions = [eq(walletTransactions.walletId, wallet.walletId)];

    if (fromDate) {
      conditions.push(gte(walletTransactions.createdAt, fromDate));
    }

    if (toDate) {
      conditions.push(lte(walletTransactions.createdAt, toDate));
    }

    const [stats] = await db
      .select({
        totalCredits: sql<string>`COALESCE(SUM(CASE WHEN type = 'credit' THEN CAST(amount AS NUMERIC) ELSE 0 END), 0)`,
        totalDebits: sql<string>`COALESCE(SUM(CASE WHEN type = 'debit' THEN CAST(amount AS NUMERIC) ELSE 0 END), 0)`,
        totalRefunds: sql<string>`COALESCE(SUM(CASE WHEN type = 'refund' THEN CAST(amount AS NUMERIC) ELSE 0 END), 0)`,
        transactionCount: sql<number>`COUNT(*)`,
      })
      .from(walletTransactions)
      .where(and(...conditions));

    return {
      currentBalance: wallet.balance,
      lockedBalance: wallet.lockedBalance,
      availableBalance: wallet.availableBalance,
      currency: wallet.currency,
      statistics: {
        totalCredits: stats.totalCredits,
        totalDebits: stats.totalDebits,
        totalRefunds: stats.totalRefunds,
        transactionCount: stats.transactionCount,
        netChange: (parseFloat(stats.totalCredits) - parseFloat(stats.totalDebits)).toFixed(2),
      },
    };
  }
}

export const walletService = new WalletService();
