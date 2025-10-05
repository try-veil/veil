import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PaymentRepository, CreatePaymentData, UpdatePaymentData, PaymentWithDetails, PaymentFilters } from '../repositories/payment-repository';
import { SubscriptionRepository } from '../repositories/subscription-repository';
import { APIRepository } from '../repositories/api-repository';
import { pricingService } from './pricing/pricing-service';
import { PricingRepository } from '../repositories/pricing-repository';
import { ledgerService } from './ledger-service';
import { walletService } from './wallet-service';

export interface PaymentProvider {
  name: string;
  createPayment(data: PaymentProviderRequest): Promise<PaymentProviderResponse>;
  processPayment(data: ProcessPaymentProviderRequest): Promise<PaymentProviderResponse>;
  refundPayment(data: RefundPaymentProviderRequest): Promise<RefundProviderResponse>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse>;
  validateWebhook(payload: any, signature: string): boolean;
}

export interface PaymentProviderRequest {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ProcessPaymentProviderRequest {
  paymentId: string;
  paymentToken: string;
  billingAddress: BillingAddress;
}

export interface RefundPaymentProviderRequest {
  paymentId: string;
  amount?: number;
  reason: string;
}

export interface PaymentProviderResponse {
  success: boolean;
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  clientSecret?: string;
  redirectUrl?: string;
  metadata?: Record<string, any>;
}

export interface RefundProviderResponse {
  success: boolean;
  refundId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  amount: number;
  currency: string;
  processedAt?: Date;
  failureReason?: string;
}

export interface BillingAddress {
  name: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CreatePaymentRequest {
  subscriptionUid: string;
  amount: number;
  currency: string;
  paymentMethod: {
    type: string;
    provider: string;
    details?: Record<string, any>;
  };
  description?: string;
  metadata?: Record<string, any>;
}

export interface ProcessPaymentRequest {
  paymentRecordUid: string;
  paymentToken: string;
  billingAddress: BillingAddress;
  savePaymentMethod: boolean;
}

export interface RefundPaymentRequest {
  paymentRecordUid: string;
  amount?: number;
  reason: string;
  notifyCustomer: boolean;
}

export interface PricingCalculation {
  basePrice: number;
  setupFee: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  breakdown: Array<{
    description: string;
    amount: number;
    type: 'base' | 'setup' | 'discount' | 'tax' | 'fee';
  }>;
}

// Mock payment providers (in real implementation, these would be separate classes)
class StripeProvider implements PaymentProvider {
  name = 'stripe';

  async createPayment(data: PaymentProviderRequest): Promise<PaymentProviderResponse> {
    // Mock Stripe payment creation
    const paymentId = `pi_${Math.random().toString(36).substring(2, 15)}`;
    
    return {
      success: true,
      paymentId,
      status: 'pending',
      clientSecret: `${paymentId}_secret_${Math.random().toString(36).substring(2, 10)}`,
      metadata: { provider: 'stripe' }
    };
  }

  async processPayment(data: ProcessPaymentProviderRequest): Promise<PaymentProviderResponse> {
    // Mock payment processing - randomly succeed/fail for demo
    const success = Math.random() > 0.1; // 90% success rate
    
    return {
      success,
      paymentId: data.paymentId,
      status: success ? 'completed' : 'failed',
      message: success ? 'Payment processed successfully' : 'Card declined',
    };
  }

  async refundPayment(data: RefundPaymentProviderRequest): Promise<RefundProviderResponse> {
    const refundId = `re_${Math.random().toString(36).substring(2, 15)}`;
    
    return {
      success: true,
      refundId,
      amount: data.amount || 0,
      status: 'completed',
      message: 'Refund processed successfully'
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    return {
      paymentId,
      status: 'completed',
      amount: 100,
      currency: 'USD',
      processedAt: new Date(),
    };
  }

  validateWebhook(payload: any, signature: string): boolean {
    // Mock webhook validation
    return true;
  }
}

class PayPalProvider implements PaymentProvider {
  name = 'paypal';

