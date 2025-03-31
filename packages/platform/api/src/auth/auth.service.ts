import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { FusionAuthClient } from '@fusionauth/typescript-client';
import * as crypto from 'crypto';
import { MockFusionAuthClient } from 'test/fusionauth-mock';

@Injectable()
export class AuthService {
  private fusionAuthClient: any;
  private readonly logger = new Logger(AuthService.name);
  private readonly isTestEnvironment: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    this.isTestEnvironment = this.configService.get('NODE_ENV') === 'test';

    const apiKey = this.configService.get('FUSION_AUTH_API_KEY');
    const url = this.configService.get('FUSION_AUTH_URL');
    const appId = this.configService.get('FUSION_AUTH_APPLICATION_ID');

    this.logger.log(
      `Initializing AuthService with FusionAuth settings: URL=${url}, APP_ID=${appId}, API_KEY=${apiKey?.substring(0, 3)}...`,
    );

    if (!apiKey || !url || !appId) {
      this.logger.error(
        'Missing FusionAuth configuration! Please check your environment variables.',
      );
    }

    if (
      this.isTestEnvironment &&
      this.configService.get('USE_MOCK_FUSIONAUTH') === 'true'
    ) {
      this.logger.log('Using mock FusionAuth client for tests');
      this.fusionAuthClient = new MockFusionAuthClient(apiKey, url);
    } else {
      this.logger.log('Using real FusionAuth client');
      try {
        this.fusionAuthClient = new FusionAuthClient(apiKey, url);
      } catch (error) {
        this.logger.error(
          `Failed to initialize FusionAuth client: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }
  }

  async exchangeCodeForTokens(code: string, redirectUri?: string) {
    try {
      const clientId = this.configService.get('FUSION_AUTH_APPLICATION_ID');
      const clientSecret = this.configService.get('FUSION_AUTH_CLIENT_SECRET');
      const defaultRedirectUri = this.configService.get(
        'FUSION_AUTH_REDIRECT_URI',
      );

      if (!clientId || !clientSecret || !defaultRedirectUri) {
        this.logger.error('Missing OAuth configuration for exchanging code');
        throw new HttpException(
          'OAuth configuration error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      this.logger.debug(
        `FusionAuth Client: ${JSON.stringify(this.fusionAuthClient)}`,
      );
      this.logger.debug(
        `Attempting to exchange code: ${code.substring(0, 5)}... for token using redirect: ${redirectUri || defaultRedirectUri}`,
      );
      const response =
        await this.fusionAuthClient.exchangeOAuthCodeForAccessToken(
          code, 
          clientId,
          clientSecret,
          redirectUri || defaultRedirectUri,
        );
      this.logger.log(`FusionAuth response: ${JSON.stringify(response)}`);
      if (!response.wasSuccessful()) {
        this.logger.error(
          `FusionAuth token exchange failed with status: ${response.statusCode}, error: ${
            response.exception?.message || 'Unknown error'
          }`,
        );
        throw new HttpException(
          'Failed to complete authentication',
          HttpStatus.BAD_REQUEST,
        );
      }

      return response.response;
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      const errorStack = error.stack || 'No stack trace available';
      const errorResponse = error.response
        ? JSON.stringify(error.response)
        : 'No response data';

      this.logger.error(`Failed to exchange code for tokens: ${errorMessage}`);
      this.logger.error(`Error stack: ${errorStack}`);
      this.logger.error(`Error response: ${errorResponse}`);
      if (error.statusCode) {
        this.logger.error(`FusionAuth status code: ${error.statusCode}`);
      }

      throw new HttpException(
        'Failed to complete authentication',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async signup(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ) {
    try {
      this.logger.log(
        `Attempting to register new user with FusionAuth: ${email}`,
      );

      const response = await this.fusionAuthClient.register(null, {
        registration: {
          applicationId: this.configService.get('FUSION_AUTH_APPLICATION_ID'),
        },
        user: {
          email,
          password,
          firstName,
          lastName,
        },
      });

      if (response.wasSuccessful()) {
        this.logger.debug(`FusionAuth registration successful for ${email}`);

        const user = await this.findOrCreateUser({
          sub: response.response.user.id,
          email: response.response.user.email,
          given_name: response.response.user.firstName,
          family_name: response.response.user.lastName,
        });

        return {
          fusion_auth_token: response.response.token,
          ...this.generateToken(user),
        };
      } else {
        throw new ConflictException('User registration failed');
      }
    } catch (error) {
      if (
        error.statusCode === 400 &&
        error.response?.fieldErrors?.user?.email?.code ===
          '[duplicate]user.email'
      ) {
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }

  async login(email: string, password: string) {
    try {
      this.logger.debug(`Attempting to login user with FusionAuth: ${email}`);

      const response = await this.fusionAuthClient.login({
        applicationId: this.configService.get('FUSION_AUTH_APPLICATION_ID'),
        loginId: email,
        password,
      });

      if (response.wasSuccessful()) {
        this.logger.debug(`FusionAuth login successful for ${email}`);
        if (!response.response.user || !response.response.user.id) {
          throw new Error('FusionAuth returned success but no valid user data');
        }

        const user = await this.findOrCreateUser({
          sub: response.response.user.id,
          email: response.response.user.email,
          given_name: response.response.user.firstName,
          family_name: response.response.user.lastName,
        });

        return {
          fusion_auth_token: response.response.token,
          ...this.generateToken(user),
        };
      } else {
        this.logger.error(
          `FusionAuth login returned non-success status: ${response.statusCode}`,
        );
        throw new UnauthorizedException('Invalid credentials');
      }
    } catch (error) {
      this.logger.error(
        `Login error: ${error.message || 'Unknown error'}`,
        error.stack || 'No stack trace',
      );

      // Provide more context for common auth errors
      if (error.statusCode === 404) {
        throw new UnauthorizedException('User not found');
      } else if (error.statusCode === 401 || error.statusCode === 403) {
        throw new UnauthorizedException('Invalid credentials');
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }

  async validateToken(token: string) {
    try {
      try {
        const payload = this.jwtService.verify(token);
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          include: { roles: true },
        });

        if (user) {
          return this.generateToken(user);
        }
      } catch (jwtError) {
        this.logger.debug('Not a valid local JWT, trying FusionAuth', jwtError);
      }

      const response = await this.fusionAuthClient.validateJWT(token);
      if (response.statusCode !== 200) {
        throw new UnauthorizedException('Invalid token');
      }

      const jwtPayload = response.response.jwt;
      const user = await this.findOrCreateUser(jwtPayload);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateToken(user);
    } catch (error) {
      this.logger.error('Token validation error', error);
      throw new UnauthorizedException('Invalid token: ' + error.message);
    }
  }

  async findOrCreateUser(tokenResponse: any) {
    let userInfo: {
      sub: any;
      email: any;
      given_name: any;
      name: any;
      family_name: any;
      github_id: any;
      github_login: any;
    };

    if (tokenResponse.userInfo) {
      userInfo = tokenResponse.userInfo;
    } else {
      try {
        const jwt = this.jwtService.decode(tokenResponse.access_token);
        userInfo = jwt;
        if (!userInfo.email && tokenResponse.userId) {
          const userResponse = await this.fusionAuthClient.retrieveUser(
            tokenResponse.userId,
          );
          if (userResponse.wasSuccessful()) {
            userInfo.email = userResponse.response.user.email;
            userInfo.given_name = userResponse.response.user.firstName;
            userInfo.family_name = userResponse.response.user.lastName;
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to decode JWT or retrieve user: ${error.message}`,
        );
        throw new HttpException('Invalid token format', HttpStatus.BAD_REQUEST);
      }
    }

