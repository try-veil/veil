import { Elysia } from 'elysia';
import { authMiddleware } from './auth';
import { creditAccountService } from '../services/credit-account-service';
import { InsufficientBalanceError, AccountSuspendedError } from '../types';

/**
 * Middleware to check if user has sufficient credits for an operation
 * Usage: .use(creditCheckMiddleware(minAmount))
 */
export function creditCheckMiddleware(minAmount: number) {
  return new Elysia()
    .use(authMiddleware)
    .derive(async ({ user, set }) => {
      // Check if account is active
      try {
        await creditAccountService.checkAccountActive(user.id);
      } catch (error) {
        if (error instanceof AccountSuspendedError) {
          set.status = 403;
          throw error;
        }
        throw error;
      }

      // Check balance
      const availableBalance = await creditAccountService.getAvailableBalance(user.id);

      if (availableBalance < minAmount) {
        set.status = 402; // Payment Required
        throw new InsufficientBalanceError(
          `Insufficient balance. Required: ${minAmount}, Available: ${availableBalance}`
        );
      }

      return {
        user,
        availableBalance,
      };
    });
}

/**
 * Middleware to ensure user has a credit account
 */
export const ensureCreditAccount = new Elysia()
  .use(authMiddleware)
  .derive(async ({ user }) => {
    const account = await creditAccountService.getOrCreateAccount(user.id);
    return {
      user,
      creditAccount: account,
    };
  });
