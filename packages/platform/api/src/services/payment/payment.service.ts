import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Payment,
  PaymentStatus,
  PaymentMethodType,
  PaymentDestinationType,
  PaymentAttempt,
  PaymentAttemptStatus,
} from '../../entities/billing/types';
import { PrismaService } from '../prisma/prisma.service';
const Razorpay = require('razorpay');
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly razorpay: any;

  constructor(private prisma: PrismaService) {
    // Initialize Razorpay with credentials from environment variables
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
  }

  /**
   * Convert Prisma Payment to Entity Payment
   */
  private mapToPayment(prismaPayment: any): Payment {
    const paymentReturn: Payment = {
      id: prismaPayment.id,
      tenantId: prismaPayment.tenantId,
      idempotencyKey: prismaPayment.idempotencyKey,
      destinationType: prismaPayment.destinationType as PaymentDestinationType,
      destinationId: prismaPayment.destinationId,
      paymentMethodType: prismaPayment.paymentMethodType as PaymentMethodType,
      paymentMethodId: prismaPayment.paymentMethodId,
      paymentGateway: prismaPayment.paymentGateway,
      gatewayPaymentId: prismaPayment.gatewayPaymentId,
      amount: prismaPayment.amount,
      currency: prismaPayment.currency,
      orderId: prismaPayment.metadata?.razorpayOrderId,
      paymentStatus: prismaPayment.paymentStatus as PaymentStatus,
      trackAttempts: prismaPayment.trackAttempts,
      metadata: prismaPayment.metadata,
      succeededAt: prismaPayment.succeededAt,
      failedAt: prismaPayment.failedAt,
      refundedAt: prismaPayment.refundedAt,
      errorMessage: prismaPayment.errorMessage,
      createdAt: prismaPayment.createdAt,
      updatedAt: prismaPayment.updatedAt,
    };
    // console.log('Payment Return', paymentReturn);
    return paymentReturn;
  }

  /**
   * Convert Prisma PaymentAttempt to Entity PaymentAttempt
   */
  private mapToPaymentAttempt(prismaAttempt: any): PaymentAttempt {
    return {
      id: prismaAttempt.id,
      tenantId: prismaAttempt.tenantId,
      paymentId: prismaAttempt.paymentId,
      attemptNumber: prismaAttempt.attemptNumber,
      paymentStatus: prismaAttempt.paymentStatus as PaymentAttemptStatus,
      gatewayAttemptId: prismaAttempt.gatewayAttemptId,
      errorMessage: prismaAttempt.errorMessage,
      metadata: prismaAttempt.metadata,
      createdAt: prismaAttempt.createdAt,
      updatedAt: prismaAttempt.updatedAt,
    };
  }
  /**
   * Process a payment using Razorpay
   */
  async processPayment(data: {
    tenantId: string;
    destinationType: PaymentDestinationType;
    destinationId: string;
    paymentMethodType: PaymentMethodType;
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string; 
  }): Promise<Payment> {
    const idempotencyKey = data.idempotencyKey || uuidv4(); // In a real system, this would be provided by the client -ok

    try {
      // Create payment record in our database first
      const paymentId = uuidv4();
      const prismaPayment = await this.prisma.payment.create({
        data: {
          id: paymentId,
          tenantId: data.tenantId,
          idempotencyKey,
          destinationType: data.destinationType as any, // Prisma enum conversion
          destinationId: data.destinationId,
          paymentMethodType: data.paymentMethodType as any, // Prisma enum conversion
          amount: data.amount,
          currency: data.currency,
          paymentStatus: PaymentStatus.PENDING as any, // Prisma enum conversion
          trackAttempts: true,
          metadata: data.metadata || {},
        },
      }); // Determine if we need to create a Razorpay order or process directly
      // In Razorpay, amount is in subunits (paise for INR, cents for USD)
      const amountInSubunits = Math.round(data.amount * 100);
      const receipt = `receipt_${paymentId}`.replace(/-/g, '_');

      // Dev Debug logs
      console.log(
        `Creating Razorpay order with amount: ${amountInSubunits}, currency: ${data.currency}, receipt: ${receipt}`,
      );

      // Create a Razorpay order with specific error handling
      let razorpayOrder;
      try {
        // Create Razorpay order
        const options = {
          amount: amountInSubunits, // Amount in subunits
          currency: data.currency || 'INR',
          receipt: receipt.slice(0, 10), // Passing only first 10 characters (NOTE: longer receipts will cause failure)
          notes: {
            tenantId: data.tenantId,
            destinationType: data.destinationType,
            destinationId: data.destinationId,
            ...data.metadata,
          },
        };
        razorpayOrder = await this.razorpay.orders.create(options);

        this.logger.log(
          `Created Razorpay order: ${JSON.stringify(razorpayOrder)}`,
        );
      } catch (razorpayError) {
        this.logger.error(
          `Razorpay API error: ${razorpayError.message}`,
          razorpayError.stack,
        );

        // Update the payment record to reflect the failure
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            paymentStatus: PaymentStatus.FAILED as any,
            failedAt: new Date(),
            errorMessage: `Razorpay order creation failed: ${razorpayError.message}`,
          },
        });

        throw new BadRequestException(
          `Failed to create Razorpay order: ${razorpayError.message}`,
        );
      }
      // Update our payment with Razorpay order details
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          gatewayPaymentId: razorpayOrder.id,
          paymentGateway: 'RAZORPAY',
          metadata: {
            ...(data.metadata || {}),
            razorpayOrderId: razorpayOrder.id,
            razorpayOrderAmount: razorpayOrder.amount,
            razorpayOrderCurrency: razorpayOrder.currency,
            razorpayOrderReceipt: razorpayOrder.receipt,
            razorpayOrderStatus: razorpayOrder.status,
          },
        },
      });

      // TODO: Certain Things to be wired up after frontend checkout --> To be done
      // For Direct or Card payments (depending on configuration)
      // if (data.paymentMethodType === PaymentMethodType.CARD) {
      //   // This would typically involve capturing payment after frontend checkout
      //   return this.mapToPayment(updatedPayment);
      // }
      
      if (data.paymentMethodType === PaymentMethodType.CARD) {
        // Do not return yet — let webhook handle final success confirmation
        this.logger.log('Card payment initiated; awaiting Razorpay webhook for confirmation.');
      }

      // For other payment methods
      return this.mapToPayment(updatedPayment);
    } catch (error) {
      this.logger.error(
        `Error processing payment: ${error.message}`,
        error.stack,
      );

      try {
        // Try to find if a payment was already created with this idempotency key
        const existingPayment = await this.prisma.payment.findUnique({
          where: { idempotencyKey },
        });

        if (existingPayment) {
          // Update the existing payment to failed status
          const updatedPayment = await this.prisma.payment.update({
            where: { id: existingPayment.id },
            data: {
              paymentStatus: PaymentStatus.FAILED as any,
              failedAt: new Date(),
              errorMessage: error.message,
            },
          });
          return this.mapToPayment(updatedPayment);
        } else {
          // Create a new failed payment record with a different idempotency key
          const failedPayment = await this.prisma.payment.create({
            data: {
              id: uuidv4(),
              tenantId: data.tenantId,
              idempotencyKey: `failed-${uuidv4()}`, // Generate a new unique key
              destinationType: data.destinationType as any,
              destinationId: data.destinationId,
              paymentMethodType: data.paymentMethodType as any,
              amount: data.amount,
              currency: data.currency,
              paymentStatus: PaymentStatus.FAILED as any,
              trackAttempts: true,
              failedAt: new Date(),
              errorMessage: error.message,
              metadata: data.metadata || {},
            },
          });
          return this.mapToPayment(failedPayment);
        }
      } catch (secondaryError) {
        this.logger.error(
          `Secondary error in payment error handling: ${secondaryError.message}`,
          secondaryError.stack,
        );

        // If everything fails, re-throw the original error with context
        throw new BadRequestException(
          `Payment processing failed: ${error.message}`,
        );
      }
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    return this.mapToPayment(payment);
  }

  /**
   * Get payment attempts
   */
  async getPaymentAttempts(paymentId: string): Promise<PaymentAttempt[]> {
    const attempts = await this.prisma.paymentAttempt.findMany({
      where: { paymentId },
      orderBy: { attemptNumber: 'asc' },
    });

    return attempts.map((attempt) => this.mapToPaymentAttempt(attempt));
  }
  /**
   * TODO: Process refund through Razorpay -  ****DONE****
   */
  async processRefund(paymentId: string, amount?: number): Promise<Payment> {
    try {
      // Get payment from our database
      const payment = await this.getPayment(paymentId);

      if (payment.paymentStatus !== 'SUCCEEDED') {
        throw new Error('Cannot refund a payment that is not successful');
      }

      const refundAmount = amount || payment.amount;
      if (refundAmount > payment.amount) {
        throw new Error('Refund amount cannot exceed original payment amount');
      }

      // Check if this is a Razorpay payment
      if (payment.paymentGateway !== 'RAZORPAY' || !payment.gatewayPaymentId) {
        throw new Error('Cannot process refund: Not a valid Razorpay payment');
      }

      // Calculate refund amount in subunits (paise for INR, cents for USD)
      const refundAmountInSubunits = Math.round(refundAmount * 100);
      this.logger.debug(`Attempting refund for ${payment.gatewayPaymentId} with amount ${refundAmountInSubunits}`);

      // Process refund through Razorpay
      const refund = await this.razorpay.payments.refund(
        payment.gatewayPaymentId,
        {
          amount: refundAmountInSubunits,
          speed: 'normal', // or 'optimum'
          notes: {
            paymentId,
            reason: 'Customer requested refund',
          },
        },
      );

      this.logger.log(
        `Processed refund through Razorpay: ${JSON.stringify(refund)}`,
      );

      // Update payment status based on refund amount
      const newStatus =
        refundAmount === payment.amount
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;

      // Update payment in our database
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: newStatus as any, // Prisma enum conversion
          refundedAt: new Date(),
          metadata: {
            ...payment.metadata,
            refundId: refund.id,
            refundAmount: refundAmount,
            refundedAt: new Date().toISOString(),
          },
        },
      });

      return this.mapToPayment(updatedPayment);
    } catch (error) {
        this.logger.error(
          `Failed to process refund: ${error?.message || 'No error.message'}`,
          error?.stack || 'No error.stack',
        );

        // 👇 Force detailed inspection of Razorpay error
        try {
          const serializedError = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
          this.logger.error(`Serialized Razorpay error: ${serializedError}`);
          console.log("🔍 Razorpay error (full):", serializedError); // 🔥 Console output for terminal
        } catch (serializationErr) {
          console.log('❌ Failed to serialize error. Fallback:', error?.toString?.() || error);
        }

        throw new BadRequestException(`Refund failed: ${error?.message || 'Unknown error'}`);
      }

  }
  /**
   * Create a payment attempt record
   */
  private async createPaymentAttempt(
    payment: any,
    status: PaymentAttemptStatus,
    metadata: Record<string, any> = {},
    errorMessage?: string,
  ): Promise<any> {
    return this.prisma.paymentAttempt.create({
      data: {
        id: uuidv4(),
        tenantId: payment.tenantId,
        paymentId: payment.id,
        attemptNumber: 1, // Would need logic to increment this based on previous attempts
        paymentStatus: status as any,
        errorMessage: errorMessage,
        metadata: metadata,
      },
    });
  }

  /**
   * Captures a payment in Razorpay after frontend checkout is completed
   * @param razorpayPaymentId The payment ID received from Razorpay frontend checkout
   * @param amount The amount to capture
   */ 
  async captureRazorpayPayment(
    razorpayPaymentId: string,
    amount: number,
    orderId: string,
  ): Promise<Payment> {
    try {
      // Find the payment in our database
      const payment = await this.prisma.payment.findFirst({
        where: {
          gatewayPaymentId: razorpayPaymentId, //updated here*********
          paymentGateway: 'RAZORPAY',
        },
      });

      if (!payment) {
        throw new NotFoundException(
          `No payment found for Razorpay order ${orderId}`,
        );
      }

      // Convert amount to subunits
      const amountInSubunits = Math.round(amount * 100);
      this.logger.debug(`Calling Razorpay.capture with:`, {
        paymentId: razorpayPaymentId,
        amount: amountInSubunits,
      });
      this.logger.debug(`Payment found in DB:`, {
        status: payment.paymentStatus,
        gatewayPaymentId: payment.gatewayPaymentId,
      });
      if (payment.paymentStatus === 'SUCCEEDED') {
        throw new BadRequestException('Payment is already captured.');
      }

      



      // Capture the payment in Razorpay
      const capturedPayment = await this.razorpay.payments.capture(
        razorpayPaymentId,
        amountInSubunits,
        'INR',
      );
      this.logger.log(`Payment captured: ${JSON.stringify(capturedPayment)}`);

      const paymentMetadata = (payment.metadata as Record<string, any>) || {};

      // Update our payment record
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: PaymentStatus.SUCCEEDED as any,
          succeededAt: new Date(),
          metadata: {
            ...paymentMetadata,
            razorpayPaymentId,
            capturedAt: new Date().toISOString(),
          },
        },
      });

      // Create a payment attempt record
      await this.prisma.paymentAttempt.create({
        data: {
          id: uuidv4(),
          tenantId: payment.tenantId,
          paymentId: payment.id,
          attemptNumber: 1,
          gatewayAttemptId: razorpayPaymentId,
          paymentStatus: PaymentAttemptStatus.SUCCEEDED as any,
          metadata: {
            captureResponse: {
              paymentId: razorpayPaymentId,
              amount: amountInSubunits,
              captured: true,
            },
          },
        },
      });

      return this.mapToPayment(updatedPayment);
    }  catch (error) {
      
        if (error.statusCode === 400 && error.error) {
        this.logger.error(`Razorpay 400 Error: ${JSON.stringify(error.error, null, 2)}`);
      }

    let parsedError = 'Unknown error';
    try {
      const fullError = JSON.parse(
        JSON.stringify(error, Object.getOwnPropertyNames(error)),
      );
      parsedError =
        fullError?.error?.description ||
        fullError?.error?.message ||
        fullError?.message ||
        'Unknown error';
      this.logger.error(`Razorpay capture error: ${parsedError}`);
      this.logger.error(`Full Razorpay error: ${JSON.stringify(fullError, null, 2)}`);
    } catch (e) {
      this.logger.error('Failed to parse Razorpay error:', e);
    }

    throw new BadRequestException(`Payment capture failed: ${parsedError}`);
  }
}

  /**
   * Verify a Razorpay webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      return validateWebhookSignature(
        payload,
        signature,
        process.env.RAZORPAY_WEBHOOK_SECRET || '',
      );
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Process Razorpay webhook events
   */

  async processWebhookEvent(eventType: string, eventData: any): Promise<void> {
    this.logger.log(`Processing webhook event: ${eventType}`);
    // this.logger.debug(`eventData.payment: ${JSON.stringify(eventData.payment)}`);
    // this.logger.debug(`eventData.payment.entity: ${JSON.stringify(eventData.payment?.entity)}`);


    // Safe to skip:
    // payment.authorized: only needed for manual capture flows.
    // order.paid: just a summary event, and your payment.captured handler already does the work.

    switch (eventType) {
      case 'payment.captured':
        await this.handlePaymentCaptured(eventData.payment?.entity);
        break;

      case 'payment.failed':
        await this.handlePaymentFailed(eventData.payment?.entity);
        break;

      case 'refund.processed':
        await this.handleRefundProcessed(eventData.refund?.entity);
        break;

      default:
        this.logger.log(`Unhandled webhook event type: ${eventType}`);
    }
}


  /**
   * Handle payment.captured webhook event
   */
  
  private async handlePaymentCaptured(razorpayPayment: any): Promise<void> {
  try {
    if (!razorpayPayment?.order_id) {
      this.logger.warn('order_id missing in payment.captured payload');
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        gatewayPaymentId: razorpayPayment.order_id,
        paymentGateway: 'RAZORPAY',
      },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for Razorpay order ${razorpayPayment.order_id}`);
      return;
    }

    const paymentMetadata = (payment.metadata as Record<string, any>) || {};
    
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: PaymentStatus.SUCCEEDED as any,
        succeededAt: new Date(),
        gatewayPaymentId: razorpayPayment.id, //here to pay-*** attention to the fact that this is the payment ID, not the order ID
        metadata: {
          ...paymentMetadata,
          razorpayPaymentId: razorpayPayment.id,
          razorpayPaymentStatus: razorpayPayment.status,
          webhookProcessedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Payment ${payment.id} marked as successful via webhook`);
  } catch (error) {
    this.logger.error(`Error handling payment.captured webhook: ${error.message}`);
  }
}


  /**
   * Handle payment.failed webhook event
   */
  private async handlePaymentFailed(razorpayPayment: any): Promise<void> {
    try {
      // Find the corresponding payment in our system
      const payment = await this.prisma.payment.findFirst({
        where: {
          gatewayPaymentId: razorpayPayment.order_id,
          paymentGateway: 'RAZORPAY',
        },
      });

      if (!payment) {
        this.logger.warn(
          `Payment not found for Razorpay order ${razorpayPayment.order_id}`,
        );
        return;
      }

      const paymentMetadata = (payment.metadata as Record<string, any>) || {};

      // Update payment status
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: PaymentStatus.FAILED as any,
          failedAt: new Date(),
          errorMessage: razorpayPayment.error_description || 'Payment failed',
          metadata: {
            ...paymentMetadata,
            razorpayPaymentId: razorpayPayment.id,
            razorpayPaymentStatus: razorpayPayment.status,
            razorpayErrorCode: razorpayPayment.error_code,
            razorpayErrorDescription: razorpayPayment.error_description,
            webhookProcessedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Payment ${payment.id} marked as failed via webhook`);
    } catch (error) {
      this.logger.error(
        `Error handling payment.failed webhook: ${error.message}`,
      );
    }
  }

  /**
   * Handle refund.processed webhook event
   */
  private async handleRefundProcessed(razorpayRefund: any): Promise<void> {
    try {
      const razorpayPaymentId = razorpayRefund.payment_id;

      // Find the payment in our database using a JSON query for metadata
      const payments = await this.prisma.payment.findMany({
        where: {
          paymentGateway: 'RAZORPAY',
        },
      });

      // Filter manually since Prisma's JSON querying may have limitations
      const payment = payments.find((p) => {
        const metadata = (p.metadata as Record<string, any>) || {};
        return metadata.razorpayPaymentId === razorpayPaymentId;
      });

      if (!payment) {
        this.logger.warn(
          `Payment not found for Razorpay payment ID ${razorpayPaymentId}`,
        );
        return;
      }
       

      const paymentMetadata = (payment.metadata as Record<string, any>) || {};

      // Determine refund status
      const refundAmount = razorpayRefund.amount / 100; // Convert from subunits
      const newStatus =
        refundAmount >= payment.amount
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;

      // Update payment status
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: newStatus as any,
          refundedAt: new Date(),
          metadata: {
            ...paymentMetadata,
            refundId: razorpayRefund.id,
            refundAmount: refundAmount,
            refundStatus: razorpayRefund.status,
            refundProcessedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Refund processed for payment ${payment.id} via webhook`);
    } catch (error) {
  this.logger.error(
    `Failed to process refund: ${error?.message || 'No error.message'}`,
    error?.stack || 'No error.stack',
  );

  // 🔍 Log full error object — forced serialization
  try {
    const serializedError = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
    this.logger.error(`Serialized Razorpay error: ${serializedError}`);
  } catch (serializationErr) {
    this.logger.error('Error serializing Razorpay error object:', serializationErr);
  }

  throw new BadRequestException(`Refund failed: ${error?.message || 'Unknown error'}`);
}


  }

  /**
   * Fetch payment details from Razorpay
   */
  async fetchRazorpayPaymentDetails(razorpayPaymentId: string): Promise<any> {
    try {
      const paymentDetails =
        await this.razorpay.payments.fetch(razorpayPaymentId);
      return paymentDetails;
    } catch (error) {
      this.logger.error(
        `Error fetching Razorpay payment details: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to fetch payment details: ${error.message}`,
      );
    }
  }

  /**
   * Create a Razorpay order without immediately processing payment
   */
  async createRazorpayOrder(
    amount: number,
    currency: string,
    receipt: string,
    notes?: Record<string, string>,
  ): Promise<any> {
    try {
      const amountInSubunits = Math.round(amount * 100);
      const order = await this.razorpay.orders.create({
        amount: amountInSubunits,
        currency,
        receipt,
        notes: notes || {},
      });

      this.logger.log(`Created Razorpay order: ${JSON.stringify(order)}`);
      return order;
    } catch (error) {
      this.logger.error(`Error creating Razorpay order: ${error.message}`);
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }
}
