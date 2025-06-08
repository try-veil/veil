import { Module } from '@nestjs/common';
import { HubListingService } from './hublisting.service';
import { HubListingController } from './hublisting.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports:[PrismaModule,HttpModule,ConfigModule],
  controllers: [HubListingController],
  providers: [HubListingService, PrismaService],
  exports: [HubListingService]
})
export class HubListingModule {}
