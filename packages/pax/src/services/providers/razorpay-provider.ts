import Razorpay from 'razorpay';
import crypto from 'crypto';
import {
  PaymentProvider,
  PaymentProviderRequest,
  ProcessPaymentProviderRequest,
  RefundPaymentProviderRequest,
  PaymentProviderResponse,
  RefundProviderResponse,
  PaymentStatusResponse,
} from '../../types';
import { config } from '../../config';

export class RazorpayProvider implements PaymentProvider {
  name = 'razorpay';
  private razorpay: Razorpay;
  private webhookSecret: string;

  constructor() {
    const { keyId, keySecret, webhookSecret } = config.razorpay;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
    }

    this.webhookSecret = webhookSecret;

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    console.log('✅ RazorpayProvider initialized successfully');
  }

  /**
   * Create a Razorpay order for payment
   */
  async createPayment(data: PaymentProviderRequest): Promise<PaymentProviderResponse> {
    try {
      // Convert amount to paise (Razorpay uses smallest currency unit)
      const amountInPaise = Math.round(data.amount * 100);

      const orderOptions = {
        amount: amountInPaise,
        currency: data.currency.toUpperCase(),
        receipt: `rcpt_${Date.now()}`,
        notes: data.metadata || {},
      };

      const order = await this.razorpay.orders.create(orderOptions);

      console.log('Razorpay order created:', order.id);

      return {
        success: true,
        paymentId: order.id,
        status: 'pending',
        clientSecret: order.id, // Razorpay uses order ID as reference
        metadata: {
          provider: 'razorpay',
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
        },
      };
    } catch (error) {
      console.error('Razorpay order creation failed:', error);

      return {
        success: false,
        paymentId: '',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Failed to create Razorpay order',
      };
    }
  }

  /**
   * Process/capture a payment
   * In Razorpay, payment is captured after successful authorization
   */
  async processPayment(data: ProcessPaymentProviderRequest): Promise<PaymentProviderResponse> {
    try {
      // Verify payment signature if provided
      if (data.additionalData?.razorpay_signature) {
        const isValid = this.verifyPaymentSignature(
          data.additionalData.razorpay_order_id,
          data.paymentToken,
          data.additionalData.razorpay_signature
        );

        if (!isValid) {
          return {
            success: false,
            paymentId: data.paymentToken,
            status: 'failed',
            message: 'Invalid payment signature',
          };
        }
      }

      // Fetch payment details to confirm
      const payment = await this.razorpay.payments.fetch(data.paymentToken);

      if (payment.status === 'captured' || payment.status === 'authorized') {
        return {
          success: true,
          paymentId: payment.id,
          status: 'completed',
          message: 'Payment processed successfully',
          metadata: {
            razorpayPaymentId: payment.id,
            orderId: payment.order_id,
            method: payment.method,
            status: payment.status,
          },
        };
      } else if (payment.status === 'failed') {
        return {
          success: false,
          paymentId: payment.id,
          status: 'failed',
          message: payment.error_description || 'Payment failed',
        };
      } else {
        return {
          success: false,
          paymentId: payment.id,
          status: 'pending',
          message: 'Payment is still processing',
        };
      }
    } catch (error) {
      console.error('Razorpay payment processing failed:', error);

      return {
        success: false,
        paymentId: data.paymentId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  /**
   * Verify Razorpay payment signature
   */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    try {
      const text = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(text)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Payment signature verification failed:', error);
      return false;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(data: RefundPaymentProviderRequest): Promise<RefundProviderResponse> {
    try {
      const refundOptions: any = {
        payment_id: data.paymentId,
      };

      // If amount specified, do partial refund
      if (data.amount) {
        refundOptions.amount = Math.round(data.amount * 100); // Convert to paise
      }

      if (data.reason) {
        refundOptions.notes = { reason: data.reason };
      }

      const refund = await this.razorpay.payments.refund(data.paymentId, refundOptions);

      console.log('Razorpay refund created:', refund.id);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100, // Convert from paise to currency
        status: refund.status === 'processed' ? 'completed' : 'pending',
        message: 'Refund processed successfully',
      };
    } catch (error) {
      console.error('Razorpay refund failed:', error);

      return {
        success: false,
        refundId: '',
        amount: data.amount || 0,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Refund processing failed',
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);

      let status: PaymentStatusResponse['status'] = 'pending';

      switch (payment.status) {
        case 'captured':
        case 'authorized':
          status = 'completed';
          break;
        case 'failed':
          status = 'failed';
          break;
        case 'refunded':
          status = 'refunded';
          break;
        default:
          status = 'pending';
      }

      return {
        paymentId: payment.id,
        status,
        amount: payment.amount / 100, // Convert from paise
        currency: payment.currency,
        processedAt: payment.captured_at ? new Date(payment.captured_at * 1000) : undefined,
        failureReason: payment.error_description,
      };
    } catch (error) {
      console.error('Failed to fetch payment status:', error);
      throw error;
    }
  }

  /**
   * Validate webhook signature using HMAC SHA256
   */
  validateWebhook(payload: any, signature: string): boolean {
    try {
      if (!this.webhookSecret) {
        console.error('Webhook secret not configured');
        return false;
      }

      // Razorpay sends the raw body as the payload for signature verification
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payloadString)
        .digest('hex');

      // Compare signatures
      const isValid = expectedSignature === signature;

      if (!isValid) {
        console.error('Webhook signature validation failed');
        console.debug('Expected:', expectedSignature);
        console.debug('Received:', signature);
      }

      return isValid;
    } catch (error) {
      console.error('Webhook validation error:', error);
      return false;
    }
  }

  /**
   * Create a subscription plan
   */
  async createSubscriptionPlan(planData: {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    amount: number;
    currency: string;
    description?: string;
  }) {
    try {
      const plan = await this.razorpay.plans.create({
        period: planData.period,
        interval: planData.interval,
        item: {
          name: planData.description || 'API Subscription',
          amount: Math.round(planData.amount * 100), // Convert to paise
          currency: planData.currency.toUpperCase(),
          description: planData.description,
        },
      });

      console.log('Razorpay plan created:', plan.id);
      return plan;
    } catch (error) {
      console.error('Failed to create subscription plan:', error);
      throw error;
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(subscriptionData: {
    planId: string;
    customerId?: string;
    totalCount?: number;
    quantity?: number;
    startAt?: number;
    notes?: Record<string, any>;
  }) {
    try {
      const subscription = await this.razorpay.subscriptions.create({
        plan_id: subscriptionData.planId,
        customer_id: subscriptionData.customerId,
        total_count: subscriptionData.totalCount,
        quantity: subscriptionData.quantity,
        start_at: subscriptionData.startAt,
        notes: subscriptionData.notes,
      });

      console.log('Razorpay subscription created:', subscription.id);
      return subscription;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw error;
    }
  }
}
