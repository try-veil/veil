import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthGuard } from './auth.guard';
import { RoleGuard } from './role.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, HttpModule],
  controllers: [AuthController],
  providers: [AuthGuard, AuthService, RoleGuard],
  exports: [AuthGuard, RoleGuard, HttpModule],
})
export class AuthModule { }
