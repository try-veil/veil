import { PaymentRepository, CreatePaymentData, UpdatePaymentData, PaymentWithDetails, PaymentFilters } from '../repositories/payment-repository';
import { SubscriptionRepository } from '../repositories/subscription-repository';
import { APIRepository } from '../repositories/api-repository';
import { RazorpayProvider } from './payment-providers/razorpay-provider';

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

export class PaymentService {
  private paymentRepository: PaymentRepository;
  private subscriptionRepository: SubscriptionRepository;
  private apiRepository: APIRepository;
  private providers: Map<string, PaymentProvider>;

  constructor() {
    this.paymentRepository = new PaymentRepository();
    this.subscriptionRepository = new SubscriptionRepository();
    this.apiRepository = new APIRepository();

    // Initialize payment providers
    this.providers = new Map();

    // Add Razorpay as the primary payment provider
    try {
      this.providers.set('razorpay', new RazorpayProvider());
      console.log('Razorpay provider initialized');
    } catch (error) {
      console.error('Failed to initialize Razorpay provider:', error);
    }

    // Keep mock providers for fallback/testing
    this.providers.set('stripe', new StripeProvider());
    this.providers.set('paypal', new PayPalProvider());
  }

  /**
   * Calculate pricing for an API subscription
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

      let basePrice = parseFloat(api.price);
      
      // Apply plan multipliers
      const planMultipliers = {
        basic: 1,
        pro: 2.5,
        enterprise: 5,
        custom: 1,
      };
      
      basePrice *= planMultipliers[planType as keyof typeof planMultipliers] || 1;

      // Apply billing cycle discounts
      const billingDiscounts = {
        monthly: 0,
        yearly: 0.15, // 15% discount for yearly
        one_time: 0,
      };
      
      const billingDiscount = billingDiscounts[billingCycle as keyof typeof billingDiscounts] || 0;
      
      // Calculate setup fee (for enterprise plans)
      const setupFee = planType === 'enterprise' ? basePrice * 0.1 : 0;

      // Apply quantity
      basePrice *= quantity;

      // Calculate discount
      let discountAmount = basePrice * billingDiscount;

      // Apply discount code (mock implementation)
      if (discountCode) {
        const discountCodes = {
          'LAUNCH50': 0.5,
          'WELCOME25': 0.25,
          'STUDENT20': 0.2,
        };
        
        const discountRate = discountCodes[discountCode as keyof typeof discountCodes];
        if (discountRate) {
          discountAmount += basePrice * discountRate;
        }
      }

      // Calculate tax (mock 10% tax)
      const taxableAmount = basePrice - discountAmount;
      const taxAmount = Math.max(0, taxableAmount * 0.1);

      const totalAmount = basePrice + setupFee - discountAmount + taxAmount;

      const breakdown = [
        {
          description: `${api.name} - ${planType} plan (${billingCycle})`,
          amount: basePrice,
          type: 'base' as const,
        }
      ];

      if (setupFee > 0) {
        breakdown.push({
          description: 'Setup fee',
          amount: setupFee,
          type: 'setup' as const,
        });
      }

      if (discountAmount > 0) {
        breakdown.push({
          description: 'Discounts',
          amount: -discountAmount,
          type: 'discount' as const,
        });
      }

      if (taxAmount > 0) {
        breakdown.push({
          description: 'Tax',
          amount: taxAmount,
          type: 'tax' as const,
        });
      }

      return {
        basePrice,
        setupFee,
        discountAmount,
        taxAmount,
        totalAmount,
        currency: 'USD', // Default currency
        breakdown,
      };

    } catch (error) {
      console.error('Error calculating pricing:', error);
      throw error;
    }
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

        // TODO: Update subscription status, activate API keys, send confirmation email
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
        // Razorpay events
        case 'payment.authorized':
        case 'payment.captured':
        // Stripe events
        case 'payment.succeeded':
        case 'payment_intent.succeeded':
          if (payment.status !== 'completed') {
            await this.paymentRepository.markCompleted(payment.id, paymentId);
            console.log(`Webhook: Payment completed - ${payment.uid}`);
          }
          break;

        // Razorpay/Stripe payment failures
        case 'payment.failed':
        case 'payment_intent.payment_failed':
          if (payment.status !== 'failed') {
            const failureReason = payload.data?.object?.last_payment_error?.message ||
                                 payload.payload?.payment?.entity?.error_description ||
                                 'Payment failed';
            await this.paymentRepository.markFailed(payment.id, failureReason);
            console.log(`Webhook: Payment failed - ${payment.uid}`);
          }
          break;

        // Razorpay subscription events
        case 'subscription.charged':
          console.log(`Webhook: Subscription charged - ${payment.uid}`);
          if (payment.status !== 'completed') {
            await this.paymentRepository.markCompleted(payment.id, paymentId);
          }
          break;

        case 'subscription.cancelled':
          console.log(`Webhook: Subscription cancelled - ${payment.uid}`);
          break;

        // Razorpay refund events
        case 'refund.created':
        case 'refund.processed':
          console.log(`Webhook: Refund processed for payment - ${payment.uid}`);
          break;

        // Stripe dispute
        case 'charge.dispute.created':
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
}