    const fusionAuthUserId = userInfo.sub || tokenResponse.userId;

    if (!fusionAuthUserId) {
      this.logger.error('No user ID found in token response');
      throw new HttpException(
        'Invalid token: missing user ID',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!userInfo.email) {
      this.logger.error('No email found for user in token response');
      throw new HttpException(
        'Missing required user information: email',
        HttpStatus.BAD_REQUEST,
      );
    }

    let user = await this.prisma.user.findUnique({
      where: { fusionAuthId: fusionAuthUserId },
      include: { roles: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: userInfo.email,
          fusionAuthId: fusionAuthUserId,
          firstName: userInfo.given_name || userInfo.name,
          lastName: userInfo.family_name,
          githubId: userInfo.github_id,
          githubUsername: userInfo.github_login,
        },
        include: { roles: true },
      });
    }

    return user;
  }

  generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name),
      fusionAuthId: user.fusionAuthId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map((role: { name: any }) => role.name),
        githubUsername: user.githubUsername,
      },
    };
  }

  async assignRole(userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          connect: { id: role.id },
        },
      },
      include: { roles: true },
    });
  }

  async createApiKey(userId: string, name: string) {
    const key = this.generateApiKey();

    return this.prisma.apiKey.create({
      data: {
        key,
        name,
        userId,
      },
    });
  }

  private generateApiKey(): string {
    return (
      'veil_' + crypto.randomBytes(24).toString('base64').replace(/[+/=]/g, '')
    );
  }

  async getUserInfo(token: string) {
    try {
      const response = await this.fusionAuthClient.retrieveUserUsingJWT(token);

      if (!response.wasSuccessful()) {
        throw new UnauthorizedException('Invalid token');
      }

      return response.response.user;
    } catch (error) {
      this.logger.error(
        `Failed to get user info: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getOAuthRedirectUrl(idpHint: string) {
    const clientId = this.configService.get('FUSION_AUTH_APPLICATION_ID');
    const redirectUri = this.configService.get('FUSION_AUTH_REDIRECT_URI');
    const fusionAuthUrl = this.configService.get('FUSION_AUTH_URL');
    const state = crypto.randomBytes(16).toString('hex');
    const url = `${fusionAuthUrl}/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}${idpHint ? `&idp_hint=${idpHint}` : ''}`;

    return { url, state };
  }
}
