import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule], // Import WalletModule to use WalletService
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
