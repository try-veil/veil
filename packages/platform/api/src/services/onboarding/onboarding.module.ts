import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayService } from './gateway.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, HttpModule, ConfigModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, GatewayService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
