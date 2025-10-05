import { db } from '../db';
import { creditAccountRepository } from '../repositories/credit-account-repository';
import { creditTransactionRepository } from '../repositories/credit-transaction-repository';
import { InsufficientBalanceError, TransactionFilters, CreateCreditTransactionData } from '../types';

export class CreditTransactionService {
  async addCredits(
    userId: number,
    amount: number,
    referenceType: string,
    referenceId: string,
    description?: string,
    metadata?: any
  ) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    return await db.transaction(async (tx) => {
      // Get account
      const account = await creditAccountRepository.findByUserId(userId);
      if (!account) {
        throw new Error('Credit account not found');
      }

      // Lock account
      const lockedAccount = await creditAccountRepository.lockForUpdate(account.id, tx);

      const balanceBefore = parseFloat(lockedAccount.balance);
      const balanceAfter = balanceBefore + amount;

      // Update balance
      await creditAccountRepository.updateBalance(account.id, amount, 0, tx);

      // Update totals
      await creditAccountRepository.updateTotals(account.id, amount, 0, tx);

      // Create transaction record
      const transactionData: CreateCreditTransactionData = {
        creditAccountId: account.id,
        type: 'credit',
        amount: amount.toString(),
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        referenceType,
        referenceId,
        description,
        metadata,
        status: 'completed',
      };

      const transaction = await creditTransactionRepository.create(transactionData, tx);

      return transaction;
    });
  }

  async deductCredits(
    userId: number,
    amount: number,
    referenceType: string,
    referenceId: string,
    description?: string,
    metadata?: any
  ) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    return await db.transaction(async (tx) => {
      // Get account
      const account = await creditAccountRepository.findByUserId(userId);
      if (!account) {
        throw new Error('Credit account not found');
      }

      // Lock account
      const lockedAccount = await creditAccountRepository.lockForUpdate(account.id, tx);

      const balanceBefore = parseFloat(lockedAccount.balance);

      // Check sufficient balance
      if (balanceBefore < amount) {
        throw new InsufficientBalanceError(
          `Insufficient balance. Available: ${balanceBefore}, Required: ${amount}`
        );
      }

      const balanceAfter = balanceBefore - amount;

      // Update balance
      await creditAccountRepository.updateBalance(account.id, -amount, 0, tx);

      // Update totals
      await creditAccountRepository.updateTotals(account.id, 0, amount, tx);

      // Create transaction record
      const transactionData: CreateCreditTransactionData = {
        creditAccountId: account.id,
        type: 'debit',
        amount: amount.toString(),
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        referenceType,
        referenceId,
        description,
        metadata,
        status: 'completed',
      };

      const transaction = await creditTransactionRepository.create(transactionData, tx);

      return transaction;
    });
  }

  async refundCredits(
    userId: number,
    amount: number,
    referenceType: string,
    referenceId: string,
    description?: string
  ) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    return await db.transaction(async (tx) => {
      // Get account
      const account = await creditAccountRepository.findByUserId(userId);
      if (!account) {
        throw new Error('Credit account not found');
      }

      // Lock account
      const lockedAccount = await creditAccountRepository.lockForUpdate(account.id, tx);

      const balanceBefore = parseFloat(lockedAccount.balance);
      const balanceAfter = balanceBefore + amount;

      // Update balance
      await creditAccountRepository.updateBalance(account.id, amount, 0, tx);

      // Create transaction record
      const transactionData: CreateCreditTransactionData = {
        creditAccountId: account.id,
        type: 'refund',
        amount: amount.toString(),
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        referenceType,
        referenceId,
        description: description || 'Refund',
        status: 'completed',
      };

      const transaction = await creditTransactionRepository.create(transactionData, tx);

      return transaction;
    });
  }

  async adjustCredits(
    userId: number,
    amount: number,
    reason: string,
    adminUserId: number
  ) {
    return await db.transaction(async (tx) => {
      // Get account
      const account = await creditAccountRepository.findByUserId(userId);
      if (!account) {
        throw new Error('Credit account not found');
      }

      // Lock account
      const lockedAccount = await creditAccountRepository.lockForUpdate(account.id, tx);

      const balanceBefore = parseFloat(lockedAccount.balance);
      const balanceAfter = balanceBefore + amount;

      // Check for negative balance after adjustment
      if (balanceAfter < 0) {
        throw new Error('Adjustment would result in negative balance');
      }

      // Update balance
      await creditAccountRepository.updateBalance(account.id, amount, 0, tx);

      // Update totals based on whether it's addition or subtraction
      if (amount > 0) {
        await creditAccountRepository.updateTotals(account.id, amount, 0, tx);
      } else {
        await creditAccountRepository.updateTotals(account.id, 0, Math.abs(amount), tx);
      }

      // Create transaction record
      const transactionData: CreateCreditTransactionData = {
        creditAccountId: account.id,
        type: 'adjustment',
        amount: Math.abs(amount).toString(),
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        referenceType: 'admin_adjustment',
        referenceId: adminUserId.toString(),
        description: reason,
        metadata: { adminUserId },
        status: 'completed',
      };

      const transaction = await creditTransactionRepository.create(transactionData, tx);

      return transaction;
    });
  }

  async getTransactions(userId: number, filters?: TransactionFilters) {
    const account = await creditAccountRepository.findByUserId(userId);
    if (!account) {
      throw new Error('Credit account not found');
    }

    return await creditTransactionRepository.findByAccount(account.id, filters);
  }

  async getTransaction(uid: string) {
    return await creditTransactionRepository.findByUid(uid);
  }

  async getSummary(userId: number, fromDate?: Date, toDate?: Date) {
    const account = await creditAccountRepository.findByUserId(userId);
    if (!account) {
      throw new Error('Credit account not found');
    }

    return await creditTransactionRepository.getSummary(account.id, fromDate, toDate);
  }

  async reverseTransaction(transactionId: number, reason: string) {
    // Get original transaction
    const originalTx = await creditTransactionRepository.findByUid(transactionId.toString());
    if (!originalTx) {
      throw new Error('Transaction not found');
    }

    if (originalTx.status === 'reversed') {
      throw new Error('Transaction already reversed');
    }

    // Create reversal transaction
    const amount = parseFloat(originalTx.amount);
    const isCredit = originalTx.type === 'credit' || originalTx.type === 'refund';

    return await db.transaction(async (tx) => {
      // Lock account
      const account = await creditAccountRepository.lockForUpdate(originalTx.creditAccountId, tx);

      const balanceBefore = parseFloat(account.balance);
      const balanceAfter = isCredit ? balanceBefore - amount : balanceBefore + amount;

      // Update balance (reverse the original operation)
      await creditAccountRepository.updateBalance(
        originalTx.creditAccountId,
        isCredit ? -amount : amount,
        0,
        tx
      );

      // Create reversal transaction
      const reversalData: CreateCreditTransactionData = {
        creditAccountId: originalTx.creditAccountId,
        type: originalTx.type,
        amount: amount.toString(),
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        referenceType: 'reversal',
        referenceId: originalTx.uid,
        description: `Reversal of transaction ${originalTx.uid}: ${reason}`,
        status: 'completed',
      };

      const reversalTx = await creditTransactionRepository.create(reversalData, tx);

      // Mark original as reversed
      await creditTransactionRepository.reverseTransaction(originalTx.id, reversalTx.id);

      return reversalTx;
    });
  }
}

export const creditTransactionService = new CreditTransactionService();
