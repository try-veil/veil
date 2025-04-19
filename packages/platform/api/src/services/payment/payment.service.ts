import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Convert Prisma Payment to Entity Payment
   */
  private mapToPayment(prismaPayment: any): Payment {
    return {
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
   * Process a payment (mock implementation)
   */
  async processPayment(data: {
    tenantId: string;
    destinationType: PaymentDestinationType;
    destinationId: string;
    paymentMethodType: PaymentMethodType;
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
  }): Promise<Payment> {
    const idempotencyKey = uuidv4(); // In a real system, this would be provided by the client

    // Create payment record
    const prismaPayment = await this.prisma.payment.create({
      data: {
        id: uuidv4(),
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
    });

    // Simulate payment processing
    const processedPayment =
      await this.simulatePaymentProcessing(prismaPayment);
    return this.mapToPayment(processedPayment);
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
   * Process refund
   */
  async processRefund(paymentId: string, amount?: number): Promise<Payment> {
    // Get payment
    const payment = await this.getPayment(paymentId);

    if (payment.paymentStatus !== 'SUCCEEDED') {
      throw new Error('Cannot refund a payment that is not successful');
    }

    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
      throw new Error('Refund amount cannot exceed original payment amount');
    }

    // Update payment status
    const newStatus =
      refundAmount === payment.amount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    // Update payment
    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: newStatus as any, // Prisma enum conversion
        refundedAt: new Date(),
      },
    });

    return this.mapToPayment(updatedPayment);
  }

  /**
   * Private method to simulate payment processing
   * In a real implementation, this would call a payment gateway
   */
  private async simulatePaymentProcessing(payment: any): Promise<any> {
    // Create a payment attempt
    const attempt = await this.prisma.paymentAttempt.create({
      data: {
        id: uuidv4(),
        tenantId: payment.tenantId,
        paymentId: payment.id,
        attemptNumber: 1,
        paymentStatus: PaymentAttemptStatus.PROCESSING as any, // Prisma enum conversion
      },
    });

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate success (90% of the time)
    const isSuccessful = Math.random() < 0.9;

    if (isSuccessful) {
      // Update attempt
      await this.prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          paymentStatus: PaymentAttemptStatus.SUCCEEDED as any, // Prisma enum conversion
        },
      });

      // Update payment
      return this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: PaymentStatus.SUCCEEDED as any, // Prisma enum conversion
          succeededAt: new Date(),
        },
      });
    } else {
      // Update attempt
      await this.prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          paymentStatus: PaymentAttemptStatus.FAILED as any, // Prisma enum conversion
          errorMessage: 'Payment failed',
        },
      });

      // Update payment
      return this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: PaymentStatus.FAILED as any, // Prisma enum conversion
          failedAt: new Date(),
          errorMessage: 'Payment failed',
        },
      });
    }
  }
}
