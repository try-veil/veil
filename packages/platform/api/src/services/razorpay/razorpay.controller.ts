import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  BadRequestException,
  NotFoundException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { RazorpayService, PaymentVerificationData, WebhookPayload } from './razorpay.service';

// DTOs for request/response
class CreateOrderDto {
  amount: number;
  currency?: string = 'INR';
  userId: string;
  purpose: string = 'credits';
  creditAmount: number;
  metadata?: Record<string, any>;
}

class VerifyPaymentDto {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

@ApiTags('razorpay')
@Controller('internal/razorpay')
export class RazorpayController {
  private readonly logger = new Logger(RazorpayController.name);

  constructor(private readonly razorpayService: RazorpayService) {}

  @Post('create-order')
  @ApiOperation({ summary: 'Create a Razorpay order for payment processing' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string' },
            created_at: { type: 'number' },
          },
        },
        key_id: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    try {
      this.logger.log(`Creating order for user: ${createOrderDto.userId}, amount: ${createOrderDto.amount}`);

      const order = await this.razorpayService.createOrder(
        createOrderDto.amount,
        createOrderDto.currency,
        {
          userId: createOrderDto.userId,
          purpose: createOrderDto.purpose,
          creditAmount: createOrderDto.creditAmount,
          ...createOrderDto.metadata,
        },
      );

      return {
        success: true,
        order,
        key_id: process.env.RAZORPAY_KEY_ID, // Frontend needs this for payment form
      };
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`, error.stack);
      throw new BadRequestException(error.message);
    }
  }

  @Post('verify-payment')
  @ApiOperation({ summary: 'Verify payment signature and process payment confirmation' })
  @ApiBody({ type: VerifyPaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment verified successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        verified: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Payment verification failed' })
  async verifyPayment(@Body() verifyPaymentDto: VerifyPaymentDto) {
    try {
      this.logger.log(`Verifying payment: ${verifyPaymentDto.razorpay_payment_id}`);

      const isValid = await this.razorpayService.verifyPayment(
        verifyPaymentDto.razorpay_payment_id,
        verifyPaymentDto.razorpay_order_id,
        verifyPaymentDto.razorpay_signature,
      );

      if (isValid) {
        this.logger.log(`Payment verification successful: ${verifyPaymentDto.razorpay_payment_id}`);
        return {
          success: true,
          verified: true,
          message: 'Payment verified successfully',
        };
      } else {
        this.logger.warn(`Payment verification failed: ${verifyPaymentDto.razorpay_payment_id}`);
        throw new BadRequestException('Payment verification failed');
      }
    } catch (error) {
      this.logger.error(`Payment verification error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message);
    }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Razorpay webhook events' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Webhook processing failed' })
  async handleWebhook(
    @Body() payload: WebhookPayload,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    try {
      this.logger.log(`Received webhook event: ${payload.event}`);

      if (!signature) {
        throw new BadRequestException('Missing webhook signature');
      }

      await this.razorpayService.handleWebhook(payload, signature);

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      throw new BadRequestException(error.message);
    }
  }

  @Get('payment/:paymentId')
  @ApiOperation({ summary: 'Get payment details from Razorpay' })
  @ApiParam({ name: 'paymentId', description: 'The Razorpay payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        payment: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentDetails(@Param('paymentId') paymentId: string) {
    try {
      this.logger.log(`Retrieving payment details: ${paymentId}`);

      const payment = await this.razorpayService.getPaymentDetails(paymentId);

      return {
        success: true,
        payment,
      };
    } catch (error) {
      this.logger.error(`Failed to get payment details: ${error.message}`, error.stack);
      if (error.message.includes('not found')) {
        throw new NotFoundException(`Payment ${paymentId} not found`);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get order details from Razorpay' })
  @ApiParam({ name: 'orderId', description: 'The Razorpay order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        order: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderDetails(@Param('orderId') orderId: string) {
    try {
      this.logger.log(`Retrieving order details: ${orderId}`);

      const order = await this.razorpayService.getOrderDetails(orderId);

      return {
        success: true,
        order,
      };
    } catch (error) {
      this.logger.error(`Failed to get order details: ${error.message}`, error.stack);
      if (error.message.includes('not found')) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Post('refund/:paymentId')
  @ApiOperation({ summary: 'Process refund for a payment' })
  @ApiParam({ name: 'paymentId', description: 'The Razorpay payment ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Refund amount (optional, full refund if not provided)' },
        reason: { type: 'string', description: 'Reason for refund' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        refund: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Refund processing failed' })
  async processRefund(
    @Param('paymentId') paymentId: string,
    @Body() refundData: { amount?: number; reason?: string },
  ) {
    try {
      this.logger.log(`Processing refund for payment: ${paymentId}`);

      const refund = await this.razorpayService.processRefund(paymentId, refundData.amount);

      return {
        success: true,
        refund,
      };
    } catch (error) {
      this.logger.error(`Failed to process refund: ${error.message}`, error.stack);
      throw new BadRequestException(error.message);
    }
  }

  @Post('generate-test-signature')
  @ApiOperation({ summary: 'Generate test signature for payment verification testing' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'Razorpay order ID' },
        payment_id: { type: 'string', description: 'Test payment ID' },
      },
      required: ['order_id', 'payment_id'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Test signature generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        signature: { type: 'string' },
        order_id: { type: 'string' },
        payment_id: { type: 'string' },
      },
    },
  })
  async generateTestSignature(@Body() body: { order_id: string; payment_id: string }) {
    try {
      this.logger.log(`Generating test signature for order: ${body.order_id}, payment: ${body.payment_id}`);

      const signature = await this.razorpayService.generateTestSignature(
        body.order_id,
        body.payment_id,
      );

      return {
        success: true,
        signature,
        order_id: body.order_id,
        payment_id: body.payment_id,
      };
    } catch (error) {
      this.logger.error(`Failed to generate test signature: ${error.message}`, error.stack);
      throw new BadRequestException(error.message);
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Check Razorpay service health' })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        configured: { type: 'boolean' },
        timestamp: { type: 'string' },
      },
    },
  })
  async healthCheck() {
    const configured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    
    return {
      status: configured ? 'healthy' : 'not_configured',
      configured,
      timestamp: new Date().toISOString(),
    };
  }
}