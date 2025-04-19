import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CreditModule } from './credit/credit.module';
import { TenantModule } from './tenant/tenant.module';
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenantModule,
    WalletModule,
    PaymentModule,
    CreditModule,
  ],
  exports: [
    PrismaModule,
    AuthModule,
    TenantModule,
    WalletModule,
    PaymentModule,
    CreditModule,
  ],
})
export class ServicesModule {}
