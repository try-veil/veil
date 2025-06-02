import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentWebhookController } from './payment-webhook.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule], // Import WalletModule to use WalletService
  controllers: [PaymentController, PaymentWebhookController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
