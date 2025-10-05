import { creditAccountRepository } from '../repositories/credit-account-repository';
import { creditPackageRepository } from '../repositories/credit-package-repository';
import { creditPurchaseRepository } from '../repositories/credit-purchase-repository';
import { creditTransactionService } from './credit-transaction-service';
import { paymentService } from './payment-service';
import { CreatePackageData, UpdatePackageData, PurchaseInitiationResponse } from '../types';

export class CreditPurchaseService {
  // Package management
  async getPackages() {
    return await creditPackageRepository.findAll(true);
  }

  async getPackage(uid: string) {
    const pkg = await creditPackageRepository.findByUid(uid);
    if (!pkg) {
      throw new Error('Package not found');
    }
    return pkg;
  }

  async createPackage(data: CreatePackageData) {
    return await creditPackageRepository.create(data);
  }

  async updatePackage(uid: string, data: UpdatePackageData) {
    const pkg = await creditPackageRepository.findByUid(uid);
    if (!pkg) {
      throw new Error('Package not found');
    }
    return await creditPackageRepository.update(uid, data);
  }

  // Purchase flow
  async initiatePurchase(userId: number, packageUid: string): Promise<PurchaseInitiationResponse> {
    // Get package
    const pkg = await this.getPackage(packageUid);

    // Get or create credit account
    const account = await creditAccountRepository.getOrCreate(userId, pkg.currency);

    // Calculate total credits
    const credits = parseFloat(pkg.credits);
    const bonusCredits = parseFloat(pkg.bonusCredits);
    const totalCredits = credits + bonusCredits;
    const price = parseFloat(pkg.price);

    // Create purchase record
    const purchase = await creditPurchaseRepository.create({
      creditAccountId: account.id,
      packageId: pkg.id,
      credits: credits.toString(),
      bonusCredits: bonusCredits.toString(),
      totalCredits: totalCredits.toString(),
      price: price.toString(),
      currency: pkg.currency,
    });

    // Create payment order
    const payment = await paymentService.createPayment(
      userId,
      price,
      pkg.currency,
      `Purchase ${pkg.name} - ${totalCredits} credits`,
      {
        purchaseUid: purchase.uid,
        packageUid: pkg.uid,
        credits: totalCredits,
      }
    );

    // Link payment to purchase
    await creditPurchaseRepository.updateStatus(purchase.id, 'pending', {});

    return {
      purchaseUid: purchase.uid,
      paymentOrder: {
        uid: payment.uid,
        orderId: payment.providerOrderId!,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
      },
    };
  }

  async initiatePurchaseCustomAmount(
    userId: number,
    amount: number
  ): Promise<PurchaseInitiationResponse> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const currency = 'INR';
    const creditRate = 1.0; // 1 INR = 1 credit (configurable)

    // Calculate credits
    const credits = amount * creditRate;

    // Get or create credit account
    const account = await creditAccountRepository.getOrCreate(userId, currency);

    // Create purchase record
    const purchase = await creditPurchaseRepository.create({
      creditAccountId: account.id,
      credits: credits.toString(),
      bonusCredits: '0',
      totalCredits: credits.toString(),
      price: amount.toString(),
      currency,
    });

    // Create payment order
    const payment = await paymentService.createPayment(
      userId,
      amount,
      currency,
      `Purchase ${credits} credits`,
      {
        purchaseUid: purchase.uid,
        credits,
      }
    );

    return {
      purchaseUid: purchase.uid,
      paymentOrder: {
        uid: payment.uid,
        orderId: payment.providerOrderId!,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
      },
    };
  }

  async completePurchase(purchaseUid: string, paymentTransactionUid: string) {
    // Get purchase
    const purchase = await creditPurchaseRepository.findByUid(purchaseUid);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    // Check if already completed
    if (purchase.status === 'completed') {
      console.log(`Purchase ${purchaseUid} already completed`);
      return purchase;
    }

    // Get payment transaction
    const payment = await paymentService.getPaymentByUid(paymentTransactionUid);
    if (!payment) {
      throw new Error('Payment transaction not found');
    }

    // Verify payment is completed
    if (payment.status !== 'completed') {
      throw new Error('Payment is not completed');
    }

    // Get account
    const account = await creditAccountRepository.findById(purchase.creditAccountId);
    if (!account) {
      throw new Error('Credit account not found');
    }

    // Add credits to account
    const totalCredits = parseFloat(purchase.totalCredits);
    const creditTransaction = await creditTransactionService.addCredits(
      account.userId,
      totalCredits,
      'credit_purchase',
      purchase.uid,
      `Credit purchase: ${totalCredits} credits for ${purchase.currency} ${purchase.price}`,
      {
        purchaseUid: purchase.uid,
        paymentUid: payment.uid,
        packageId: purchase.packageId,
      }
    );

    // Update purchase status
    const updatedPurchase = await creditPurchaseRepository.markCompleted(
      purchase.id,
      creditTransaction.id
    );

    // Link payment to purchase
    // (This would be done in payment service)

    return updatedPurchase;
  }

  async failPurchase(purchaseUid: string, reason: string) {
    const purchase = await creditPurchaseRepository.findByUid(purchaseUid);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    return await creditPurchaseRepository.markFailed(purchase.id);
  }

  async getPurchases(userId: number) {
    const account = await creditAccountRepository.findByUserId(userId);
    if (!account) {
      return [];
    }

    return await creditPurchaseRepository.findByAccount(account.id);
  }

  async getPurchase(uid: string) {
    const purchase = await creditPurchaseRepository.findByUid(uid);
    if (!purchase) {
      throw new Error('Purchase not found');
    }
    return purchase;
  }

  // Auto-recharge
  async checkAndTriggerAutoRecharge(userId: number) {
    const account = await creditAccountRepository.findByUserId(userId);
    if (!account) {
      return;
    }

    // Check if auto-recharge is enabled
    if (!account.autoRechargeEnabled) {
      return;
    }

    const balance = parseFloat(account.balance);
    const threshold = parseFloat(account.autoRechargeThreshold);

    // Check if balance is below threshold
    if (balance >= threshold) {
      return;
    }

    const rechargeAmount = parseFloat(account.autoRechargeAmount);

    // Initiate purchase
    try {
      const result = await this.initiatePurchaseCustomAmount(userId, rechargeAmount);
      console.log(`Auto-recharge triggered for user ${userId}: ${rechargeAmount} ${account.currency}`);

      // TODO: Notify user or process payment automatically if saved payment method exists
      return result;
    } catch (error) {
      console.error(`Auto-recharge failed for user ${userId}:`, error);
      // TODO: Send notification to user
    }
  }
}

export const creditPurchaseService = new CreditPurchaseService();
