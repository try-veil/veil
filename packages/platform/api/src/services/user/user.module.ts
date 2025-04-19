import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  providers: [
    UserService,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
