import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// Types for Razorpay
export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: number;
  receipt?: string;
  notes?: Record<string, any>;
}

export interface PaymentVerificationData {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface WebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        status: string;
        amount: number;
        currency: string;
        method: string;
        created_at: number;
        notes?: Record<string, any>;
      };
    };
  };
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private razorpay: Razorpay;
  private config: RazorpayConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.config = {
      keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
      keySecret: this.configService.get<string>('RAZORPAY_KEY_SECRET'),
      webhookSecret: this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET'),
    };

    this.logger.log(`Razorpay config loaded - KeyID: ${this.config.keyId ? 'SET' : 'NOT SET'}, KeySecret: ${this.config.keySecret ? 'SET' : 'NOT SET'}`);

    if (!this.config.keyId || !this.config.keySecret ||
      this.config.keySecret === 'your-razorpay-key-secret' ||
      this.config.keyId === 'your-razorpay-key-id') {
      this.logger.warn('Razorpay credentials not configured properly. Please set real values in .env file. Service will not be functional.');
      return;
    }

    try {
      this.razorpay = new Razorpay({
        key_id: this.config.keyId,
        key_secret: this.config.keySecret,
      });

      this.logger.log('Razorpay service initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Razorpay: ${error.message}`, error.stack);
    }
  }

  /**
   * Create a Razorpay order for payment processing
   */
  async createOrder(
    amount: number,
    currency: string = 'INR',
    metadata: Record<string, any> = {},
  ): Promise<RazorpayOrder> {
    try {
      if (!this.razorpay) {
        throw new BadRequestException('Razorpay service not configured');
      }

      // Convert amount to paise (smallest currency unit)
      const amountInPaise = Math.round(amount * 100);

      const orderOptions = {
        amount: amountInPaise,
        currency,
        receipt: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        notes: metadata,
      };

      this.logger.log(`Creating Razorpay order: ${JSON.stringify(orderOptions)}`);

      const order = await this.razorpay.orders.create(orderOptions);

      this.logger.log(`Razorpay order created successfully: ${order.id}`);

      return {
        id: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
        created_at: order.created_at,
        receipt: order.receipt,
        notes: order.notes,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create Razorpay order`,
        JSON.stringify({
          message: error?.message,
          status: error?.statusCode ?? error?.status,
          error: error?.error,
          details: error?.details,
        }),
      );
      throw new BadRequestException(`Failed to create payment order: ${error?.message || 'Razorpay error'}`);
    }
  }

  /**
   * Verify payment signature to ensure authenticity
   */
  async verifyPayment(
    paymentId: string,
    orderId: string,
    signature: string,
  ): Promise<boolean> {
    try {
      if (!this.config.keySecret) {
        throw new BadRequestException('Razorpay key secret not configured');
      }

      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.keySecret)
        .update(body.toString())
        .digest('hex');

      const isValid = expectedSignature === signature;

      this.logger.log(`Payment verification for ${paymentId}: ${isValid ? 'SUCCESS' : 'FAILED'}`);

      return isValid;
    } catch (error) {
      this.logger.error(`Payment verification failed: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Handle webhook events from Razorpay
   */
  async handleWebhook(payload: WebhookPayload, signature: string): Promise<void> {
    try {
      // Verify webhook signature
      const isValid = this.verifyWebhookSignature(JSON.stringify(payload), signature);

      if (!isValid) {
        this.logger.warn('Invalid webhook signature received');
        throw new BadRequestException('Invalid webhook signature');
      }

      const event = payload.event;
      const paymentEntity = payload.payload.payment.entity;

      this.logger.log(`Processing webhook event: ${event} for payment: ${paymentEntity.id}`);

      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(paymentEntity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(paymentEntity);
          break;
        case 'payment.authorized':
          await this.handlePaymentAuthorized(paymentEntity);
          break;
        default:
          this.logger.log(`Unhandled webhook event: ${event}`);
      }
    } catch (error) {
      this.logger.error(`Webhook handling failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      if (!this.config.webhookSecret) {
        this.logger.warn('Webhook secret not configured, skipping signature verification');
        return true; // Allow in development
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Handle payment captured event
   */
  private async handlePaymentCaptured(paymentEntity: any): Promise<void> {
    try {
      // Update payment status in database
      const updatedPayments = await this.prisma.razorpayPayment.updateMany({
        where: {
          razorpayOrderId: paymentEntity.order_id,
          status: { in: ['created', 'authorized'] }
        },
        data: {
          status: 'captured',
          razorpayPaymentId: paymentEntity.id,
          updatedAt: new Date(),
        },
      });

      if (updatedPayments.count > 0) {
        this.logger.log(`Payment captured successfully: ${paymentEntity.id}`);
      } else {
        this.logger.warn(`No payment record found for order: ${paymentEntity.order_id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle payment captured: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle payment failed event
   */
  private async handlePaymentFailed(paymentEntity: any): Promise<void> {
    try {
      // Update payment status in database
      const updatedPayments = await this.prisma.razorpayPayment.updateMany({
        where: {
          razorpayOrderId: paymentEntity.order_id,
          status: { in: ['created', 'authorized'] }
        },
        data: {
          status: 'failed',
          razorpayPaymentId: paymentEntity.id,
          updatedAt: new Date(),
        },
      });

      if (updatedPayments.count > 0) {
        this.logger.log(`Payment failed: ${paymentEntity.id}`);
      } else {
        this.logger.warn(`No payment record found for order: ${paymentEntity.order_id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle payment failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle payment authorized event
   */
  private async handlePaymentAuthorized(paymentEntity: any): Promise<void> {
    try {
      // Update payment status in database
      const updatedPayments = await this.prisma.razorpayPayment.updateMany({
        where: {
          razorpayOrderId: paymentEntity.order_id,
          status: 'created'
        },
        data: {
          status: 'authorized',
          razorpayPaymentId: paymentEntity.id,
          updatedAt: new Date(),
        },
      });

      if (updatedPayments.count > 0) {
        this.logger.log(`Payment authorized: ${paymentEntity.id}`);
      } else {
        this.logger.warn(`No payment record found for order: ${paymentEntity.order_id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle payment authorized: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get payment details from Razorpay
   */
  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      if (!this.razorpay) {
        throw new BadRequestException('Razorpay service not configured');
      }

      const payment = await this.razorpay.payments.fetch(paymentId);
      this.logger.log(`Retrieved payment details for: ${paymentId}`);

      return payment;
    } catch (error) {
      this.logger.error(`Failed to get payment details: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get payment details: ${error.message}`);
    }
  }

  /**
   * Get order details from Razorpay
   */
  async getOrderDetails(orderId: string): Promise<any> {
    try {
      if (!this.razorpay) {
        throw new BadRequestException('Razorpay service not configured');
      }

      const order = await this.razorpay.orders.fetch(orderId);
      this.logger.log(`Retrieved order details for: ${orderId}`);

      return order;
    } catch (error) {
      this.logger.error(`Failed to get order details: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get order details: ${error.message}`);
    }
  }

  /**
   * Process refund for a payment
   */
  async processRefund(paymentId: string, amount?: number): Promise<any> {
    try {
      if (!this.razorpay) {
        throw new BadRequestException('Razorpay service not configured');
      }

      const refundOptions: any = {};
      if (amount) {
        refundOptions.amount = Math.round(amount * 100); // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundOptions);
      this.logger.log(`Refund processed for payment: ${paymentId}, refund ID: ${refund.id}`);

      return refund;
    } catch (error) {
      this.logger.error(`Failed to process refund: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process refund: ${error.message}`);
    }
  }

  /**
   * Generate test signature for testing payment verification
   * This is only for testing purposes
   */
  async generateTestSignature(orderId: string, paymentId: string): Promise<string> {
    try {
      if (!this.config.keySecret) {
        throw new BadRequestException('Razorpay key secret not configured');
      }

      const body = orderId + '|' + paymentId;
      const signature = crypto
        .createHmac('sha256', this.config.keySecret)
        .update(body.toString())
        .digest('hex');

      this.logger.log(`Generated test signature for order: ${orderId}, payment: ${paymentId}`);

      return signature;
    } catch (error) {
      this.logger.error(`Failed to generate test signature: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate test signature: ${error.message}`);
    }
  }
}