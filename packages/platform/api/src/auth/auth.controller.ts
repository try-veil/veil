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
  Delete
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto, SignupDto, AssignRoleDto, CreateApiKeyDto } from './dto';
import { ConflictException, HttpException, InternalServerErrorException } from '@nestjs/common/exceptions';
import { validate } from 'class-validator';
import { GithubLoginDto } from './dto/github.dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Request, Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
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
        signupDto.lastName
      );

      this.logger.log(`User created successfully: ${result.user.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Signup error: ${error.message || 'Unknown error'}`, error.stack || 'No stack trace');
      
      if (error.status === 409 || error instanceof ConflictException ||
          (error.statusCode === 400 && error.response?.fieldErrors?.user?.email?.code === '[duplicate]user.email')) {
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
    
    const result = await this.authService.login(loginDto.email, loginDto.password);
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
    return this.authService.assignRole(assignRoleDto.userId, assignRoleDto.roleName);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create API key' })
  @ApiResponse({ status: 201, description: 'API key successfully created' })
  @UseGuards(JwtAuthGuard)
  @Post('api-keys')
  async createApiKey(@Req() req: any, @Body() createApiKeyDto: CreateApiKeyDto) {
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

  @ApiOperation({ summary: 'Initiate GitHub login flow' })
  @ApiResponse({ status: 302, description: 'Redirects to GitHub' })
  @UseGuards(JwtAuthGuard)
  @Get('github')
  @Redirect()
  async initiateGithubConnect(@Req() req: any, @Res() res: Response) {
    this.logger.log(`Initiating GitHub connection for user ${req.user.id}`);

    const state = require('crypto').randomBytes(16).toString('hex');
    
    if (!req.session) {
      req.session = {};
    }
    
    req.session.githubOAuthState = state;
    req.session.fusionAuthId = req.user.id;

    const clientId = this.configService.get('GITHUB_CLIENT_ID');
    const redirectUri = this.configService.get('GITHUB_REDIRECT_URI');
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=repo`;

    return { url };
  }

  @ApiOperation({ summary: 'Handle FusionAuth callback after GitHub login' })
  @ApiResponse({ status: 302, description: 'Redirects after successful login' })
  @Get('callback')
  async authCallback(
    @Query('code') code: string,
    @Query('userState') userState: string,
    @Req() req: any,
    @Res() res: Response
  ) {
    try {
      if (!code) {
        this.logger.error('No code provided in callback');
        res.redirect(`/auth/error?message=${encodeURIComponent('No authorization code received')}`);
        return;
      }

      this.logger.log('Processing authentication code from FusionAuth');

      // Exchange the code for tokens using FusionAuth's token endpoint
      const exchangeResponse = await this.authService.exchangeCodeForTokens(code);

      // Get or create user based on the FusionAuth JWT
      const user = await this.authService.findOrCreateUser(exchangeResponse.jwt);

      // Set cookies
      res.cookie('access_token', exchangeResponse.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000
      });

      // Redirect to frontend
      const frontendUrl = this.configService.get('FRONTEND_URL');
      res.redirect(`${frontendUrl}/login-success?userId=${user.id}`);
      return;
    } catch (error) {
      this.logger.error(`Authentication callback error: ${error.message}`, error.stack);
      res.redirect(`/auth/error?message=${encodeURIComponent('Authentication failed')}`);
      return;
    }
  }

  @ApiOperation({ summary: 'Handle GitHub OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects after successful connection' })
  @Get('github-callback')
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: any,
    @Res() res: Response
  ) {
    try {
      if (!code) {
        this.logger.error('No code provided in GitHub callback');
        return res.redirect(`/auth/error?message=${encodeURIComponent('No authorization code received')}`);
      }

      // Verify state to prevent CSRF
      const expectedState = req.session?.githubOAuthState;
      const fusionAuthId = req.session?.fusionAuthId;

      // Clear session data
      if (req.session) {
        req.session.githubOAuthState = null;
        req.session.fusionAuthId = null;
      }

      if (!expectedState || expectedState !== state) {
        this.logger.error(`State mismatch: Expected ${expectedState}, Received ${state}`);
        return res.redirect(`/auth/error?message=${encodeURIComponent('Invalid state parameter')}`);
      }

      if (!fusionAuthId) {
        this.logger.error('No FusionAuth ID found in session');
        return res.redirect(`/auth/error?message=${encodeURIComponent('Authentication session expired')}`);
      }

      // Exchange code for GitHub token
      const tokenResponse = await this.authService.exchangeCodeForToken(code);
      const accessToken = tokenResponse.access_token;

      if (!accessToken) {
        throw new UnauthorizedException('Failed to get GitHub access token');
      }

      // Get user info from GitHub
      const githubUser = await this.authService.getGitHubUserInfo(accessToken);

      if (!githubUser || !githubUser.id) {
        throw new HttpException('Failed to get GitHub user info', HttpStatus.BAD_REQUEST);
      }

      // Find user by FusionAuth ID
      const user = await this.prisma.user.findUnique({
        where: { fusionAuthId },
        include: { roles: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Update user with GitHub info
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          githubId: githubUser.id.toString(),
          githubUsername: githubUser.login,
          githubAccessToken: accessToken,
          updatedAt: new Date()
        }
      });

      // Redirect to frontend with success message
      const frontendUrl = this.configService.get('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/github-connected?success=true`);
    } catch (error) {
      this.logger.error(`GitHub callback error: ${error.message}`, error.stack);
      return res.redirect(`/auth/error?message=${encodeURIComponent('GitHub connection failed')}`);
    }
  }

  @ApiOperation({ summary: 'Auth error page' })
  @Get('error')
  authError(@Query('message') message: string) {
    return { error: true, message: message || 'Authentication error' };
  }

  @ApiOperation({ summary: 'Login with GitHub (API)' })
  @ApiResponse({ status: 200, description: 'User successfully logged in with GitHub' })
  @ApiResponse({ status: 401, description: 'GitHub authentication failed' })
  @Post('github-login')
  @HttpCode(HttpStatus.OK)
  async githubLogin(@Body() githubLoginDto: GithubLoginDto) {
    this.logger.log('GitHub login attempt via API');
    const result = await this.authService.loginWithGithub(githubLoginDto.code);
    this.logger.log('GitHub login successful');
    return result;
  }

  @ApiOperation({ summary: 'Revoke GitHub authorization' })
  @ApiResponse({ status: 200, description: 'Successfully revoked GitHub authorization' })
  @UseGuards(JwtAuthGuard)
  @Delete('github-disconnect')
  async revokeGitHubAuth(@Req() req: any) {
    this.logger.log(`Revoking GitHub authorization for user ${req.user.id}`);
    return this.authService.revokeGitHubAuth(req.user.id);
  }
}