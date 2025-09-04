import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CreditModule } from './credit/credit.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { TenantModule } from './tenant/tenant.module';
import { ProjectModule } from './project/project.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { UserModule } from './user/user.module';
import { HubListingModule } from './hublisting/hublisting.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PlanModule } from './plan/plan.module';
import { RazorpayModule } from './razorpay/razorpay.module';


@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenantModule,
    WalletModule,
    PaymentModule,
    CreditModule,
    SubscriptionModule,
    PlanModule,
    ProjectModule,
    OnboardingModule,
    UserModule,
    HubListingModule,
    MarketplaceModule,
    RazorpayModule,
  ],
  exports: [
    PrismaModule,
    AuthModule,
    TenantModule,
    WalletModule,
    PaymentModule,
    CreditModule,
    SubscriptionModule,
    PlanModule,
    ProjectModule,
    OnboardingModule,
    UserModule,
    HubListingModule,
    MarketplaceModule,
    RazorpayModule,
  ],
})
export class ServicesModule {}
