import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Wallet,
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionSubtype,
  WalletTransactionStatus,
  WalletTransactionReferenceType,
} from '../../entities/billing/types';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  /**
   * Convert Prisma Wallet to Entity Wallet
   */
  private mapToWallet(prismaWallet: any): Wallet {
    return {
      id: prismaWallet.id,
      customerId: prismaWallet.customerId,
      tenantId: prismaWallet.tenantId,
      balance: prismaWallet.balance,
      creditBalance: prismaWallet.creditBalance,
      currency: prismaWallet.currency,
      createdAt: prismaWallet.createdAt,
      updatedAt: prismaWallet.updatedAt,
    };
  }

  /**
   * Convert Prisma WalletTransaction to Entity WalletTransaction
   */
  private mapToWalletTransaction(prismaTransaction: any): WalletTransaction {
    return {
      id: prismaTransaction.id,
      walletId: prismaTransaction.walletId,
      tenantId: prismaTransaction.tenantId,
      customerId: prismaTransaction.customerId,
      type: prismaTransaction.type as WalletTransactionType,
      subtype: prismaTransaction.subtype as WalletTransactionSubtype,
      status: prismaTransaction.status as WalletTransactionStatus,
      amount: prismaTransaction.amount,
      creditsAvailable: prismaTransaction.creditsAvailable,
      expiryDate: prismaTransaction.expiryDate,
      description: prismaTransaction.description,
      referenceType:
        prismaTransaction.referenceType as WalletTransactionReferenceType,
      referenceId: prismaTransaction.referenceId,
      createdAt: prismaTransaction.createdAt,
      updatedAt: prismaTransaction.updatedAt,
    };
  }

  /**
   * Create a new wallet for a user
   */
  async createWallet(
    userId: string,
    initialBalance: number = 0,
  ): Promise<Wallet> {
    // Check if wallet already exists
    const existingWallet = await this.findWalletByUserId(userId);
    if (existingWallet) {
      throw new ConflictException(`Wallet already exists for user ${userId}`);
    }

    // Check if user exists - can be either internal ID or fusionAuthId
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { fusionAuthId: userId }],
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Find default tenant
    const defaultTenant = await this.prisma.tenant.findFirst({
      where: { slugifiedKey: 'default' },
    });

    if (!defaultTenant) {
      throw new NotFoundException('Default tenant not found');
    }

    // Use a transaction to create wallet and initial transaction
    const prismaWallet = await this.prisma.$transaction(async (prisma) => {
      // Create wallet
      const wallet = await prisma.wallet.create({
        data: {
          id: uuidv4(),
          customerId: user.id, // Always use the internal user ID
          tenantId: defaultTenant.id, // Use the actual tenant ID
          balance: initialBalance,
          creditBalance: initialBalance,
          currency: 'CREDITS',
        },
      });

      // If initial balance > 0, record a transaction
      if (initialBalance > 0) {
        await prisma.walletTransaction.create({
          data: {
            id: uuidv4(),
            walletId: wallet.id,
            tenantId: wallet.tenantId,
            customerId: wallet.customerId,
            type: WalletTransactionType.CREDIT,
            subtype: WalletTransactionSubtype.FREE,
            status: WalletTransactionStatus.COMPLETED,
            amount: initialBalance,
            description: 'Initial credit allocation',
            referenceType: WalletTransactionReferenceType.EXTERNAL,
            referenceId: 'SYSTEM',
          },
        });
      }

      return wallet;
    });

    return this.mapToWallet(prismaWallet);
  }

  /**
   * Find a wallet by user ID
   */
  async findWalletByUserId(userId: string): Promise<Wallet | null> {
    // First try to find the user by id or fusionAuthId
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { fusionAuthId: userId }],
      },
    });

    if (!user) {
      return null;
    }

    const wallet = await this.prisma.wallet.findFirst({
      where: {
        customerId: user.id,
      },
    });

    return wallet ? this.mapToWallet(wallet) : null;
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    return this.mapToWallet(wallet);
  }

  /**
   * Add credits to a wallet
   */
  async addCredits(
    walletId: string,
    amount: number,
    subtype: WalletTransactionSubtype = WalletTransactionSubtype.PAID,
    referenceType: WalletTransactionReferenceType = WalletTransactionReferenceType.EXTERNAL,
    referenceId: string = 'MANUAL',
    description: string = 'Credit addition',
  ): Promise<WalletTransaction> {
    const result = await this.prisma.$transaction(async (prisma) => {
      // Get wallet
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet with ID ${walletId} not found`);
      }

      // Create transaction
      const transaction = await prisma.walletTransaction.create({
        data: {
          id: uuidv4(),
          walletId: wallet.id,
          tenantId: wallet.tenantId,
          customerId: wallet.customerId,
          type: WalletTransactionType.CREDIT,
          subtype,
          amount,
          description,
          referenceType,
          referenceId,
        },
      });

      // Update wallet balance
      await prisma.wallet.update({
        where: { id: walletId },
        data: {
          balance: { increment: amount },
          creditBalance: { increment: amount },
        },
      });

      return transaction;
    });

    return this.mapToWalletTransaction(result);
  }

  /**
   * Deduct credits from a wallet
   */
  async deductCredits(
    walletId: string,
    amount: number,
    subtype: WalletTransactionSubtype = WalletTransactionSubtype.PAYMENT,
    referenceType: WalletTransactionReferenceType = WalletTransactionReferenceType.EXTERNAL,
    referenceId: string = 'API_USAGE',
    description: string = 'Credit deduction',
  ): Promise<WalletTransaction> {
    const result = await this.prisma.$transaction(async (prisma) => {
      // Get wallet
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet with ID ${walletId} not found`);
      }

      // Check if wallet has sufficient balance
      if (wallet.creditBalance < amount) {
        throw new BadRequestException('Insufficient credits');
      }

      // Create transaction
      const transaction = await prisma.walletTransaction.create({
        data: {
          id: uuidv4(),
          walletId: wallet.id,
          tenantId: wallet.tenantId,
          customerId: wallet.customerId,
          type: WalletTransactionType.DEBIT,
          subtype,
          amount,
          description,
          referenceType,
          referenceId,
        },
      });

      // Update wallet balance
      await prisma.wallet.update({
        where: { id: walletId },
        data: {
          balance: { decrement: amount },
          creditBalance: { decrement: amount },
        },
      });

      return transaction;
    });

    return this.mapToWalletTransaction(result);
  }

  /**
   * Check if a wallet has sufficient credits
   */
  async hasSufficientCredits(
    walletId: string,
    amount: number,
  ): Promise<boolean> {
    const wallet = await this.getWallet(walletId);
    return wallet.creditBalance >= amount;
  }

  /**
   * Get wallet transactions
   */
  async getTransactions(
    walletId: string,
    limit: number = 10,
    offset: number = 0,
    type?: WalletTransactionType,
  ): Promise<WalletTransaction[]> {
    // Ensure wallet exists
    await this.getWallet(walletId);

    // Build where clause
    const where: Prisma.WalletTransactionWhereInput = {
      walletId,
    };

    if (type) {
      where.type = type;
    }

    const transactions = await this.prisma.walletTransaction.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    });

    return transactions.map((t) => this.mapToWalletTransaction(t));
  }

  /**
   * Get wallet balance
   */
  async getBalance(walletId: string): Promise<number> {
    const wallet = await this.getWallet(walletId);
    return wallet.creditBalance;
  }

  /**
   * Find wallet by API key (for gateway authorization)
   */
  async findWalletByApiKey(apiKey: string): Promise<Wallet | null> {
    // In a real implementation, we'd have a table associating API keys with wallets
    // For now, use our simple method - in future this would be replaced with a proper lookup

    // Extract user ID from API key (assuming format like test_key_userId)
    const parts = apiKey.split('_');
    if (parts.length === 3 && parts[0] === 'test' && parts[1] === 'key') {
      const userId = parts[2];
      return this.findWalletByUserId(userId);
    }

    // Alternative: look for a wallet transaction with this API key as referenceId
    const transaction = await this.prisma.walletTransaction.findFirst({
      where: {
        referenceId: apiKey,
      },
      include: {
        wallet: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transaction?.wallet ? this.mapToWallet(transaction.wallet) : null;
  }
}
