import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CreditModule } from './credit/credit.module';
import { TenantModule } from './tenant/tenant.module';
import { ProjectModule } from './project/project.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { UserModule } from './user/user.module';
import { HubListingModule } from './hublisting/hublisting.module';
import { MarketplaceModule } from './marketplace/marketplace.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenantModule,
    WalletModule,
    PaymentModule,
    CreditModule,
    ProjectModule,
    OnboardingModule,
    UserModule,
    HubListingModule,
    MarketplaceModule
  ],
  exports: [
    PrismaModule,
    AuthModule,
    TenantModule,
    WalletModule,
    PaymentModule,
    CreditModule,
    ProjectModule,
    OnboardingModule,
    UserModule,
    HubListingModule,
    MarketplaceModule
  ],
})
export class ServicesModule {}
