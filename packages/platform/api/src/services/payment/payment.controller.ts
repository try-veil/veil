import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { WalletService } from '../wallet/wallet.service';
import {
  PaymentDestinationType,
  PaymentMethodType,
} from '../../entities/billing/types';

// DTOs for request/response
class ProcessPaymentDto {
  userId: string;
  amount: number;
  paymentMethodType: PaymentMethodType;
  destinationType: PaymentDestinationType = PaymentDestinationType.INVOICE;
  destinationId: string = 'CREDIT_TOPUP';
  currency: string = 'USD';
  description?: string;
}

class RefundPaymentDto {
  amount?: number;
  reason?: string;
}

@Controller('internal/payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly walletService: WalletService,
  ) {}

  @Post('process')
  async processPayment(@Body() processPaymentDto: ProcessPaymentDto) {
    try {
      // Find wallet for user
      const wallet = await this.walletService.findWalletByUserId(
        processPaymentDto.userId,
      );
      if (!wallet) {
        throw new NotFoundException(
          `Wallet not found for user ${processPaymentDto.userId}`,
        );
      }

      // Process the payment
      const payment = await this.paymentService.processPayment({
        tenantId: wallet.tenantId,
        destinationType: processPaymentDto.destinationType,
        destinationId: processPaymentDto.destinationId,
        paymentMethodType: processPaymentDto.paymentMethodType,
        amount: processPaymentDto.amount,
        currency: processPaymentDto.currency,
        metadata: {
          userId: processPaymentDto.userId,
          walletId: wallet.id,
          description: processPaymentDto.description || 'Credit top-up',
        },
      });

      // If payment was successful, add credits to the wallet
      if (payment.paymentStatus === 'SUCCEEDED') {
        // Convert currency amount to credits (simplified 1:1 for this example)
        const creditsToAdd = processPaymentDto.amount;

        await this.walletService.addCredits(
          wallet.id,
          creditsToAdd,
          undefined,
          undefined,
          payment.id,
          processPaymentDto.description || 'Credit purchase',
        );

        return {
          payment_id: payment.id,
          status: payment.paymentStatus,
          amount: payment.amount,
          credits_added: creditsToAdd,
          processed_at: payment.succeededAt,
        };
      }

      return {
        payment_id: payment.id,
        status: payment.paymentStatus,
        amount: payment.amount,
        error: payment.errorMessage,
        processed_at: payment.failedAt || payment.updatedAt,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get(':paymentId')
  async getPayment(@Param('paymentId') paymentId: string) {
    try {
      const payment = await this.paymentService.getPayment(paymentId);

      return {
        payment_id: payment.id,
        status: payment.paymentStatus,
        amount: payment.amount,
        currency: payment.currency,
        created_at: payment.createdAt,
        processed_at: payment.succeededAt || payment.failedAt || null,
        error_message: payment.errorMessage || null,
      };
    } catch (error) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }
  }

  @Get(':paymentId/attempts')
  async getPaymentAttempts(@Param('paymentId') paymentId: string) {
    try {
      const payment = await this.paymentService.getPayment(paymentId);
      const attempts = await this.paymentService.getPaymentAttempts(paymentId);

      return {
        payment_id: payment.id,
        attempts: attempts.map((attempt) => ({
          attempt_id: attempt.id,
          attempt_number: attempt.attemptNumber,
          status: attempt.paymentStatus,
          created_at: attempt.createdAt,
          updated_at: attempt.updatedAt,
          error_message: attempt.errorMessage || null,
        })),
      };
    } catch (error) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }
  }

  @Post(':paymentId/refund')
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() refundPaymentDto: RefundPaymentDto,
  ) {
    try {
      const payment = await this.paymentService.getPayment(paymentId);

      // Get original payment metadata
      const walletId = payment.metadata?.walletId;
      if (!walletId) {
        throw new BadRequestException(
          'Cannot refund payment: missing wallet information',
        );
      }

      // Process the refund
      const refundedPayment = await this.paymentService.processRefund(
        paymentId,
        refundPaymentDto.amount,
      );

      // Deduct credits from wallet
      const refundAmount = refundPaymentDto.amount || payment.amount;
      await this.walletService.deductCredits(
        walletId,
        refundAmount,
        undefined,
        undefined,
        `REFUND_${payment.id}`,
        refundPaymentDto.reason || 'Payment refund',
      );

      return {
        payment_id: refundedPayment.id,
        status: refundedPayment.paymentStatus,
        refunded_amount: refundAmount,
        refunded_at: refundedPayment.refundedAt,
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }
}
