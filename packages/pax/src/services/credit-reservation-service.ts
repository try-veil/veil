import { db } from '../db';
import { creditAccountRepository } from '../repositories/credit-account-repository';
import { creditTransactionRepository } from '../repositories/credit-transaction-repository';
import { creditReservationRepository } from '../repositories/credit-reservation-repository';
import {
  InsufficientBalanceError,
  ReservationNotFoundError,
  InvalidReservationStatusError,
  CreateCreditTransactionData,
} from '../types';

export class CreditReservationService {
  async reserveCredits(
    userId: number,
    amount: number,
    purpose: string,
    referenceType: string,
    referenceId: string,
    expiresInMinutes: number = 5
  ) {
    console.log(`💳 reserveCredits called - userId: ${userId}, amount: ${amount}`);
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    console.log(`🔐 Starting transaction for credit reservation...`);
    return await db.transaction(async (tx) => {
      // Get account
      console.log(`👤 Looking up credit account for user ${userId}...`);
      const account = await creditAccountRepository.findByUserId(userId);
      console.log(`📋 Account found:`, account ? `ID: ${account.id}, Balance: ${account.balance}` : 'null');
      if (!account) {
        throw new Error('Credit account not found');
      }

      // Lock account
      console.log(`🔒 About to call lockForUpdate for account ${account.id}...`);
      const lockedAccount = await creditAccountRepository.lockForUpdate(account.id, tx);
      console.log(`✅ Lock acquired! Locked account balance: ${lockedAccount.balance}`);

      const balanceBefore = parseFloat(lockedAccount.balance);
      const reservedBalanceBefore = parseFloat(lockedAccount.reservedBalance);

      // Check sufficient balance
      if (balanceBefore < amount) {
        throw new InsufficientBalanceError(
          `Insufficient balance. Available: ${balanceBefore}, Required: ${amount}`
        );
      }

      // Move credits from balance to reserved
      console.log(`💸 About to update balance - deducting ${amount} from balance, adding to reserved...`);
      await creditAccountRepository.updateBalance(account.id, -amount, amount, tx);
      console.log(`✅ Balance updated successfully`);

      // Create reserve transaction
      console.log(`📝 About to create reserve transaction...`);

      const transactionData: CreateCreditTransactionData = {
        creditAccountId: account.id,
        type: 'reserve',
        amount: amount.toString(),
        balanceBefore: balanceBefore.toString(),
        balanceAfter: (balanceBefore - amount).toString(),
        reservedBalanceBefore: reservedBalanceBefore.toString(),
        reservedBalanceAfter: (reservedBalanceBefore + amount).toString(),
        referenceType,
        referenceId,
        description: `Reserve credits for ${purpose}`,
        status: 'completed',
      };

      const transaction = await creditTransactionRepository.create(transactionData, tx);

      // Create reservation record
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      const reservation = await creditReservationRepository.create(
        {
          creditAccountId: account.id,
          transactionId: transaction.id,
          amount: amount.toString(),
          purpose,
          referenceType,
          referenceId,
          expiresAt,
        },
        tx
      );

      return reservation;
    });
  }