  async createPayment(data: PaymentProviderRequest): Promise<PaymentProviderResponse> {
    const paymentId = `PAYPAL_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

    return {
      success: true,
      paymentId,
      status: 'pending',
      redirectUrl: `https://paypal.com/checkoutnow?token=${paymentId}`,
      metadata: { provider: 'paypal' }
    };
  }

  async processPayment(data: ProcessPaymentProviderRequest): Promise<PaymentProviderResponse> {
    const success = Math.random() > 0.05; // 95% success rate

    return {
      success,
      paymentId: data.paymentId,
      status: success ? 'completed' : 'failed',
      message: success ? 'PayPal payment completed' : 'PayPal payment failed',
    };
  }

  async refundPayment(data: RefundPaymentProviderRequest): Promise<RefundProviderResponse> {
    const refundId = `PAYPAL_REFUND_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

    return {
      success: true,
      refundId,
      amount: data.amount || 0,
      status: 'completed',
      message: 'PayPal refund processed'
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    return {
      paymentId,
      status: 'completed',
      amount: 100,
      currency: 'USD',
      processedAt: new Date(),
    };
  }

  validateWebhook(payload: any, signature: string): boolean {
    return true;
  }
}

class RazorpayProvider implements PaymentProvider {
  name = 'razorpay';
  private client: Razorpay;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    if (!keyId || !keySecret) {
      console.warn('Razorpay credentials not configured. Using test mode.');
    }

    this.client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createPayment(data: PaymentProviderRequest): Promise<PaymentProviderResponse> {
    try {
      // Create Razorpay order
      const order = await this.client.orders.create({
        amount: Math.round(data.amount * 100), // Convert to paise (smallest currency unit)
        currency: data.currency || 'INR',
        receipt: `rcpt_${Date.now()}`,
        notes: data.metadata || {},
      });

      return {
        success: true,
        paymentId: order.id,
        status: 'pending',
        clientSecret: order.id, // Razorpay uses order ID as the client-side identifier
        metadata: {
          provider: 'razorpay',
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
        }
      };
    } catch (error: any) {
      console.error('Razorpay order creation failed:', error);
      return {
        success: false,
        paymentId: '',
        status: 'failed',
        message: error.message || 'Failed to create Razorpay order',
      };
    }
  }

  async processPayment(data: ProcessPaymentProviderRequest): Promise<PaymentProviderResponse> {
    try {
      // In Razorpay, payment is verified via webhook or signature verification
      // The paymentToken contains razorpay_payment_id from client
      const paymentId = data.paymentToken;

      // Fetch payment details from Razorpay
      const payment = await this.client.payments.fetch(paymentId);

      if (payment.status === 'captured' || payment.status === 'authorized') {
        return {
          success: true,
          paymentId: payment.id,
          status: 'completed',
          message: 'Payment verified successfully',
          metadata: {
            razorpayOrderId: payment.order_id,
            razorpayPaymentId: payment.id,
            method: payment.method,
          }
        };
      } else {
        return {
          success: false,
          paymentId: payment.id,
          status: 'failed',
          message: `Payment status: ${payment.status}`,
        };
      }
    } catch (error: any) {
      console.error('Razorpay payment processing failed:', error);
      return {
        success: false,
        paymentId: data.paymentId,
        status: 'failed',
        message: error.message || 'Failed to process Razorpay payment',
      };
    }
  }

  async refundPayment(data: RefundPaymentProviderRequest): Promise<RefundProviderResponse> {
    try {
      const refundAmount = data.amount ? Math.round(data.amount * 100) : undefined;

      const refund = await this.client.payments.refund(data.paymentId, {
        amount: refundAmount,
        notes: {
          reason: data.reason,
        },
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100, // Convert from paise to rupees
        status: refund.status === 'processed' ? 'completed' : 'pending',
        message: 'Refund initiated successfully',
      };
    } catch (error: any) {
      console.error('Razorpay refund failed:', error);
      return {
        success: false,
        refundId: '',
        amount: 0,
        status: 'failed',
        message: error.message || 'Failed to process refund',
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    try {
      const payment = await this.client.payments.fetch(paymentId);

      let status: PaymentStatusResponse['status'] = 'pending';
      if (payment.status === 'captured' || payment.status === 'authorized') {
        status = 'completed';
      } else if (payment.status === 'failed') {
        status = 'failed';
      } else if (payment.status === 'refunded') {
        status = 'refunded';
      }

      return {
        paymentId: payment.id,
        status,
        amount: payment.amount / 100, // Convert from paise
        currency: payment.currency,
        processedAt: payment.created_at ? new Date(payment.created_at * 1000) : undefined,
        failureReason: payment.error_description,
      };
    } catch (error: any) {
      console.error('Failed to fetch Razorpay payment status:', error);
      return {
        paymentId,
        status: 'failed',
        amount: 0,
        currency: 'INR',
        failureReason: error.message || 'Failed to fetch payment status',
      };
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

      if (!webhookSecret) {
        console.warn('Razorpay webhook secret not configured');
        return false;
      }

      // Razorpay webhook signature verification
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Razorpay webhook validation failed:', error);
      return false;
    }
  }
}

export class PaymentService {
  private paymentRepository: PaymentRepository;
  private subscriptionRepository: SubscriptionRepository;
  private apiRepository: APIRepository;
  private pricingRepository: PricingRepository;
  private providers: Map<string, PaymentProvider>;

  constructor() {
    this.paymentRepository = new PaymentRepository();
    this.subscriptionRepository = new SubscriptionRepository();
    this.apiRepository = new APIRepository();
    this.pricingRepository = new PricingRepository();

    // Initialize payment providers
    this.providers = new Map();
    this.providers.set('stripe', new StripeProvider());
    this.providers.set('paypal', new PayPalProvider());
    this.providers.set('razorpay', new RazorpayProvider());
  }

  /**
   * Calculate pricing for an API subscription using the pricing engine
   */
  async calculatePricing(
    apiUid: string,
    planType: string = 'basic',
    billingCycle: string = 'monthly',
    requestsLimit?: number,
    discountCode?: string,
    quantity: number = 1
  ): Promise<PricingCalculation> {
    try {
      const api = await this.apiRepository.findByUid(apiUid);
      if (!api) {
        throw new Error('API not found');
      }

      // Get pricing models for this API
      const allModels = await pricingService.getAvailablePricingModels(api.id);

      if (allModels.length === 0) {
        // Fallback to legacy pricing if no pricing models configured
        return this.calculateLegacyPricing(api, planType, billingCycle, requestsLimit, discountCode, quantity);
      }

      // Find matching pricing model based on billing cycle
      const pricingModel = allModels.find(m => m.billingCycle === billingCycle) || allModels[0];

      // Create mock usage data for price calculation
      const mockUsage = {
        subscriptionId: 0, // Placeholder for new subscription
        totalRequests: requestsLimit || 1000,
        successfulRequests: requestsLimit || 1000,
        failedRequests: 0,
        dataTransferredBytes: 0,
        dataTransferredGB: 0,
      };

      // Create mock billing period for calculation
      const mockBillingPeriod = {
        id: 0,
        uid: '',
        subscriptionId: 0,
        pricingModelId: pricingModel.id!,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active' as const,
        usageSnapshot: null,
        calculatedAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Calculate price using pricing engine
      const calculation = await pricingService.calculateSubscriptionPrice(
        mockUsage.subscriptionId,
        pricingModel.id!,
        mockUsage,
        discountCode
      );

      // Apply quantity multiplier if > 1
      const quantityMultiplier = quantity > 1 ? quantity : 1;

      // Convert pricing engine output to PricingCalculation format
      const setupFee = planType === 'enterprise' ? calculation.calculation.baseAmount * 0.1 : 0;

      const breakdown = calculation.calculation.breakdown.map(item => ({
        description: item.description || '',
        amount: (item.amount || 0) * quantityMultiplier,
        type: this.mapBreakdownType(item.tier),
      }));

      if (setupFee > 0) {
        breakdown.push({
          description: 'Enterprise setup fee',
          amount: setupFee,
          type: 'setup' as const,
        });
      }

      return {
        basePrice: calculation.calculation.baseAmount * quantityMultiplier,
        setupFee,
        discountAmount: (calculation.calculation.discountAmount || 0) * quantityMultiplier,
        taxAmount: (calculation.calculation.taxAmount || 0) * quantityMultiplier,
        totalAmount: calculation.calculation.totalAmount * quantityMultiplier + setupFee,
        currency: pricingModel.currency,
        breakdown,
      };

    } catch (error) {
      console.error('Error calculating pricing:', error);
      throw error;
    }
  }

  /**
   * Legacy pricing calculation (fallback when no pricing models configured)
   */
  private async calculateLegacyPricing(
    api: any,
    planType: string,
    billingCycle: string,
    requestsLimit?: number,
    discountCode?: string,
    quantity: number = 1
  ): Promise<PricingCalculation> {
    let basePrice = parseFloat(api.price);

    // Apply plan multipliers
    const planMultipliers = { basic: 1, pro: 2.5, enterprise: 5, custom: 1 };
    basePrice *= planMultipliers[planType as keyof typeof planMultipliers] || 1;

    // Apply billing cycle discounts
    const billingDiscounts = { monthly: 0, yearly: 0.15, one_time: 0 };
    const billingDiscount = billingDiscounts[billingCycle as keyof typeof billingDiscounts] || 0;

    const setupFee = planType === 'enterprise' ? basePrice * 0.1 : 0;
    basePrice *= quantity;

    let discountAmount = basePrice * billingDiscount;

    // Apply discount code via pricing engine
    if (discountCode) {
      try {
        const promotion = await pricingService.validatePromotionCode(discountCode);
        if (promotion && promotion.type === 'percentage_discount') {
          discountAmount += basePrice * (promotion.value / 100);
        } else if (promotion && promotion.type === 'fixed_discount') {
          discountAmount += Math.min(promotion.value, basePrice);
        }
      } catch (error) {
        console.warn('Failed to apply promotion code:', error);
      }
    }

    const taxableAmount = basePrice - discountAmount;
    const taxAmount = Math.max(0, taxableAmount * 0.1);
    const totalAmount = basePrice + setupFee - discountAmount + taxAmount;

    const breakdown = [
      { description: `${api.name} - ${planType} plan (${billingCycle})`, amount: basePrice, type: 'base' as const }
    ];

    if (setupFee > 0) breakdown.push({ description: 'Setup fee', amount: setupFee, type: 'setup' as const });
    if (discountAmount > 0) breakdown.push({ description: 'Discounts', amount: -discountAmount, type: 'discount' as const });
    if (taxAmount > 0) breakdown.push({ description: 'Tax', amount: taxAmount, type: 'tax' as const });

    return { basePrice, setupFee, discountAmount, taxAmount, totalAmount, currency: 'USD', breakdown };
  }

  /**
   * Map pricing engine breakdown tier to payment breakdown type
   */
  private mapBreakdownType(tier?: string): 'base' | 'setup' | 'discount' | 'tax' | 'fee' {
    if (!tier) return 'base';
    if (tier.includes('setup')) return 'setup';
    if (tier.includes('discount') || tier.includes('promotion')) return 'discount';
    if (tier.includes('tax')) return 'tax';
    if (tier.includes('fee') || tier.includes('overage')) return 'fee';
    return 'base';
  }

  /**
   * Create a payment intent
   */
  async createPayment(
    userId: number,
    request: CreatePaymentRequest
  ): Promise<PaymentWithDetails> {
    try {
      // Find subscription
      const subscription = await this.subscriptionRepository.findByUid(request.subscriptionUid);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.userId !== userId) {
        throw new Error('You can only create payments for your own subscriptions');
      }

      // Get payment provider
      const provider = this.providers.get(request.paymentMethod.provider);
      if (!provider) {
        throw new Error(`Payment provider '${request.paymentMethod.provider}' not supported`);
      }

      // Create payment with provider
      const providerResponse = await provider.createPayment({
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        metadata: {
          subscriptionUid: request.subscriptionUid,
          userId: userId.toString(),
          ...request.metadata,
        },
      });

      if (!providerResponse.success) {
        throw new Error('Failed to create payment with provider');
      }

      // Create payment record
      const paymentData: CreatePaymentData = {
        subscriptionId: subscription.id,
        amount: request.amount.toFixed(2),
        currency: request.currency,
        paymentProvider: request.paymentMethod.provider,
        paymentMethodType: request.paymentMethod.type,
        status: 'pending',
        providerPaymentId: providerResponse.paymentId,
        metadata: {
          clientSecret: providerResponse.clientSecret,
          redirectUrl: providerResponse.redirectUrl,
          ...request.metadata,
        },
        description: request.description,
      };

      const payment = await this.paymentRepository.create(paymentData);
      const fullPayment = await this.paymentRepository.findById(payment.id);
      
      if (!fullPayment) {
        throw new Error('Failed to retrieve created payment');
      }

      console.log(`Payment created: ${payment.uid} for subscription ${request.subscriptionUid}`);
      
      return fullPayment;

    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Process a payment
   */
  async processPayment(
    userId: number,
    request: ProcessPaymentRequest
  ): Promise<PaymentWithDetails> {
    try {
      // Find payment record
      const payment = await this.paymentRepository.findByUid(request.paymentRecordUid);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.user.id !== userId) {
        throw new Error('You can only process your own payments');
      }

      if (payment.status !== 'pending') {
        throw new Error('Payment is not in pending status');
      }

      // Get payment provider
      const provider = this.providers.get(payment.paymentProvider);
      if (!provider) {
        throw new Error(`Payment provider '${payment.paymentProvider}' not supported`);
      }

      // Process payment with provider
      const providerResponse = await provider.processPayment({
        paymentId: payment.providerPaymentId!,
        paymentToken: request.paymentToken,
        billingAddress: request.billingAddress,
      });

      // Update payment record
      if (providerResponse.success && providerResponse.status === 'completed') {
        await this.paymentRepository.markCompleted(
          payment.id,
          providerResponse.paymentId
        );

        // Create ledger entries for completed payment
        await this.createPaymentLedgerEntries(payment, parseFloat(payment.amount));

        // Add credits to user wallet if it's a credit purchase
        if (payment.metadata && typeof payment.metadata === 'object' && 'creditPurchase' in payment.metadata) {
          await walletService.addCredits({
            userId: payment.user.id,
            amount: payment.amount,
            description: `Credit purchase via payment ${payment.uid}`,
            referenceType: 'payment',
            referenceId: payment.uid,
            paymentRecordId: payment.id,
            metadata: { paymentProvider: payment.paymentProvider },
          });
        }

        console.log(`Payment completed: ${payment.uid}`);
      } else {
        await this.paymentRepository.markFailed(
          payment.id,
          providerResponse.message || 'Payment failed'
        );

        console.log(`Payment failed: ${payment.uid} - ${providerResponse.message}`);
      }

      // Get updated payment record
      const updatedPayment = await this.paymentRepository.findById(payment.id);
      if (!updatedPayment) {
        throw new Error('Failed to retrieve updated payment');
      }

      return updatedPayment;

    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    userId: number,
    request: RefundPaymentRequest
  ): Promise<PaymentWithDetails> {
    try {
      // Find payment record
      const payment = await this.paymentRepository.findByUid(request.paymentRecordUid);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.user.id !== userId) {
        throw new Error('You can only refund your own payments');
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
      const provider = this.providers.get(payment.paymentProvider);
      if (!provider) {
        throw new Error(`Payment provider '${payment.paymentProvider}' not supported`);
      }

      // Process refund with provider
      const providerResponse = await provider.refundPayment({
        paymentId: payment.providerPaymentId!,
        amount: refundAmount,
        reason: request.reason,
      });

      if (!providerResponse.success) {
        throw new Error('Failed to process refund with provider');
      }

      // Update payment record
      await this.paymentRepository.processRefund(
        payment.id,
        refundAmount.toFixed(2),
        request.reason
      );

      // TODO: Update subscription status, deactivate API keys if full refund, send notification

      console.log(`Payment refunded: ${payment.uid} - Amount: ${refundAmount}`);

      // Get updated payment record
      const updatedPayment = await this.paymentRepository.findById(payment.id);
      if (!updatedPayment) {
        throw new Error('Failed to retrieve updated payment');
      }

      return updatedPayment;

    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Get payment by UID
   */
  async getPayment(paymentUid: string, userId?: number): Promise<PaymentWithDetails> {
    try {
      const payment = await this.paymentRepository.findByUid(paymentUid);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Check ownership if userId provided
      if (userId && payment.user.id !== userId) {
        throw new Error('You can only access your own payments');
      }

      return payment;

    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  /**
   * Get user's payments
   */
  async getUserPayments(
    userId: number,
    filters?: PaymentFilters
  ): Promise<PaymentWithDetails[]> {
    try {
      return await this.paymentRepository.findByUser(userId, filters);

    } catch (error) {
      console.error('Error fetching user payments:', error);
      throw new Error('Failed to fetch payments');
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(
    userId?: number,
    fromDate?: Date,
    toDate?: Date
  ) {
    try {
      return await this.paymentRepository.getAnalytics(userId, fromDate, toDate);

    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      throw error;
    }
  }

  /**
   * Handle payment webhook
   */
  async handleWebhook(
    provider: string,
    payload: any,
    signature?: string
  ): Promise<void> {
    try {
      const paymentProvider = this.providers.get(provider);
      if (!paymentProvider) {
        throw new Error(`Unsupported payment provider: ${provider}`);
      }

      // Validate webhook signature
      if (signature && !paymentProvider.validateWebhook(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      // Process webhook based on event type
      const eventType = payload.type || payload.event_type;
      const paymentId = payload.data?.object?.id || payload.id;

      if (!paymentId) {
        console.error('No payment ID found in webhook payload');
        return;
      }

      // Find payment record
      const payment = await this.paymentRepository.findByProviderPaymentId(paymentId);
      if (!payment) {
        console.error(`Payment not found for provider ID: ${paymentId}`);
        return;
      }

      // Handle different event types
      switch (eventType) {
        // Stripe events
        case 'payment.succeeded':
        case 'payment_intent.succeeded':
          if (payment.status !== 'completed') {
            await this.paymentRepository.markCompleted(payment.id, paymentId);
            await this.createPaymentLedgerEntries(payment, parseFloat(payment.amount));
            console.log(`Webhook: Payment completed - ${payment.uid}`);
          }
          break;

        case 'payment.failed':
        case 'payment_intent.payment_failed':
          if (payment.status !== 'failed') {
            const failureReason = payload.data?.object?.last_payment_error?.message || 'Payment failed';
            await this.paymentRepository.markFailed(payment.id, failureReason);
            console.log(`Webhook: Payment failed - ${payment.uid}`);
          }
          break;

        // Razorpay events
        case 'payment.captured':
        case 'order.paid':
          if (payment.status !== 'completed') {
            await this.paymentRepository.markCompleted(payment.id, paymentId);
            await this.createPaymentLedgerEntries(payment, parseFloat(payment.amount));

            // Add credits to wallet if this was a credit purchase
            if (payment.metadata && typeof payment.metadata === 'object' && 'creditPurchase' in payment.metadata) {
              await walletService.addCredits({
                userId: payment.user.id,
                amount: payment.amount,
                description: `Credit purchase via Razorpay payment ${payment.uid}`,
                referenceType: 'payment',
                referenceId: payment.uid,
                paymentRecordId: payment.id,
                metadata: { paymentProvider: payment.paymentProvider },
              });
            }

            console.log(`Webhook: Razorpay payment captured - ${payment.uid}`);
          }
          break;

        case 'payment.failed':
          if (payment.status !== 'failed') {
            const failureReason = payload.payload?.payment?.entity?.error_description || 'Payment failed';
            await this.paymentRepository.markFailed(payment.id, failureReason);
            console.log(`Webhook: Razorpay payment failed - ${payment.uid}`);
          }
          break;

        case 'refund.created':
        case 'payment.refunded':
          // Handle refund
          console.log(`Webhook: Refund created for payment - ${payment.uid}`);
          break;

        case 'charge.dispute.created':
          // Handle chargeback/dispute
          console.log(`Webhook: Dispute created for payment - ${payment.uid}`);
          break;

        default:
          console.log(`Webhook: Unhandled event type - ${eventType}`);
      }

    } catch (error) {
      console.error('Error handling payment webhook:', error);
      throw error;
    }
  }

  /**
   * Cleanup stale pending payments
   */
  async cleanupPendingPayments(): Promise<number> {
    try {
      const pendingPayments = await this.paymentRepository.getPendingPayments(30); // 30 minutes
      let cleaned = 0;

      for (const payment of pendingPayments) {
        try {
          // Mark as cancelled after 30 minutes of being pending
          await this.paymentRepository.update(payment.id, {
            status: 'cancelled',
          });
          cleaned++;
        } catch (error) {
          console.error(`Failed to cleanup payment ${payment.uid}:`, error);
        }
      }

      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} stale pending payments`);
      }

