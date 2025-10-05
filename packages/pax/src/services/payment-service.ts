import { PaymentRepository } from '../repositories/payment-repository';
import { RefundRepository } from '../repositories/refund-repository';
import { RazorpayProvider } from './providers/razorpay-provider';
import { PaymentProvider } from '../types';

export interface CreatePaymentRequest {
  userId: number;
  amount: number;
  currency: string;
  provider?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ProcessPaymentRequest {
  paymentUid: string;
  paymentToken: string;
  razorpaySignature?: string;
  razorpayOrderId?: string;
}

export interface RefundPaymentRequest {
  paymentUid: string;
  amount?: number;
  reason: string;
}

export class PaymentService {
  private paymentRepository: PaymentRepository;
  private refundRepository: RefundRepository;
  private providers: Map<string, PaymentProvider>;

  constructor() {
    this.paymentRepository = new PaymentRepository();
    this.refundRepository = new RefundRepository();
    this.providers = new Map();

    // Initialize payment providers
    try {
      const razorpay = new RazorpayProvider();
      this.providers.set('razorpay', razorpay);
      console.log('✅ Payment providers initialized');
    } catch (error) {
      console.error('❌ Failed to initialize payment providers:', error);
    }
  }

  /**
   * Create a payment order/intent
   */
  async createPayment(
    userId: number,
    amount: number,
    currency: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<any>;
  async createPayment(request: CreatePaymentRequest): Promise<any>;
  async createPayment(
    userIdOrRequest: number | CreatePaymentRequest,
    amount?: number,
    currency?: string,
    description?: string,
    metadata?: Record<string, any>
  ) {
    let request: CreatePaymentRequest;

    if (typeof userIdOrRequest === 'number') {
      request = {
        userId: userIdOrRequest,
        amount: amount!,
        currency: currency!,
        description,
        metadata,
      };
    } else {
      request = userIdOrRequest;
    }
    const provider = request.provider || 'razorpay';
    const paymentProvider = this.providers.get(provider);

    if (!paymentProvider) {
      throw new Error(`Payment provider '${provider}' not supported`);
    }

    // Create payment order with provider
    const providerResponse = await paymentProvider.createPayment({
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      metadata: {
        userId: request.userId.toString(),
        ...request.metadata,
      },
    });

    if (!providerResponse.success) {
      throw new Error(providerResponse.message || 'Failed to create payment');
    }

    // Save payment transaction to database
    const payment = await this.paymentRepository.create({
      userId: request.userId,
      provider,
      amount: request.amount.toFixed(2),
      currency: request.currency,
      providerOrderId: providerResponse.paymentId,
      metadata: {
        clientSecret: providerResponse.clientSecret,
        description: request.description,
        ...providerResponse.metadata,
      },
    });

    return {
      paymentUid: payment.uid,
      orderId: providerResponse.paymentId,
      clientSecret: providerResponse.clientSecret,
      amount: request.amount,
      currency: request.currency,
      provider,
      metadata: providerResponse.metadata,
    };
  }

  /**
   * Process/verify a payment after user completes it
   */
  async processPayment(request: ProcessPaymentRequest) {
    // Find payment by UID
    const payment = await this.paymentRepository.findByUid(request.paymentUid);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'pending') {
      throw new Error(`Payment is already ${payment.status}`);
    }

    // Get payment provider
    const paymentProvider = this.providers.get(payment.provider);
    if (!paymentProvider) {
      throw new Error(`Payment provider '${payment.provider}' not available`);
    }

    // Process payment with provider
    const providerResponse = await paymentProvider.processPayment({
      paymentId: payment.providerOrderId!,
      paymentToken: request.paymentToken,
      additionalData: {
        razorpay_signature: request.razorpaySignature,
        razorpay_order_id: request.razorpayOrderId,
      },
    });

    // Update payment based on provider response
    if (providerResponse.success && providerResponse.status === 'completed') {
      await this.paymentRepository.markCompleted(
        payment.id,
        providerResponse.paymentId
      );

      console.log(`✅ Payment completed: ${payment.uid}`);

      return {
        success: true,
        paymentUid: payment.uid,
        status: 'completed',
        message: 'Payment processed successfully',
      };
    } else {
      await this.paymentRepository.markFailed(
        payment.id,
        providerResponse.message || 'Payment failed'
      );

      console.log(`❌ Payment failed: ${payment.uid} - ${providerResponse.message}`);

      return {
        success: false,
        paymentUid: payment.uid,
        status: 'failed',
        message: providerResponse.message || 'Payment failed',
      };
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(request: RefundPaymentRequest) {
    // Find payment
    const payment = await this.paymentRepository.findByUid(request.paymentUid);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new Error('Only completed payments can be refunded');
    }

    // Calculate refund amount
    const originalAmount = parseFloat(payment.amount);
    const refundAmount = request.amount || originalAmount;

    if (refundAmount > originalAmount) {
      throw new Error('Refund amount cannot exceed original payment amount');
    }

    // Get payment provider
    const paymentProvider = this.providers.get(payment.provider);
    if (!paymentProvider) {
      throw new Error(`Payment provider '${payment.provider}' not available`);
    }

    // Process refund with provider
    const providerResponse = await paymentProvider.refundPayment({
      paymentId: payment.providerTransactionId!,
      amount: refundAmount,
      reason: request.reason,
    });

    if (!providerResponse.success) {
      throw new Error(providerResponse.message || 'Refund failed');
    }

    // Create refund record
    const refund = await this.refundRepository.create({
      paymentTransactionId: payment.id,
      amount: refundAmount.toFixed(2),
      currency: payment.currency,
      reason: request.reason,
      providerRefundId: providerResponse.refundId,
      metadata: {
        originalPaymentUid: payment.uid,
      },
    });

    // Update refund status
    if (providerResponse.status === 'completed') {
      await this.refundRepository.markCompleted(refund.id);
    }

    // Update payment status if fully refunded
    if (refundAmount >= originalAmount) {
      await this.paymentRepository.update(payment.id, {
        status: 'refunded',
      });
    }

    console.log(`✅ Refund processed: ${refund.uid} for payment ${payment.uid}`);

    return {
      refundUid: refund.uid,
      paymentUid: payment.uid,
      amount: refundAmount,
      status: providerResponse.status,
      message: 'Refund processed successfully',
    };
  }

  /**
   * Get payment details
   */
  async getPayment(paymentUid: string, userId?: number) {
    const payment = await this.paymentRepository.findByUid(paymentUid);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Check ownership if userId provided
    if (userId && payment.userId !== userId) {
      throw new Error('Unauthorized access to payment');
    }

    return payment;
  }

  /**
   * Get payment by UID (helper for internal use)
   */
  async getPaymentByUid(paymentUid: string) {
    return await this.paymentRepository.findByUid(paymentUid);
  }

  /**
   * Get user's payments
   */
  async getUserPayments(userId: number, limit = 50, offset = 0) {
    return this.paymentRepository.findByUserId(userId, limit, offset);
  }

  /**
   * Get payment analytics
   */
  async getAnalytics(userId?: number, fromDate?: Date, toDate?: Date) {
    return this.paymentRepository.getAnalytics(userId, fromDate, toDate);
  }

  /**
   * Get payment status from provider
   */
  async getPaymentStatus(paymentUid: string) {
    const payment = await this.paymentRepository.findByUid(paymentUid);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const paymentProvider = this.providers.get(payment.provider);
    if (!paymentProvider) {
      throw new Error(`Payment provider '${payment.provider}' not available`);
    }

    const paymentIdToCheck = payment.providerTransactionId || payment.providerOrderId;
    if (!paymentIdToCheck) {
      return {
        paymentUid: payment.uid,
        status: payment.status,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
      };
    }

    const status = await paymentProvider.getPaymentStatus(paymentIdToCheck);

    return {
      paymentUid: payment.uid,
      ...status,
    };
  }

  /**
   * Cleanup stale pending payments
   */
  async cleanupPendingPayments(olderThanMinutes = 30) {
    const pendingPayments = await this.paymentRepository.getPendingPayments(olderThanMinutes);
    let cleaned = 0;

    for (const payment of pendingPayments) {
      try {
        await this.paymentRepository.update(payment.id, {
          status: 'cancelled',
        });
        cleaned++;
      } catch (error) {
        console.error(`Failed to cleanup payment ${payment.uid}:`, error);
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} stale pending payments`);
    }

    return cleaned;
  }
}

export const paymentService = new PaymentService();
