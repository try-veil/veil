import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayService } from './gateway.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    ConfigModule,
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 60 * 5 * 1000, // 5 hours in milliseconds
    }),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, GatewayService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
