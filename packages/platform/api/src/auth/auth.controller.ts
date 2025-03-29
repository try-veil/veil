import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto, SignupDto, AssignRoleDto, CreateApiKeyDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(
      signupDto.email,
      signupDto.password,
      signupDto.firstName,
      signupDto.lastName,
    );
  }

  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @ApiOperation({ summary: 'Validate FusionAuth token' })
  @ApiResponse({ status: 200, description: 'Token successfully validated' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  @Post('validate')
  async validateToken(@Body('token') token: string) {
    const user = await this.authService.validateUser(token);
    return this.authService.generateToken(user);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role successfully assigned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('assign-role')
  async assignRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.authService.assignRole(assignRoleDto.userId, assignRoleDto.roleName);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create API key' })
  @ApiResponse({ status: 201, description: 'API key successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: any) {
    return req.user;
  }
} 