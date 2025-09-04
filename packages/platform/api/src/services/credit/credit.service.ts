import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../razorpay/razorpay.service';
import { WalletService } from '../wallet/wallet.service';
import {
  WalletTransactionSubtype,
  WalletTransactionReferenceType,
} from '../../entities/billing/types';
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

  constructor(
    private prisma: PrismaService,
    private razorpayService: RazorpayService,
    private walletService: WalletService,
  ) { }

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
   * Check if user has sufficient credits (wallet primary, credit balance fallback)
   */
  async checkCredits(userId: string, amount: number): Promise<boolean> {
    this.logger.log(`Checking credits for user ${userId}: required=${amount}`);

    // Get current balance using the same logic as getCurrentBalance
    const currentBalance = await this.getCurrentBalance(userId);

    this.logger.log(`Current balance for user ${userId}: ${currentBalance}, required: ${amount}, sufficient: ${currentBalance >= amount}`);

    // Check if user has sufficient credits
    return currentBalance >= amount;
  }

  /**
   * Deduct credits from user's wallet (single source of truth)
   */
  async deductCredits(
    userId: string,
    amount: number,
    type: CreditUsageType,
    metadata?: Record<string, any>,
    options?: {
      mirrorToWallet?: boolean;
      walletSubtype?: WalletTransactionSubtype;
      walletRefType?: WalletTransactionReferenceType;
      walletRefId?: string;
    },
  ): Promise<number> {
    this.logger.log(`Deducting ${amount} credits from wallet for user ${userId}`);

    // Ensure wallet exists
    // notneeded
    // await this.ensureWalletExists(userId);

    // Get wallet
    const wallet = await this.walletService.findWalletByUserId(userId);
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user ${userId}`);
    }

    // Check sufficient balance
    // if (wallet.creditBalance < amount) {
    //   throw new BadRequestException('Insufficient credits');
    // }

    // Deduct credits from wallet
    await this.walletService.deductCredits(
      wallet.id,
      amount,
      options?.walletSubtype || WalletTransactionSubtype.PAYMENT,
      options?.walletRefType || WalletTransactionReferenceType.EXTERNAL,
      options?.walletRefId || 'CREDIT_DEDUCT',
      `Credit deduction: ${type}`
    );

    this.logger.log(`Successfully deducted ${amount} credits from wallet for user ${userId}`);

    // Return the new balance
    return await this.getCurrentBalance(userId);
  }

  /**
   * Add credits to user's wallet (single source of truth)
   */
  async addCredits(
    userId: string,
    amount: number,
    reason: string,
    adjustedBy: string,
    metadata?: Record<string, any>,
    options?: {
      mirrorToWallet?: boolean;
      walletSubtype?: WalletTransactionSubtype;
      walletRefType?: WalletTransactionReferenceType;
      walletRefId?: string;
    },
  ): Promise<number> {
    this.logger.log(`Adding ${amount} credits to wallet for user ${userId}`);

    // Ensure wallet exists
    // await this.ensureWalletExists(userId);

    // Get wallet
    const wallet = await this.walletService.findWalletByUserId(userId);
    if (!wallet) {
      throw new Error(`Failed to create or find wallet for user ${userId}`);
    }

    // Add credits to wallet
    await this.walletService.addCredits(
      wallet.id,
      amount,
      options?.walletSubtype || WalletTransactionSubtype.PAID,
      options?.walletRefType || WalletTransactionReferenceType.PAYMENT,
      options?.walletRefId || 'CREDIT_ADD',
      reason
    );

    this.logger.log(`Successfully added ${amount} credits to wallet for user ${userId}`);

    // Return the new balance
    return await this.getCurrentBalance(userId);
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
  // private mapToCreditBalance(balance: any): CreditBalance {
  //   return {
  //     id: balance.id,
  //     userId: balance.userId,
  //     balance: balance.balance,
  //     status: balance.status as CreditBalanceStatus,
  //     expiresAt: balance.expiresAt,
  //     createdAt: balance.createdAt,
  //     updatedAt: balance.updatedAt,
  //   };
  // }

  /**
   * Generate API key and deduct credits
   */
  async generateApiKeyWithCreditDeduction(
    userId: string,
    creditCost: number,
    keyName?: string,
    apiId?: string,
    projectId?: number,
  ): Promise<{ apiKey: string; remainingCredits: number; subscriptionId: string }> {
    // Check current balance first
    const currentBalance = await this.getCurrentBalance(userId);
    if (currentBalance < creditCost) {
      throw new BadRequestException('Insufficient credits');
    }

    return this.prisma.$transaction(async (tx) => {
      // Deduct credits from wallet
      await this.deductCredits(
        userId,
        creditCost,
        CreditUsageType.API_CALL,
        { keyName, apiId, projectId, description: `API key generation: ${keyName || 'Unnamed key'}` }
      );

      // Get updated balance
      const updatedBalance = await this.getCurrentBalance(userId);

      // Validate required fields
      if (!projectId) {
        throw new BadRequestException('Project ID is required for subscription creation');
      }
      if (!apiId) {
        throw new BadRequestException('API ID is required for subscription creation');
      }

      // Validate that project exists and get tenant info
      const project = await tx.project.findUnique({
        where: { id: projectId },
        include: { tenant: true },
      });
      if (!project) {
        throw new BadRequestException(`Project with ID ${projectId} not found`);
      }

      // Validate that API exists
      const api = await tx.api.findUnique({
        where: { id: apiId },
      });
      if (!api) {
        throw new BadRequestException(`API with ID ${apiId} not found`);
      }

      // Generate API key
      const apiKey = this.generateApiKey();

      // Create subscription record with proper relationships
      const subscription = await tx.subscription.create({
        data: {
          name: keyName || 'Generated API Key',
          tenantId: project.tenantId, // Use the project's tenant ID
          apiId: apiId,
          userId: userId,
          projectId: projectId,
          apiKey: apiKey,
          status: 'ACTIVE',
          startDate: new Date(),
        },
      });

      return {
        apiKey: apiKey,
        remainingCredits: updatedBalance,
        subscriptionId: subscription.id,
      };
    });
  }

  /**
   * Purchase credits via Razorpay - single unified method
   */
  async purchaseCredits(
    userId: string,
    creditAmount: number,
    amountInRupees: number,
  ): Promise<{ orderId: string; amount: number; currency: string; keyId: string; status: string }> {
    try {
      this.logger.log(`Creating Razorpay order for user ${userId}: ${creditAmount} credits for ₹${amountInRupees}`);

     // Verify user exists before creating payment record
     const user = await this.prisma.user.findFirst({
       where: {
         OR: [
           { id: userId },
           { fusionAuthId: userId }
         ]
       },
     });
     if (!user) {
       throw new NotFoundException(`User with ID ${userId} not found`);
     }
      // Create Razorpay order
      const order = await this.razorpayService.createOrder(amountInRupees, 'INR', {
        userId,
        purpose: 'credits',
        creditAmount,
      });

      // Store pending transaction in Razorpay payments table
      await this.prisma.razorpayPayment.create({
        data: {
          id: uuidv4(),
          userId: user.id, // Use the actual user.id from database
          razorpayOrderId: order.id,
          amount: amountInRupees * 100, // Store in paise for consistency
          currency: 'INR',
          status: 'created',
          purpose: 'credits',
          creditAmount,
          metadata: {
            userId: user.id,
            fusionAuthId: user.fusionAuthId,
            purpose: 'credits',
            creditAmount,
          },
        },
      });

      this.logger.log(`Razorpay order created successfully: ${order.id}`);

      return {
        orderId: order.id,
        amount: amountInRupees,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID || '',
        status: 'created'
      };
    } catch (error) {
      this.logger.error(`Failed to create Razorpay order for user ${userId}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create payment order: ${error.message}`);
    }
  }

  /**
   * Confirm payment and add credits - single unified method with idempotency
   */
  async confirmPayment(paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }): Promise<{ success: boolean; creditsAdded: number; newBalance: number }> {
    try {
      this.logger.log(`Confirming credit purchase for order: ${paymentData.razorpay_order_id}`);

      // Check if payment is already completed (idempotency)
      const existingPayment = await this.prisma.razorpayPayment.findFirst({
        where: {
          razorpayOrderId: paymentData.razorpay_order_id,
          status: 'completed'
        },
      });

      if (existingPayment) {
        this.logger.log(`Payment already completed for order: ${paymentData.razorpay_order_id}`);
        const currentBalance = await this.getCurrentBalance(existingPayment.userId);
        return {
          success: true,
          creditsAdded: existingPayment.creditAmount,
          newBalance: currentBalance,
        };
      }

      // Verify payment signature
      const isValid = await this.razorpayService.verifyPayment(
        paymentData.razorpay_payment_id,
        paymentData.razorpay_order_id,
        paymentData.razorpay_signature,
      );

      if (!isValid) {
        this.logger.error(`Invalid payment signature for order: ${paymentData.razorpay_order_id}`);
        throw new BadRequestException('Invalid payment signature');
      }

      // Use transaction to ensure atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Find the payment record
        const payment = await tx.razorpayPayment.findFirst({
          where: {
            razorpayOrderId: paymentData.razorpay_order_id,
            status: { in: ['created', 'authorized'] }
          },
        });

        if (!payment) {
          throw new NotFoundException(`Payment record not found for order: ${paymentData.razorpay_order_id}`);
        }

        // Update payment status
        await tx.razorpayPayment.update({
          where: { id: payment.id },
          data: {
            razorpayPaymentId: paymentData.razorpay_payment_id,
            razorpaySignature: paymentData.razorpay_signature,
            status: 'completed',
            updatedAt: new Date(),
          },
        });

        // Add credits to wallet (single source of truth)
        this.logger.log(`Adding ${payment.creditAmount} credits to user ${payment.userId}`);
        const newBalance = await this.addCredits(
          payment.userId,
          payment.creditAmount,
          `Credit purchase via Razorpay - Order: ${payment.razorpayOrderId}`,
          'system',
          {
            razorpayOrderId: payment.razorpayOrderId,
            razorpayPaymentId: paymentData.razorpay_payment_id,
            amountPaid: payment.amount,
            currency: payment.currency,
          },
          {
            walletSubtype: WalletTransactionSubtype.PAID,
            walletRefType: WalletTransactionReferenceType.PAYMENT,
            walletRefId: payment.razorpayOrderId,
          }
        );
        this.logger.log(`Credits added successfully. New credit balance: ${newBalance}`);

        return {
          creditsAdded: payment.creditAmount,
          newBalance: newBalance,
        };
      });

      this.logger.log(`Credit purchase confirmed successfully for order: ${paymentData.razorpay_order_id}, added ${result.creditsAdded} credits`);

      return {
        success: true,
        creditsAdded: result.creditsAdded,
        newBalance: result.newBalance,
      };
    } catch (error) {
      this.logger.error(`Failed to confirm credit purchase for order ${paymentData.razorpay_order_id}: ${error.message}`, error.stack);

      // Update payment status to failed if it exists
      try {
        await this.prisma.razorpayPayment.updateMany({
          where: {
            razorpayOrderId: paymentData.razorpay_order_id,
            status: { in: ['created', 'authorized'] }
          },
          data: {
            status: 'failed',
            razorpayPaymentId: paymentData.razorpay_payment_id,
            updatedAt: new Date(),
          },
        });
      } catch (updateError) {
        this.logger.error(`Failed to update payment status to failed: ${updateError.message}`);
      }

      throw error;
    }
  }



  /**
   * Get current balance (wallet only - single source of truth)
   */
  async getCurrentBalance(userId: string): Promise<number> {
    this.logger.log(`Getting current balance for user: ${userId}`);

    // Get wallet balance directly (findWalletByUserId handles both ID types)
    const wallet = await this.walletService.findWalletByUserId(userId);
    if (wallet) {
      this.logger.log(`Found wallet for user ${userId}: balance=${wallet.balance}`);
      return wallet.balance;
    }
    else 
    {
      this.logger.log(`No wallet found for user ${userId}`);
      return 0;
    }

    // If no wallet exists, ensure it gets created
    // await this.ensureWalletExists(userId);
    
    // Try again after ensuring wallet exists
    // const newWallet = await this.walletService.findWalletByUserId(userId);
    // if (newWallet) {
    //   this.logger.log(`Created and found wallet for user ${userId}: creditBalance=${newWallet.creditBalance}`);
    //   return newWallet.creditBalance;
    // }

    // If wallet still doesn't exist, return 0
    
  }

  /**
   * Debug balance information for troubleshooting
   */
  async debugBalance(userId: string) {
    const result = {
      userId,
      timestamp: new Date(),
      wallet: null as any,
      creditBalance: null as any,
      user: null as any,
      issues: [] as string[]
    };

    try {
      // Check if user exists
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ id: userId }, { fusionAuthId: userId }],
        },
      });

      if (!user) {
        result.issues.push(`User not found with ID: ${userId}`);
        return result;
      }

      result.user = {
        id: user.id,
        fusionAuthId: user.fusionAuthId,
        email: user.email
      };

      // Check wallet
      const wallet = await this.walletService.findWalletByUserId(userId);
      if (wallet) {
        result.wallet = {
          id: wallet.id,
          customerId: wallet.customerId,
          balance: wallet.balance,
          // creditBalance: wallet.creditBalance,
          currency: wallet.currency
        };
      } else {
        result.issues.push('No wallet found for user');
      }

      // Check credit balance
      try {
        const creditBalance = await this.getCreditBalance(userId);
        result.creditBalance = {
          balance: creditBalance.balance,
          status: creditBalance.status,
          expiresAt: creditBalance.expiresAt
        };
      } catch (error) {
        result.issues.push(`No credit balance found: ${error.message}`);
      }

      // Check recent transactions
      const recentPayments = await this.prisma.razorpayPayment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      result['recentPayments'] = recentPayments.map(p => ({
        id: p.id,
        orderId: p.razorpayOrderId,
        status: p.status,
        creditAmount: p.creditAmount,
        createdAt: p.createdAt
      }));

    } catch (error) {
      result.issues.push(`Debug error: ${error.message}`);
    }

    return result;
  }

  /**
   * Ensure user has a wallet (create if needed) - private method
   */
  // private async ensureWalletExists(userId: string): Promise<void> {
  //   const wallet = await this.walletService.findWalletByUserId(userId);
  //   if (!wallet) {
  //     // Find user's tenant
  //     const user = await this.prisma.user.findFirst({
  //       where: { OR: [{ id: userId }, { fusionAuthId: userId }] },
  //       include: { tenant: true }
  //     });

  //     if (user && user.tenant) {
  //       // Use the actual user.id for wallet creation to ensure consistency
  //       await this.walletService.createWallet(user.id, 0, user.tenant.id);
  //       this.logger.log(`Created wallet for user ${userId} (internal ID: ${user.id})`);
  //     }
  //   }
  // }

  /**
   * Generate a secure API key
   */
  private generateApiKey(): string {
    return `veil_${randomBytes(32).toString('hex')}`;
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