      return cleaned;

    } catch (error) {
      console.error('Error cleaning up pending payments:', error);
      throw error;
    }
  }

  /**
   * Create ledger entries for a completed payment
   */
  private async createPaymentLedgerEntries(payment: PaymentWithDetails, amount: number) {
    try {
      // Get ledger accounts
      const paymentGatewayAccount = await ledgerService.getAccountByCode('1100'); // Razorpay Payment Gateway
      const revenueAccount = await ledgerService.getAccountByCode('4100'); // Credit Purchase Revenue

      if (!paymentGatewayAccount || !revenueAccount) {
        console.warn('Ledger accounts not found for payment entries. Skipping ledger entry creation.');
        return;
      }

      // Calculate payment gateway fees (example: 2% + 0.30)
      const gatewayFeePercent = 0.02;
      const gatewayFeeFixed = 0.30;
      const gatewayFee = (amount * gatewayFeePercent) + gatewayFeeFixed;
      const netAmount = amount - gatewayFee;

      // Create payment received ledger transaction
      await ledgerService.createTransaction({
        transactionDate: new Date(),
        type: 'payment_received',
        description: `Payment received via ${payment.paymentProvider} - ${payment.uid}`,
        referenceType: 'payment',
        referenceId: payment.uid,
        userId: payment.user.id,
        entries: [
          {
            accountId: paymentGatewayAccount.id,
            entryType: 'debit',
            amount: amount.toFixed(2),
            description: `Payment received from user ${payment.user.id}`,
          },
          {
            accountId: revenueAccount.id,
            entryType: 'credit',
            amount: amount.toFixed(2),
            description: 'Revenue from credit purchase',
          },
        ],
        metadata: {
          paymentProvider: payment.paymentProvider,
          paymentId: payment.uid,
          grossAmount: amount,
          gatewayFee,
          netAmount,
        },
      });

      // Create gateway fee expense entry if applicable
      if (gatewayFee > 0) {
        const gatewayFeeAccount = await ledgerService.getAccountByCode('5000'); // Payment Gateway Fees
        if (gatewayFeeAccount) {
          await ledgerService.createTransaction({
            transactionDate: new Date(),
            type: 'payment_gateway_fee',
            description: `Payment gateway fee for ${payment.uid}`,
            referenceType: 'payment',
            referenceId: payment.uid,
            userId: payment.user.id,
            entries: [
              {
                accountId: gatewayFeeAccount.id,
                entryType: 'debit',
                amount: gatewayFee.toFixed(2),
                description: `${payment.paymentProvider} gateway fee`,
              },
              {
                accountId: paymentGatewayAccount.id,
                entryType: 'credit',
                amount: gatewayFee.toFixed(2),
                description: 'Gateway fee deducted',
              },
            ],
          });
        }
      }
    } catch (error) {
      console.error('Error creating payment ledger entries:', error);
      // Don't throw - we don't want to fail the payment if ledger entry fails
    }
  }
}