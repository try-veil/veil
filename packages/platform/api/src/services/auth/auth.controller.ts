import {
  Controller,
  Get,
  Headers,
  UseGuards,
  UnauthorizedException,
  Body,
  Post,
  Req,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard, Role } from './auth.guard';
import { SignupDto } from './dto/signup.dto';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

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
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) { }

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
    try {
      this.logger.debug(`Processing signup request for: ${dto.email} with role: ${dto.role}`);

      const result = await this.authService.signup(dto);

      // Enhanced response handling with improved error messages
      if (dto.role === 'provider') {
        const response = {
          success: true,
          user: result.user,
          tokens: result.tokens,
          grafana: {
            success: result.grafana?.success || false,
            dashboardUid: result.grafana?.dashboardUid,
            loginUrl: result.grafana?.loginUrl,
            error: result.grafana?.error,
            message: result.grafana?.message || (result.grafana?.success
              ? 'Your Grafana dashboard has been successfully set up and is ready for use!'
              : 'There was an issue setting up your dashboard. Please contact support for assistance.')
          }
        };

        if (!result.grafana?.success) {
          this.logger.warn(`Signup completed for ${dto.email} but Grafana provisioning failed: ${result.grafana?.error}`);
        } else {
          this.logger.debug(`Signup completed successfully for provider: ${dto.email} with Grafana provisioning`);
        }

        return response;
      }

      // For consumers, return simplified response
      return {
        success: true,
        user: result.user,
        tokens: result.tokens,
        message: 'Signup completed successfully!'
      };

    } catch (error) {
      this.logger.error(`Signup failed for ${dto.email}:`, error.message);

      // Enhanced error handling with user-friendly messages
      if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        throw new HttpException(
          'An account with this email already exists. Please try logging in instead.',
          HttpStatus.CONFLICT
        );
      }

      if (error.message?.includes('Invalid credentials')) {
        throw new HttpException(
          'Invalid email or password format. Please check your credentials and try again.',
          HttpStatus.BAD_REQUEST
        );
      }

      if (error.message?.includes('FusionAuth')) {
        throw new HttpException(
          'Authentication service is temporarily unavailable. Please try again in a few minutes.',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      // Generic error for unknown issues
      throw new HttpException(
        'Signup failed due to an unexpected error. Please try again or contact support if the problem persists.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get standard Grafana login URL (same for all providers)
   */
  @Get('grafana-login-url')
  @UseGuards(AuthGuard)
  @Role('provider')
  async grafanaLoginUrl() {
    const grafanaBase = this.config.get<string>('GRAFANA_URL');
    const loginUrl = `${grafanaBase}/login/generic_oauth`;

    return {
      success: true,
      loginUrl,
      message: 'Use this URL to login to Grafana with your FusionAuth credentials'
    };
  }

  @Post('provision-grafana')
  @UseGuards(AuthGuard)
  @Role('provider')
  async provisionGrafana(@Req() req: any, @Body() body?: { password?: string }) {
    try {
      const user = req.user;
      this.logger.debug(`Manual Grafana provisioning requested for: ${user.email}`);

      // For manual provisioning, use provided password or generate a random one
      const password = body?.password || require('crypto').randomBytes(12).toString('base64');

      // Use the full provisioning method for manual requests
      const result = await this.authService['grafana'].provisionUserResources(user.email, user.fusionAuthId, password);

      const response = {
        success: result.success,
        message: result.success ? 'Grafana resources provisioned successfully' : 'Grafana provisioning failed',
        dashboardUid: result.dashboardUid,
        loginUrl: result.loginUrl,
        grafanaUserId: result.grafanaUserId,
        error: result.error
      };

      // If we generated a random password, inform the user
      if (!body?.password && result.success) {
        response.message += '. Note: A random password was set for Grafana. Use OAuth login for seamless access.';
      }

      return response;

    } catch (error) {
      this.logger.error(`Manual Grafana provisioning failed for ${req.user?.email}:`, error.message);

      throw new HttpException(
        `Grafana provisioning failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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