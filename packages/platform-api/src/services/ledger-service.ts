import { db } from '../db';
import { ledgerAccounts, ledgerTransactions, ledgerEntries, users } from '../db/schema';
import { eq, and, sql, desc, gte, lte, inArray } from 'drizzle-orm';

export interface CreateLedgerAccountData {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subtype?: string;
  parentAccountId?: number;
  normalBalance: 'debit' | 'credit';
  currency?: string;
  isSystemAccount?: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

export interface LedgerEntryData {
  accountId: number;
  entryType: 'debit' | 'credit';
  amount: string;
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreateLedgerTransactionData {
  transactionDate: Date;
  type: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  userId?: number;
  createdBy?: number;
  entries: LedgerEntryData[];
  metadata?: Record<string, any>;
}

export interface AccountBalance {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: 'debit' | 'credit';
  balance: string;
  currency: string;
}

export interface TrialBalance {
  accounts: Array<{
    code: string;
    name: string;
    type: string;
    debit: string;
    credit: string;
  }>;
  totalDebits: string;
  totalCredits: string;
  isBalanced: boolean;
  asOfDate: Date;
}

export class LedgerService {
  /**
   * Create a new ledger account
   */
  async createAccount(data: CreateLedgerAccountData) {
    try {
      const [account] = await db.insert(ledgerAccounts).values({
        code: data.code,
        name: data.name,
        type: data.type,
        subtype: data.subtype,
        parentAccountId: data.parentAccountId,
        normalBalance: data.normalBalance,
        currency: data.currency || 'INR',
        isSystemAccount: data.isSystemAccount || false,
        description: data.description,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      }).returning();

      return account;
    } catch (error) {
      console.error('Error creating ledger account:', error);
      throw error;
    }
  }

  /**
   * Get account by ID
   */
  async getAccountById(accountId: number) {
    const [account] = await db
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.id, accountId));

    return account;
  }

