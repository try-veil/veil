import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Headers,
  UnauthorizedException,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Query,
  Redirect,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginDto, SignupDto, AssignRoleDto, CreateApiKeyDto } from './dto';
import {
  ConflictException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common/exceptions';
import { validate } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    const errors = await validate(signupDto);
    if (errors.length > 0) {
      throw new BadRequestException('Invalid input data');
    }

    try {
      this.logger.log(`Signup request received for ${signupDto.email}`);

      const result = await this.authService.signup(
        signupDto.email,
        signupDto.password,
        signupDto.firstName,
        signupDto.lastName,
      );

      this.logger.log(`User created successfully: ${result.user.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Signup error: ${error.message || 'Unknown error'}`,
        error.stack || 'No stack trace',
      );

      if (
        error.status === 409 ||
        error instanceof ConflictException ||
        (error.statusCode === 400 &&
          error.response?.fieldErrors?.user?.email?.code ===
            '[duplicate]user.email')
      ) {
        throw new ConflictException('User with this email already exists');
      }

      throw new InternalServerErrorException('Signup failed, please try again');
    }
  }

  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const errors = await validate(loginDto);
    if (errors.length > 0) {
      throw new BadRequestException('Invalid login data');
    }

    this.logger.log(`Login attempt for ${loginDto.email}`);

    const result = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );
    if (!result) {
      this.logger.warn(`Login failed for ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in successfully: ${loginDto.email}`);
    return result;
  }

  @ApiOperation({ summary: 'Validate token' })
  @ApiResponse({ status: 200, description: 'Token successfully validated' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No or invalid token format provided');
    }

    const token = authHeader.split(' ')[1];
    this.logger.log('Validating token');

    return this.authService.validateToken(token);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role successfully assigned' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('assign-role')
  async assignRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.authService.assignRole(
      assignRoleDto.userId,
      assignRoleDto.roleName,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create API key' })
  @ApiResponse({ status: 201, description: 'API key successfully created' })
  @UseGuards(JwtAuthGuard)
  @Post('api-keys')
  async createApiKey(
    @Req() req: any,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    return this.authService.createApiKey(req.user.id, createApiKeyDto.name);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile successfully retrieved' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: any) {
    return req.user;
  }

  @ApiOperation({ summary: 'Initiate GitHub connection for user' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to FusionAuth OAuth with GitHub idp_hint',
  })
  @Get('github')
  @Redirect()
  async initiateGithubLogin() {
    this.logger.log('Initiating GitHub login flow');
    const { url, state } = await this.authService.getOAuthRedirectUrl('github');

    return { url };
  }

  @ApiOperation({ summary: 'Auth callback handler' })
  @ApiResponse({
    status: 302,
    description: 'Redirects after successful authentication',
  })
  @Get('callback')
  async authCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    try {
      if (error) {
        this.logger.error(
          `Authentication error: ${error} - ${errorDescription}`,
        );
        return res.redirect(
          `/auth/error?message=${encodeURIComponent(errorDescription || 'Authentication failed')}`,
        );
      }

      if (!code) {
        this.logger.error('No code provided in callback');
        return res.redirect(
          `/auth/error?message=${encodeURIComponent('No authorization code received')}`,
        );
      }

      this.logger.log('Processing authentication code from FusionAuth');
      const tokensResponse = await this.authService.exchangeCodeForTokens(code);
      const user = await this.authService.findOrCreateUser(tokensResponse.jwt);
      res.cookie('access_token', tokensResponse.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000,
      });

      const frontendUrl = this.configService.get('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/login-success?userId=${user.id}`);
    } catch (error) {
      this.logger.error(
        `Authentication callback error: ${error.message}`,
        error.stack,
      );
      return res.redirect(
        `/auth/error?message=${encodeURIComponent('Authentication failed')}`,
      );
    }
  }

  @ApiOperation({ summary: 'Auth error page' })
  @Get('error')
  authError(@Query('message') message: string) {
    return { error: true, message: message || 'Authentication error' };
  }
}
