import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RazorpayService } from './razorpay.service';
import { RazorpayController } from './razorpay.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [RazorpayController],
  providers: [RazorpayService, PrismaService],
  exports: [RazorpayService],
})
export class RazorpayModule {}