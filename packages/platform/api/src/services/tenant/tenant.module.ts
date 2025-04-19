import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [TenantController],
  providers: [
    TenantService,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [TenantService],
})
export class TenantModule {}
