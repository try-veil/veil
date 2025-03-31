import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, PrismaService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
