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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

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

class CapturePaymentDto {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  amount: number;
  razorpaySignature?: string;
}

@ApiTags('payment')
@Controller('internal/payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly walletService: WalletService,
  ) {}

  @Post('process')
  @ApiOperation({ summary: 'Process a payment and add credits to wallet' })
  @ApiBody({ type: ProcessPaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment processed successfully',
    schema: {
      type: 'object',
      properties: {
        payment_id: { type: 'string' },
        order_id: { type: 'string' },
        status: { type: 'string' },
        amount: { type: 'number' },
        credits_added: { type: 'number' },
        processed_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Payment failed',
    schema: {
      type: 'object',
      properties: {
        payment_id: { type: 'string' },
        status: { type: 'string' },
        amount: { type: 'number' },
        error: { type: 'string' },
        processed_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async processPayment(@Body() processPaymentDto: ProcessPaymentDto) {
    try {
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

      // TODO: This route should be create order, not process payment
      // The payment status will be updated by the webhook
      // TODO: Redeisgn the routes: this route can never respond SUCCEEDED, it will only create order
      // Frontend will use orderId to pay
      // Will have to capture webhook to decide if payment was successful or not
      // If payment was successful, add credits to the wallet
      if (payment.paymentStatus === 'SUCCEEDED') {
        // Convert currency amount to credits (simplified 1:1 for this example)
        const creditsToAdd = processPaymentDto.amount;

        // TODO: fix later -> Add credits to wallet (integrate walet service)
        await this.walletService.addCredits(
          wallet.id,
          creditsToAdd,
          undefined,
          undefined,
          payment.id,
          processPaymentDto.description || 'Credit purchase',
        );

        // IF status == PENDING or FAILED
        return {
          payment_id: payment.id,
          order_id: payment.orderId,
          status: payment.paymentStatus,
          amount: payment.amount,
          credits_added: creditsToAdd,
          processed_at: payment.succeededAt,
        };
      }

      return {
        payment_id: payment.id,
        order_id: payment.orderId,
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
  @ApiOperation({ summary: 'Get payment details' })
  @ApiParam({ name: 'paymentId', description: 'The payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns payment details',
    schema: {
      type: 'object',
      properties: {
        payment_id: { type: 'string' },
        status: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        processed_at: { type: 'string', format: 'date-time', nullable: true },
        error_message: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
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
  @ApiOperation({ summary: 'Get payment attempt history' })
  @ApiParam({ name: 'paymentId', description: 'The payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns payment attempt history',
    schema: {
      type: 'object',
      properties: {
        payment_id: { type: 'string' },
        attempts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              attempt_id: { type: 'string' },
              attempt_number: { type: 'number' },
              status: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              error_message: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
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
  @ApiOperation({ summary: 'Refund a payment and deduct credits from wallet' })
  @ApiParam({ name: 'paymentId', description: 'The payment ID' })
  @ApiBody({ type: RefundPaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment refunded successfully',
    schema: {
      type: 'object',
      properties: {
        payment_id: { type: 'string' },
        status: { type: 'string' },
        refunded_amount: { type: 'number' },
        refunded_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
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

  @Post('capture')
  @ApiOperation({ summary: 'Capture a payment after Razorpay checkout' })
  @ApiBody({ type: CapturePaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment captured successfully',
    schema: {
      type: 'object',
      properties: {
        payment_id: { type: 'string' },
        status: { type: 'string' },
        amount: { type: 'number' },
        processed_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async capturePayment(@Body() capturePaymentDto: CapturePaymentDto) {
    try {
      const payment = await this.paymentService.captureRazorpayPayment(
        capturePaymentDto.razorpayPaymentId,
        capturePaymentDto.amount,
        capturePaymentDto.razorpayOrderId
      );

      // If successful, find wallet and add credits
      if (payment.paymentStatus === 'SUCCEEDED' && payment.metadata?.userId && payment.metadata?.walletId) {
        const walletId = payment.metadata.walletId as string;
        const creditsToAdd = payment.amount;

        await this.walletService.addCredits(
          walletId,
          creditsToAdd,
          undefined,
          undefined,
          payment.id,
          payment.metadata?.description as string || 'Credit purchase via Razorpay',
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
        processed_at: payment.succeededAt || payment.updatedAt,
      };
    } catch (error) {
      throw new BadRequestException(`Payment capture failed: ${error.message}`);
    }
  }
}
