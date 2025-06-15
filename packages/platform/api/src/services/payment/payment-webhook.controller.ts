import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

// endpoint: http://localhost:3000/payment/webhooks/razorpay
@ApiTags('payment-webhooks')
@Controller('webhooks/razorpay')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Handle Razorpay webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() rawBody: any,
  ) {
    this.logger.log(
      `Received webhook from Razorpay: ${JSON.stringify(rawBody)}`,
    );

    if (!signature) {
      throw new UnauthorizedException('Missing Razorpay signature');
    }

    try {
      // Convert raw body to string for signature verification
      const payload = JSON.stringify(rawBody);

      // Verify the webhook signature
      const isValid = this.paymentService.verifyWebhookSignature(
        payload,
        signature,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid webhook signature');
      }

      // Extract event details
      const eventType = rawBody.event;
      if (!eventType) {
        throw new BadRequestException('Missing event type');
      }

      this.logger.debug(`Passing payload to service: ${JSON.stringify(rawBody.payload, null, 2)}`);

      // Process the event
      await this.paymentService.processWebhookEvent(eventType, rawBody.payload);

      return {
        status: 'success',
        message: `Processed webhook event: ${eventType}`,
      };
    } catch (error) {
      this.logger.error(
        `Error processing webhook: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to process webhook: ${error.message}`,
      );
    }
  }
}
