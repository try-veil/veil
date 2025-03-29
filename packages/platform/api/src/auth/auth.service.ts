import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { FusionAuthClient } from '@fusionauth/typescript-client';

@Injectable()
export class AuthService {
  private fusionAuthClient: FusionAuthClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    this.fusionAuthClient = new FusionAuthClient(
      configService.get('FUSION_AUTH_API_KEY'),
      configService.get('FUSION_AUTH_URL'),
    );
  }

  async signup(email: string, password: string, firstName?: string, lastName?: string) {
    try {
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
        const user = await this.findOrCreateUser({
          sub: response.response.user.id,
          email: response.response.user.email,
          given_name: response.response.user.firstName,
          family_name: response.response.user.lastName,
        });

        return this.generateToken(user);
      }
    } catch (error) {
      if (error.statusCode === 400) {
        throw new ConflictException('User already exists');
      }
      throw error;
    }
  }

  async login(email: string, password: string) {
    try {
      const response = await this.fusionAuthClient.login({
        applicationId: this.configService.get('FUSION_AUTH_APPLICATION_ID'),
        loginId: email,
        password,
      });

      if (response.wasSuccessful()) {
        const user = await this.findOrCreateUser({
          sub: response.response.user.id,
          email: response.response.user.email,
          given_name: response.response.user.firstName,
          family_name: response.response.user.lastName,
        });

        return this.generateToken(user);
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async validateUser(token: string) {
    try {
      const response = await this.fusionAuthClient.validateJWT(token);
      if (response.wasSuccessful()) {
        if (response.response) {
          const jwt = response.response.jwt;
          return this.findOrCreateUser(jwt);
        } else {
          throw new UnauthorizedException('No success response received');
        }
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async findOrCreateUser(jwt: any) {
    const fusionAuthUser = jwt.sub;
    let user = await this.prisma.user.findUnique({
      where: { fusionAuthId: fusionAuthUser },
      include: { roles: true },
    });

    if (!user) {
      // Create new user
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

  async generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map(role => role.name),
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async assignRole(userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new Error('Role not found');
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
    return 'veil_' + Buffer.from(Math.random().toString(36) + Date.now().toString()).toString('base64');
  }
} 