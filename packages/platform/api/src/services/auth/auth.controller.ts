import {
  Controller,
  Get,
  Headers,
  UseGuards,
  UnauthorizedException,
  Body,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard, Role } from './auth.guard';
import { SignupDto } from './dto/signup.dto';
import { ConfigService } from '@nestjs/config';

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
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

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

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  /**
   * Returns the Grafana SSO launch URL for the currently authenticated provider.
   */
  @Get('grafana-login-url')
  @UseGuards(AuthGuard)
  @Role('provider')
  async grafanaLoginUrl(@Body() body: any, @Headers('authorization') auth: string) {
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('No valid authorization token provided');
    }
    const token = auth.split(' ')[1];
    const user = await this.authService.validateToken(token);
    const dbUser = await this.authService['prisma'].user.findUnique({ where: { fusionAuthId: user.sub } });
    const dashboardUid = dbUser?.grafanaDashboardUid;
    if (!dashboardUid) {
      throw new Error('Grafana dashboard not provisioned for this user');
    }
    const base = this.config.get<string>('GRAFANA_URL');
    const loginUrl = `${base}/login/generic_oauth?rd=/d/${dashboardUid}`;
    return { loginUrl };
  }

  @Post('provision-grafana')
  @UseGuards(AuthGuard)
  @Role('provider')
  async provisionGrafana(@Req() req) {
    const user = req.user;
    // Use user.slugifiedName and user.email
    await this.authService.provisionGrafanaResourcesForUser(user.slugifiedName, user.email);
    return { success: true };
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
