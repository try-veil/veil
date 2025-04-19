import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

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
}

@Injectable()
export class AuthService {
  private jwksClient: jwksClient.JwksClient;

  constructor(private configService: ConfigService) {
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

  async validateToken(token: string): Promise<JWTPayload> {
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

  async validateRole(
    token: string,
    requiredRole: 'consumer' | 'provider',
  ): Promise<boolean> {
    const payload = await this.validateToken(token);
    return payload.roles.includes(requiredRole.toLowerCase());
  }
}
