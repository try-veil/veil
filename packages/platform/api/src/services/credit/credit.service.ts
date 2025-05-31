import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreditBalance,
  CreditUsage,
  CreditAdjustment,
  CreditBalanceStatus,
  CreditUsageType,
  CreditBalanceResponse,
} from '../../entities/credit/types';

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get credit balance for a user
   */
  async getCreditBalance(userId: string): Promise<CreditBalanceResponse> {
    const balance = await this.prisma.creditBalance.findUnique({
      where: { userId },
    });

    if (!balance) {
      throw new NotFoundException(
        `Credit balance not found for user ${userId}`,
      );
    }

    const recentUsage = await this.prisma.creditUsage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      balance: balance.balance,
      status: balance.status as CreditBalanceStatus,
      expiresAt: balance.expiresAt,
      recentUsage: recentUsage.map(this.mapToCreditUsage),
    };
  }

  /**
   * Check if user has sufficient credits
   */
  async checkCredits(userId: string, amount: number): Promise<boolean> {
    const balance = await this.prisma.creditBalance.findUnique({
      where: { userId },
    });

    if (!balance) {
      return false;
    }

    if (balance.status !== CreditBalanceStatus.ACTIVE) {
      return false;
    }

    if (balance.expiresAt && balance.expiresAt < new Date()) {
      await this.updateBalanceStatus(userId, CreditBalanceStatus.EXPIRED);
      return false;
    }

    return balance.balance >= amount;
  }

  /**
   * Deduct credits from user's balance
   */
  async deductCredits(
    userId: string,
    amount: number,
    type: CreditUsageType,
    metadata?: Record<string, any>,
  ): Promise<CreditBalance> {
    // Use a transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        throw new NotFoundException(
          `Credit balance not found for user ${userId}`,
        );
      }

      if (balance.status !== CreditBalanceStatus.ACTIVE) {
        throw new BadRequestException('Credit balance is not active');
      }

      if (balance.expiresAt && balance.expiresAt < new Date()) {
        await this.updateBalanceStatus(userId, CreditBalanceStatus.EXPIRED);
        throw new BadRequestException('Credit balance has expired');
      }

      if (balance.balance < amount) {
        throw new BadRequestException('Insufficient credits');
      }

      // Create usage record
      await tx.creditUsage.create({
        data: {
          id: uuidv4(),
          userId,
          amount,
          type,
          metadata,
          createdAt: new Date(),
        },
      });

      // Update balance
      const updatedBalance = await tx.creditBalance.update({
        where: { userId },
        data: {
          balance: balance.balance - amount,
          updatedAt: new Date(),
        },
      });

      return this.mapToCreditBalance(updatedBalance);
    });
  }

  /**
   * Add credits to user's balance
   */
  async addCredits(
    userId: string,
    amount: number,
    reason: string,
    adjustedBy: string,
    metadata?: Record<string, any>,
  ): Promise<CreditBalance> {
    // Use a transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      let balance = await tx.creditBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        // Create new balance if it doesn't exist
        balance = await tx.creditBalance.create({
          data: {
            id: uuidv4(),
            userId,
            balance: 0,
            status: CreditBalanceStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Create adjustment record
      await tx.creditAdjustment.create({
        data: {
          id: uuidv4(),
          userId,
          amount,
          reason,
          adjustedBy,
          metadata,
          createdAt: new Date(),
        },
      });

      // Update balance
      const updatedBalance = await tx.creditBalance.update({
        where: { userId },
        data: {
          balance: balance.balance + amount,
          status: CreditBalanceStatus.ACTIVE,
          updatedAt: new Date(),
        },
      });

      return this.mapToCreditBalance(updatedBalance);
    });
  }

  /**
   * Update credit balance status
   */
  private async updateBalanceStatus(
    userId: string,
    status: CreditBalanceStatus,
  ): Promise<void> {
    await this.prisma.creditBalance.update({
      where: { userId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Map Prisma CreditBalance to domain CreditBalance
   */
  private mapToCreditBalance(balance: any): CreditBalance {
    return {
      id: balance.id,
      userId: balance.userId,
      balance: balance.balance,
      status: balance.status as CreditBalanceStatus,
      expiresAt: balance.expiresAt,
      createdAt: balance.createdAt,
      updatedAt: balance.updatedAt,
    };
  }

  /**
   * Map Prisma CreditUsage to domain CreditUsage
   */
  private mapToCreditUsage(usage: any): CreditUsage {
    return {
      id: usage.id,
      userId: usage.userId,
      amount: usage.amount,
      type: usage.type as CreditUsageType,
      endpointId: usage.endpointId,
      featureId: usage.featureId,
      description: usage.description,
      metadata: usage.metadata,
      createdAt: usage.createdAt,
    };
  }
}
