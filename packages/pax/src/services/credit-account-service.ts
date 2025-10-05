import { creditAccountRepository } from '../repositories/credit-account-repository';
import { BalanceInfo, AccountSettings, AccountSuspendedError } from '../types';

export class CreditAccountService {
  async createAccount(userId: number, currency: string = 'INR') {
    return await creditAccountRepository.create(userId, currency);
  }

  async getAccount(userId: number) {
    return await creditAccountRepository.findByUserId(userId);
  }

  async getAccountByUid(uid: string) {
    return await creditAccountRepository.findByUid(uid);
  }

  async getOrCreateAccount(userId: number, currency: string = 'INR') {
    return await creditAccountRepository.getOrCreate(userId, currency);
  }

  async getBalance(userId: number): Promise<BalanceInfo> {
    const account = await creditAccountRepository.findByUserId(userId);

    if (!account) {
      throw new Error('Credit account not found');
    }

    const balance = parseFloat(account.balance);
    const reservedBalance = parseFloat(account.reservedBalance);
    const availableBalance = balance;
    const lowBalanceThreshold = parseFloat(account.lowBalanceThreshold || '0');

    return {
      balance,
      reservedBalance,
      availableBalance,
      currency: account.currency,
      lowBalanceThreshold,
      isLowBalance: balance < lowBalanceThreshold,
    };
  }

  async getAvailableBalance(userId: number): Promise<number> {
    const account = await creditAccountRepository.findByUserId(userId);
    if (!account) {
      throw new Error('Credit account not found');
    }
    return parseFloat(account.balance);
  }

  async getTotalBalance(userId: number): Promise<number> {
    const account = await creditAccountRepository.findByUserId(userId);
    if (!account) {
      throw new Error('Credit account not found');
    }
    return parseFloat(account.balance) + parseFloat(account.reservedBalance);
  }

  async updateSettings(userId: number, settings: AccountSettings) {
    const account = await creditAccountRepository.findByUserId(userId);
    if (!account) {
      throw new Error('Credit account not found');
    }

    return await creditAccountRepository.updateSettings(account.id, settings);
  }

  async suspendAccount(userId: number, reason: string) {
    const account = await creditAccountRepository.findByUserId(userId);
    if (!account) {
      throw new Error('Credit account not found');
    }

    return await creditAccountRepository.suspend(account.id, reason);
  }

  async unsuspendAccount(userId: number) {
    const account = await creditAccountRepository.findByUserId(userId);
    if (!account) {
      throw new Error('Credit account not found');
    }

    return await creditAccountRepository.unsuspend(account.id);
  }

  async isAccountActive(userId: number): Promise<boolean> {
    const account = await creditAccountRepository.findByUserId(userId);
    if (!account) {
      return false;
    }
    return account.isActive && !account.isSuspended;
  }

  async checkAccountActive(userId: number): Promise<void> {
    const account = await creditAccountRepository.findByUserId(userId);

    if (!account) {
      throw new Error('Credit account not found');
    }

    if (!account.isActive) {
      throw new Error('Credit account is inactive');
    }

    if (account.isSuspended) {
      throw new AccountSuspendedError(
        account.suspensionReason || 'Account is suspended'
      );
    }
  }
}

export const creditAccountService = new CreditAccountService();