  async settleReservation(reservationUid: string, actualAmount: number) {
    if (actualAmount < 0) {
      throw new Error('Actual amount cannot be negative');
    }

    return await db.transaction(async (tx) => {
      // Lock reservation
      const reservation = await creditReservationRepository.lockForUpdate(reservationUid, tx);

      if (!reservation) {
        throw new ReservationNotFoundError('Reservation not found');
      }

      if (reservation.status !== 'active') {
        throw new InvalidReservationStatusError(
          `Cannot settle reservation with status: ${reservation.status}`
        );
      }

      const reservedAmount = parseFloat(reservation.amount);

      if (actualAmount > reservedAmount) {
        throw new Error(
          `Actual amount (${actualAmount}) cannot exceed reserved amount (${reservedAmount})`
        );
      }

      // Lock account
      const account = await creditAccountRepository.lockForUpdate(reservation.creditAccountId, tx);

      const reservedBalanceBefore = parseFloat(account.reservedBalance);
      const balanceBefore = parseFloat(account.balance);

      let debitTransaction = null;
      let releaseTransaction = null;

      // Deduct actual amount from reserved balance
      if (actualAmount > 0) {
        await creditAccountRepository.updateBalance(
          reservation.creditAccountId,
          0,
          -actualAmount,
          tx
        );

        // Update totals (actual spend)
        await creditAccountRepository.updateTotals(reservation.creditAccountId, 0, actualAmount, tx);

        // Create debit transaction
        const debitData: CreateCreditTransactionData = {
          creditAccountId: reservation.creditAccountId,
          type: 'debit',
          amount: actualAmount.toString(),
          balanceBefore: balanceBefore.toString(),
          balanceAfter: balanceBefore.toString(),
          reservedBalanceBefore: reservedBalanceBefore.toString(),
          reservedBalanceAfter: (reservedBalanceBefore - actualAmount).toString(),
          referenceType: reservation.referenceType || undefined,
          referenceId: reservation.referenceId || undefined,
          description: `Settlement of reservation ${reservationUid}`,
          status: 'completed',
        };

        debitTransaction = await creditTransactionRepository.create(debitData, tx);
      }

      // If actual amount is less than reserved, release the difference
      const difference = reservedAmount - actualAmount;
      if (difference > 0) {
        // Return difference from reserved to available
        await creditAccountRepository.updateBalance(
          reservation.creditAccountId,
          difference,
          -difference,
          tx
        );

        // Create release transaction
        const releaseData: CreateCreditTransactionData = {
          creditAccountId: reservation.creditAccountId,
          type: 'release',
          amount: difference.toString(),
          balanceBefore: balanceBefore.toString(),
          balanceAfter: (balanceBefore + difference).toString(),
          reservedBalanceBefore: (reservedBalanceBefore - actualAmount).toString(),
          reservedBalanceAfter: (reservedBalanceBefore - reservedAmount).toString(),
          referenceType: reservation.referenceType || undefined,
          referenceId: reservation.referenceId || undefined,
          description: `Release unused credits from reservation ${reservationUid}`,
          status: 'completed',
        };

        releaseTransaction = await creditTransactionRepository.create(releaseData, tx);
      }

      // Update reservation status
      await creditReservationRepository.updateStatus(
        reservation.id,
        'settled',
        {
          settledAmount: actualAmount.toString(),
          settledAt: new Date(),
          settleTransactionId: debitTransaction?.id,
          releasedAmount: difference > 0 ? difference.toString() : undefined,
          releasedAt: difference > 0 ? new Date() : undefined,
          releaseTransactionId: releaseTransaction?.id,
        },
        tx
      );

      return {
        debitTransaction,
        releaseTransaction,
      };
    });
  }

  async releaseReservation(reservationUid: string) {
    return await db.transaction(async (tx) => {
      // Lock reservation
      const reservation = await creditReservationRepository.lockForUpdate(reservationUid, tx);

      if (!reservation) {
        throw new ReservationNotFoundError('Reservation not found');
      }

      if (reservation.status !== 'active') {
        throw new InvalidReservationStatusError(
          `Cannot release reservation with status: ${reservation.status}`
        );
      }

      const reservedAmount = parseFloat(reservation.amount);

      // Lock account
      const account = await creditAccountRepository.lockForUpdate(reservation.creditAccountId, tx);

      const balanceBefore = parseFloat(account.balance);
      const reservedBalanceBefore = parseFloat(account.reservedBalance);

      // Return credits from reserved to available
      await creditAccountRepository.updateBalance(
        reservation.creditAccountId,
        reservedAmount,
        -reservedAmount,
        tx
      );

      // Create release transaction
      const releaseData: CreateCreditTransactionData = {
        creditAccountId: reservation.creditAccountId,
        type: 'release',
        amount: reservedAmount.toString(),
        balanceBefore: balanceBefore.toString(),
        balanceAfter: (balanceBefore + reservedAmount).toString(),
        reservedBalanceBefore: reservedBalanceBefore.toString(),
        reservedBalanceAfter: (reservedBalanceBefore - reservedAmount).toString(),
        referenceType: reservation.referenceType || undefined,
        referenceId: reservation.referenceId || undefined,
        description: `Release reservation ${reservationUid}`,
        status: 'completed',
      };

      const releaseTransaction = await creditTransactionRepository.create(releaseData, tx);

      // Update reservation status
      await creditReservationRepository.updateStatus(
        reservation.id,
        'released',
        {
          releasedAmount: reservedAmount.toString(),
          releasedAt: new Date(),
          releaseTransactionId: releaseTransaction.id,
        },
        tx
      );

      return releaseTransaction;
    });
  }

  async getReservation(uid: string) {
    return await creditReservationRepository.findByUid(uid);
  }

  async getActiveReservations(userId: number) {
    const account = await creditAccountRepository.findByUserId(userId);
    if (!account) {
      throw new Error('Credit account not found');
    }

    return await creditReservationRepository.findActiveByAccount(account.id);
  }

  async cleanupExpiredReservations() {
    const expired = await creditReservationRepository.findExpired();

    let releasedCount = 0;

    for (const reservation of expired) {
      try {
        await this.releaseReservation(reservation.uid);
        releasedCount++;
      } catch (error) {
        console.error(`Failed to release expired reservation ${reservation.uid}:`, error);
        // Mark as expired even if release fails
        await db.transaction(async (tx) => {
          await creditReservationRepository.updateStatus(
            reservation.id,
            'expired',
            {},
            tx
          );
        });
      }
    }

    return releasedCount;
  }
}

export const creditReservationService = new CreditReservationService();
