import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { AuthGuard } from './auth.guard';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class RoleGuard extends AuthGuard {
  constructor(
    configService: ConfigService,
    prisma: PrismaService,
    http: HttpService,
    reflector: Reflector,
  ) {
    super(configService, prisma, http, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check if the user is authenticated
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    // Get the required roles
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get the user from the request
    const { user } = context.switchToHttp().getRequest();

    // console.log(
    //   { requiredRoles },
    //   requiredRoles.some((role) => user.jwt.roles?.includes(role)),
    // );

    // Check if user has any of the required roles
    return requiredRoles.some((role) => user.jwt.roles?.includes(role));
  }
}
