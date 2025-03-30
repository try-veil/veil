import { Injectable, UnauthorizedException, ConflictException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { FusionAuthClient } from '@fusionauth/typescript-client';
import axios from 'axios';
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

    this.logger.log(`Initializing AuthService with FusionAuth settings: URL=${url}, APP_ID=${appId}, API_KEY=${apiKey?.substring(0, 3)}...`);

    if (!apiKey || !url || !appId) {
      this.logger.error('Missing FusionAuth configuration! Please check your environment variables.');
    }

    if (this.isTestEnvironment && this.configService.get('USE_MOCK_FUSIONAUTH') === 'true') {
      this.logger.log('Using mock FusionAuth client for tests');
      this.fusionAuthClient = new MockFusionAuthClient(apiKey, url);
    } else {
      this.logger.log('Using real FusionAuth client');
      try {
        this.fusionAuthClient = new FusionAuthClient(apiKey, url);
      } catch (error) {
        this.logger.error(`Failed to initialize FusionAuth client: ${error.message}`, error.stack);
        throw error;
      }
    }
  }

  async exchangeCodeForTokens(code: string) {
    try {
      const clientId = this.configService.get('FUSION_AUTH_APPLICATION_ID');
      const clientSecret = this.configService.get('FUSION_AUTH_CLIENT_SECRET');
      const redirectUri = this.configService.get('FUSION_AUTH_REDIRECT_URI');

      const response = await axios.post(`${this.configService.get('FUSION_AUTH_URL')}/oauth2/token`,
        new URLSearchParams({
          'client_id': clientId,
          'client_secret': clientSecret,
          'code': code,
          'grant_type': 'authorization_code',
          'redirect_uri': redirectUri
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to exchange code for tokens: ${error.message}`, error.stack);
      throw new HttpException('Failed to complete authentication', HttpStatus.BAD_REQUEST);
    }
  }

  async signup(email: string, password: string, firstName?: string, lastName?: string) {
    try {
      this.logger.log(`Attempting to register new user with FusionAuth: ${email}`);

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
          ...this.generateToken(user)
        };
      } else {
        throw new ConflictException('User registration failed');
      }
    } catch (error) {
      if (error.statusCode === 400 && error.response?.fieldErrors?.user?.email?.code === '[duplicate]user.email') {
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }

  async loginWithGithub(code: string) {
    this.logger.log('Processing GitHub login through FusionAuth');
    return this.handleGitHubCallback(code, null, null);
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

        // Check if we have a valid user object
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
          ...this.generateToken(user)
        };
      } else {
        this.logger.error(`FusionAuth login returned non-success status: ${response.statusCode}`);
        throw new UnauthorizedException('Invalid credentials');
      }
    } catch (error) {
      this.logger.error(`Login error: ${error.message || 'Unknown error'}`, error.stack || 'No stack trace');

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

  async findOrCreateUser(jwt: any) {
    const fusionAuthUser = jwt.sub;
    
    let user = await this.prisma.user.findUnique({
      where: { fusionAuthId: fusionAuthUser },
      include: { roles: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: jwt.email,
          fusionAuthId: fusionAuthUser,
          firstName: jwt.given_name,
          lastName: jwt.family_name,
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
      roles: user.roles.map(role => role.name),
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map(role => role.name),
        githubUsername: user.githubUsername
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
    return 'veil_' + crypto.randomBytes(24).toString('base64').replace(/[+/=]/g, '');
  }

  /**
   * Initiates GitHub OAuth flow
   * @returns The GitHub authorization URL
   */
  initiateGitHubOAuth() {
    const applicationId = this.configService.get('FUSION_AUTH_APPLICATION_ID');
    const idpId = this.configService.get('GITHUB_IDENTITY_PROVIDER_ID');
    const redirectUri = this.configService.get('FUSION_AUTH_REDIRECT_URI');
    const fusionAuthUrl = `${this.configService.get('FUSION_AUTH_URL')}/oauth2/authorize?client_id=${applicationId}&response_type=code&identity_provider_id=${idpId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return {
      url: fusionAuthUrl
    };
  }
  
  /**
   * Handles GitHub OAuth callback and creates/updates user
   * @param code Authorization code from GitHub
   * @param state State parameter for CSRF protection
   * @param expectedState The state we generated in initiateGitHubOAuth
   */
  async handleGitHubCallback(code: string, state: string, expectedState: string) {
    try {
      if (expectedState && state !== expectedState) {
        this.logger.error(`State mismatch during GitHub callback. Expected: ${expectedState}, Received: ${state}`);
        throw new UnauthorizedException('Invalid state parameter');
      }

      const tokenResponse = await this.exchangeCodeForToken(code);
      const accessToken = tokenResponse.access_token;

      if (!accessToken) {
        throw new UnauthorizedException('Failed to get GitHub access token');
      }

      // Get user info from GitHub
      const githubUser = await this.getGitHubUserInfo(accessToken);

      if (!githubUser || !githubUser.id) {
        throw new HttpException('Failed to get GitHub user info', HttpStatus.BAD_REQUEST);
      }

      // Process login with FusionAuth using the identity provider
      const loginResponse = await this.fusionAuthClient.loginWithIdentityProvider({
        applicationId: this.configService.get('FUSION_AUTH_APPLICATION_ID'),
        identityProviderId: this.configService.get('GITHUB_IDENTITY_PROVIDER_ID'),
        data: {
          token: accessToken,
          user: {
            email: githubUser.email,
            githubId: githubUser.id.toString(),
            username: githubUser.login
          }
        }
      });

      if (!loginResponse.wasSuccessful()) {
        this.logger.error(`FusionAuth identity provider login failed: ${loginResponse.statusCode}`);
        throw new UnauthorizedException('GitHub authentication failed');
      }

      // Find or create local user from FusionAuth user
      const user = await this.findOrCreateUser({
        sub: loginResponse.response.user.id,
        email: loginResponse.response.user.email || githubUser.email,
        given_name: loginResponse.response.user.firstName || githubUser.name || '',
        family_name: loginResponse.response.user.lastName || '',
      });

      // Store GitHub info in our database
      await this.updateUserGitHubInfo(user.id, {
        githubId: githubUser.id.toString(),
        githubUsername: githubUser.login,
        githubAccessToken: accessToken
      });

      // Generate and return tokens
      return {
        fusionAuthToken: loginResponse.response.token,
        ...this.generateToken(user)
      };
    } catch (error) {
      this.logger.error(`GitHub callback error: ${error.message || 'Unknown error'}`, error.stack || 'No stack trace');
      throw new HttpException(
        `GitHub authentication failed: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  async exchangeCodeForToken(code: string) {
    try {
      const clientId = this.configService.get('GITHUB_CLIENT_ID');
      const clientSecret = this.configService.get('GITHUB_CLIENT_SECRET');
      const redirectUri = this.configService.get('GITHUB_REDIRECT_URI');

      const response = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      }, {
        headers: {
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to exchange GitHub code for token: ${error.message}`, error.stack);
      throw new HttpException('Failed to exchange code for access token', HttpStatus.BAD_REQUEST);
    }
  }

  async getGitHubUserInfo(accessToken: string) {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json'
        },
        timeout: 5000
      });

      // If no email is present in the profile, fetch emails separately
      if (!response.data.email) {
        const emailsResponse = await axios.get('https://api.github.com/user/emails', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github+json'
          },
          timeout: 5000
        });

       
        const primaryEmail = emailsResponse.data.find(email => email.primary);
        if (primaryEmail) {
          response.data.email = primaryEmail.email;
        }
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get GitHub user info: ${error.message}`, error.stack);
      throw new HttpException('Failed to fetch GitHub user information', HttpStatus.BAD_GATEWAY);
    }
  }


  async updateUserGitHubInfo(userId: string, githubInfo: {
    githubId: string,
    githubUsername: string,
    githubAccessToken: string
  }) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          githubId: githubInfo.githubId,
          githubUsername: githubInfo.githubUsername,
          githubAccessToken: githubInfo.githubAccessToken,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      this.logger.error(`Failed to update user with GitHub info: ${error.message}`, error.stack);
      // Don't throw here to avoid breaking the auth flow
    }
  }

  /**
   * Revoke GitHub authorization
   */
  async revokeGitHubAuth(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.githubAccessToken) {
        throw new HttpException('No GitHub connection found', HttpStatus.NOT_FOUND);
      }

      // Revoke token with GitHub
      const clientId = this.configService.get('GITHUB_CLIENT_ID');
      const clientSecret = this.configService.get('GITHUB_CLIENT_SECRET');
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      await axios.delete(`https://api.github.com/applications/${clientId}/grant`, {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Accept': 'application/vnd.github+json'
        },
        data: {
          access_token: user.githubAccessToken
        },
        timeout: 5000
      });

      // Clear GitHub data from database
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          githubId: null,
          githubUsername: null,
          githubAccessToken: null,
          updatedAt: new Date()
        }
      });

      return { success: true, message: 'GitHub authorization revoked successfully' };
    } catch (error) {
      this.logger.error(`Failed to revoke GitHub auth: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to revoke GitHub authorization: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}