  /**
   * Get account by code
   */
  async getAccountByCode(code: string) {
    const [account] = await db
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.code, code));

    return account;
  }

  /**
   * Get all active accounts
   */
  async getAllAccounts(type?: string) {
    const query = db
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.isActive, true));

    if (type) {
      return await query.where(eq(ledgerAccounts.type, type));
    }

    return await query;
  }

  /**
   * Create a ledger transaction with entries (double-entry bookkeeping)
   */
  async createTransaction(data: CreateLedgerTransactionData) {
    try {
      // Validate that debits equal credits
      const totalDebits = data.entries
        .filter(e => e.entryType === 'debit')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

      const totalCredits = data.entries
        .filter(e => e.entryType === 'credit')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(
          `Transaction not balanced: Debits (${totalDebits}) != Credits (${totalCredits})`
        );
      }

      // Generate transaction number
      const transactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      // Create transaction header
      const [transaction] = await db.insert(ledgerTransactions).values({
        transactionNumber,
        transactionDate: data.transactionDate,
        type: data.type,
        description: data.description,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        userId: data.userId,
        createdBy: data.createdBy,
        status: 'posted',
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      }).returning();

      // Create ledger entries
      const entries = await Promise.all(
        data.entries.map(async (entryData) => {
          const [entry] = await db.insert(ledgerEntries).values({
            transactionId: transaction.id,
            accountId: entryData.accountId,
            entryType: entryData.entryType,
            amount: entryData.amount,
            currency: entryData.currency || 'INR',
            description: entryData.description,
            metadata: entryData.metadata ? JSON.stringify(entryData.metadata) : null,
          }).returning();

          return entry;
        })
      );

      return {
        transaction,
        entries,
      };
    } catch (error) {
      console.error('Error creating ledger transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID with entries
   */
  async getTransactionById(transactionId: number) {
    const [transaction] = await db
      .select()
      .from(ledgerTransactions)
      .where(eq(ledgerTransactions.id, transactionId));

    if (!transaction) {
      return null;
    }

    const entries = await db
      .select({
        id: ledgerEntries.id,
        uid: ledgerEntries.uid,
        accountId: ledgerEntries.accountId,
        accountCode: ledgerAccounts.code,
        accountName: ledgerAccounts.name,
        entryType: ledgerEntries.entryType,
        amount: ledgerEntries.amount,
        currency: ledgerEntries.currency,
        description: ledgerEntries.description,
        metadata: ledgerEntries.metadata,
        createdAt: ledgerEntries.createdAt,
      })
      .from(ledgerEntries)
      .innerJoin(ledgerAccounts, eq(ledgerEntries.accountId, ledgerAccounts.id))
      .where(eq(ledgerEntries.transactionId, transactionId));

    return {
      transaction,
      entries,
    };
  }

  /**
   * Get transactions by reference
   */
  async getTransactionsByReference(referenceType: string, referenceId: string) {
    return await db
      .select()
      .from(ledgerTransactions)
      .where(
        and(
          eq(ledgerTransactions.referenceType, referenceType),
          eq(ledgerTransactions.referenceId, referenceId)
        )
      )
      .orderBy(desc(ledgerTransactions.transactionDate));
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: number, asOfDate?: Date): Promise<AccountBalance> {
    const account = await this.getAccountById(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Build query for entries
    let query = db
      .select({
        entryType: ledgerEntries.entryType,
        amount: ledgerEntries.amount,
      })
      .from(ledgerEntries)
      .innerJoin(ledgerTransactions, eq(ledgerEntries.transactionId, ledgerTransactions.id))
      .where(
        and(
          eq(ledgerEntries.accountId, accountId),
          eq(ledgerTransactions.status, 'posted')
        )
      );

    if (asOfDate) {
      query = query.where(lte(ledgerTransactions.transactionDate, asOfDate));
    }

    const entries = await query;

    // Calculate balance based on normal balance type
    let balance = 0;
    for (const entry of entries) {
      const amount = parseFloat(entry.amount);
      if (account.normalBalance === 'debit') {
        balance += entry.entryType === 'debit' ? amount : -amount;
      } else {
        balance += entry.entryType === 'credit' ? amount : -amount;
      }
    }

    return {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      normalBalance: account.normalBalance,
      balance: balance.toFixed(2),
      currency: account.currency,
    };
  }

  /**
   * Get trial balance
   */
  async getTrialBalance(asOfDate: Date = new Date()): Promise<TrialBalance> {
    const accounts = await this.getAllAccounts();
    const accountBalances = await Promise.all(
      accounts.map(account => this.getAccountBalance(account.id, asOfDate))
    );

    let totalDebits = 0;
    let totalCredits = 0;

    const trialBalanceAccounts = accountBalances.map(ab => {
      const balance = parseFloat(ab.balance);
      const debit = ab.normalBalance === 'debit' && balance >= 0 ? balance :
                   ab.normalBalance === 'credit' && balance < 0 ? Math.abs(balance) : 0;
      const credit = ab.normalBalance === 'credit' && balance >= 0 ? balance :
                    ab.normalBalance === 'debit' && balance < 0 ? Math.abs(balance) : 0;

      totalDebits += debit;
      totalCredits += credit;

      return {
        code: ab.accountCode,
        name: ab.accountName,
        type: ab.accountType,
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
      };
    });

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    return {
      accounts: trialBalanceAccounts,
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      isBalanced,
      asOfDate,
    };
  }

  /**
   * Void a transaction
   */
  async voidTransaction(transactionId: number, voidedBy: number, voidReason: string) {
    try {
      const [transaction] = await db
        .update(ledgerTransactions)
        .set({
          status: 'voided',
          voidedBy,
          voidedAt: new Date(),
          voidReason,
          updatedAt: new Date(),
        })
        .where(eq(ledgerTransactions.id, transactionId))
        .returning();

      return transaction;
    } catch (error) {
      console.error('Error voiding transaction:', error);
      throw error;
    }
  }

  /**
   * Get account ledger (transaction history)
   */
  async getAccountLedger(
    accountId: number,
    fromDate?: Date,
    toDate?: Date,
    limit: number = 100
  ) {
    let query = db
      .select({
        entryId: ledgerEntries.id,
        entryUid: ledgerEntries.uid,
        transactionId: ledgerTransactions.id,
        transactionUid: ledgerTransactions.uid,
        transactionNumber: ledgerTransactions.transactionNumber,
        transactionDate: ledgerTransactions.transactionDate,
        transactionType: ledgerTransactions.type,
        transactionDescription: ledgerTransactions.description,
        entryType: ledgerEntries.entryType,
        amount: ledgerEntries.amount,
        currency: ledgerEntries.currency,
        entryDescription: ledgerEntries.description,
        status: ledgerTransactions.status,
      })
      .from(ledgerEntries)
      .innerJoin(ledgerTransactions, eq(ledgerEntries.transactionId, ledgerTransactions.id))
      .where(eq(ledgerEntries.accountId, accountId))
      .orderBy(desc(ledgerTransactions.transactionDate))
      .limit(limit);

    if (fromDate) {
      query = query.where(gte(ledgerTransactions.transactionDate, fromDate));
    }

    if (toDate) {
      query = query.where(lte(ledgerTransactions.transactionDate, toDate));
    }

    return await query;
  }

  /**
   * Initialize system accounts (should be run once during setup)
   */
  async initializeSystemAccounts() {
    const systemAccounts: CreateLedgerAccountData[] = [
      // Assets
      {
        code: '1000',
        name: 'Cash and Bank',
        type: 'asset',
        subtype: 'current_asset',
        normalBalance: 'debit',
        isSystemAccount: true,
        description: 'Cash and bank accounts',
      },
      {
        code: '1100',
        name: 'Razorpay Payment Gateway',
        type: 'asset',
        subtype: 'current_asset',
        normalBalance: 'debit',
        isSystemAccount: true,
        description: 'Razorpay payment gateway account',
      },
      {
        code: '1200',
        name: 'Accounts Receivable',
        type: 'asset',
        subtype: 'current_asset',
        normalBalance: 'debit',
        isSystemAccount: true,
        description: 'Money owed to us',
      },
      {
        code: '1300',
        name: 'User Wallets',
        type: 'asset',
        subtype: 'current_asset',
        normalBalance: 'debit',
        isSystemAccount: true,
        description: 'User credit wallets (contra-liability)',
      },

      // Liabilities
      {
        code: '2000',
        name: 'Accounts Payable',
        type: 'liability',
        subtype: 'current_liability',
        normalBalance: 'credit',
        isSystemAccount: true,
        description: 'Money we owe',
      },
      {
        code: '2100',
        name: 'User Credit Liability',
        type: 'liability',
        subtype: 'current_liability',
        normalBalance: 'credit',
        isSystemAccount: true,
        description: 'Liability for user wallet credits',
      },
      {
        code: '2200',
        name: 'Unearned Revenue',
        type: 'liability',
        subtype: 'current_liability',
        normalBalance: 'credit',
        isSystemAccount: true,
        description: 'Prepayments and credits purchased',
      },

      // Equity
      {
        code: '3000',
        name: 'Retained Earnings',
        type: 'equity',
        normalBalance: 'credit',
        isSystemAccount: true,
        description: 'Accumulated profits',
      },

      // Revenue
      {
        code: '4000',
        name: 'API Subscription Revenue',
        type: 'revenue',
        normalBalance: 'credit',
        isSystemAccount: true,
        description: 'Revenue from API subscriptions',
      },
      {
        code: '4100',
        name: 'Credit Purchase Revenue',
        type: 'revenue',
        normalBalance: 'credit',
        isSystemAccount: true,
        description: 'Revenue from credit purchases',
      },
      {
        code: '4200',
        name: 'Payment Gateway Fees Revenue',
        type: 'revenue',
        normalBalance: 'credit',
        isSystemAccount: true,
        description: 'Revenue from payment processing fees',
      },

      // Expenses
      {
        code: '5000',
        name: 'Payment Gateway Fees',
        type: 'expense',
        normalBalance: 'debit',
        isSystemAccount: true,
        description: 'Razorpay and other gateway fees',
      },
      {
        code: '5100',
        name: 'API Provider Costs',
        type: 'expense',
        normalBalance: 'debit',
        isSystemAccount: true,
        description: 'Costs paid to API providers',
      },
      {
        code: '5200',
        name: 'Refunds and Adjustments',
        type: 'expense',
        normalBalance: 'debit',
        isSystemAccount: true,
        description: 'Customer refunds and credit adjustments',
      },
    ];

    const createdAccounts = [];
    for (const accountData of systemAccounts) {
      try {
        // Check if account already exists
        const existing = await this.getAccountByCode(accountData.code);
        if (!existing) {
          const account = await this.createAccount(accountData);
          createdAccounts.push(account);
          console.log(`Created system account: ${accountData.code} - ${accountData.name}`);
        }
      } catch (error) {
        console.error(`Failed to create account ${accountData.code}:`, error);
      }
    }

    return createdAccounts;
  }
}

export const ledgerService = new LedgerService();
