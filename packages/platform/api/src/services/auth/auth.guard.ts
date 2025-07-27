import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface JWTPayload {
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
  // Optional fields that might be present in the JWT
  name?: string;
  email?: string;
}

export const Role = (role: 'consumer' | 'provider') =>
  SetMetadata('role', role);

@Injectable()
export class AuthGuard implements CanActivate {
  private jwksClient: jwksClient.JwksClient;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    protected reflector?: Reflector,
  ) {
    this.jwksClient = jwksClient({
      jwksUri: this.configService.get<string>('JWKS_URL'),
      cache: true,
      rateLimit: true,
    });
  }

  private async getKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      throw new UnauthorizedException('Unable to get signing key');
    }
  }

  private async validateToken(token: string): Promise<JWTPayload> {
    try {
      // Decode the token header to get the key ID (kid)
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || !decodedHeader.header.kid) {
        throw new UnauthorizedException('Invalid token format');
      }

      // Get the public key
      const publicKey = await this.getKey(decodedHeader.header.kid);

      // Verify the token
      const decoded = jwt.verify(token, publicKey) as JWTPayload;

      // Check if token is expired
      if (decoded.exp < Date.now() / 1000) {
        throw new UnauthorizedException('Token expired');
      }

      return decoded;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async createOrValidateUser(payload: JWTPayload) {
    try {
      // Check if user exists by fusionAuthId
      let user = await this.prisma.user.findUnique({
        where: { fusionAuthId: payload.sub },
      });

      if (!user) {
        // Create new user with data from JWT
        user = await this.prisma.user.create({
          data: {
            fusionAuthId: payload.sub,
            name: payload.name || 'Unknown User',
            username: `user_${payload.sub.slice(0, 8)}`,
            email:
              payload.email || `user_${payload.sub.slice(0, 8)}@example.com`,
            slugifiedName: `user-${payload.sub.slice(0, 8)}`,
            type: 'USER',
          },
        });
      }

      return user;
    } catch (error) {
      console.error('Error in createOrValidateUser:', error);
      throw new UnauthorizedException('Failed to validate user');
    }
  }

  private validateRole(
    payload: JWTPayload,
    requiredRole: 'consumer' | 'provider',
  ): boolean {
    console.log('Validating role:', {
      requiredRole,
      userRoles: payload.roles,
    });

    // Case-insensitive role check
    const normalizedRequiredRole = requiredRole.toLowerCase();
    const normalizedUserRoles = payload.roles.map((role) => role.toLowerCase());

    // Check for exact match or equivalent roles
    const isValid = normalizedUserRoles.some(
      (role) =>
        role === normalizedRequiredRole ||
        (normalizedRequiredRole === 'provider' && role === 'api_provider') ||
        (normalizedRequiredRole === 'consumer' && role === 'api_consumer'),
    );

    console.log('Role validation result:', isValid);
    return isValid;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Validate the token and get the payload
      const payload = await this.validateToken(token);

      // Create or validate user and get the user object
      const user = await this.createOrValidateUser(payload);

      // Attach both the JWT payload and the user object to the request
      request['user'] = {
        ...user,
        jwt: payload,
      };

      if (this.reflector) {
        const requiredRole = this.reflector.get<'consumer' | 'provider'>(
          'role',
          context.getHandler(),
        );
        if (requiredRole && !this.validateRole(payload, requiredRole)) {
          console.log('Role validation failed: 1');
          return false;
        }
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}