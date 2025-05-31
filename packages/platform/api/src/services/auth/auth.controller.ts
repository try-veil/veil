import {
  Controller,
  Get,
  Headers,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard, Role } from './auth.guard';

export interface TokenValidationResponse {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  jti: string;
  authenticationType: string;
  applicationId: string;
  roles: string[];
  auth_time: number;
  tid: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('validate')
  async validateToken(
    @Headers('authorization') auth: string,
  ): Promise<TokenValidationResponse> {
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('No valid authorization token provided');
    }
    const token = auth.split(' ')[1];
    return this.authService.validateToken(token);
  }

  @Get('consumer-only')
  @Role('consumer')
  @UseGuards(AuthGuard)
  async consumerOnly() {
    return { message: 'Access granted to consumer' };
  }

  @Get('provider-only')
  @Role('provider')
  @UseGuards(AuthGuard)
  async providerOnly() {
    return { message: 'Access granted to provider' };
  }
}
