import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { SignupDto } from './dto/signup.dto';
import axios from 'axios';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { GrafanaService } from '../grafana/grafana.service';
import { IsIn } from 'class-validator';

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
  private faUrl: string;
  private faApiKey: string;
  private faAppId: string;
  private faClientSecret: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private grafana: GrafanaService,
  ) {
    this.jwksClient = jwksClient({
      jwksUri: this.configService.get<string>('JWKS_URL'),
      cache: true,
      rateLimit: true,
    });
    this.faUrl = this.configService.get<string>('FUSIONAUTH_URL');
    this.faApiKey = this.configService.get<string>('FUSIONAUTH_API_KEY');
    this.faAppId = this.configService.get<string>('FUSIONAUTH_APP_ID');
    this.faClientSecret = this.configService.get<string>('FUSIONAUTH_CLIENT_SECRET');
  }

  private get faHeaders() {
    return {
      Authorization: this.faApiKey,
      'Content-Type': 'application/json',
    };
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

  async signup(dto: SignupDto) {
    const { email, password, name, role } = dto;

    // 1) Create or fetch FusionAuth user
    let fusionId: string;
    try {
      const resp = await axios.post(
        `${this.faUrl}/api/user`,
        { user: { email, username: email, password, active: true } },
        { headers: this.faHeaders },
      );
      fusionId = resp.data.user.id;
    } catch (err: any) {
      if (err.response?.status === 400 &&
          JSON.stringify(err.response.data).toLowerCase().includes('duplicate')
      ) {
        const resp = await axios.get(
          `${this.faUrl}/api/user?email=${encodeURIComponent(email)}`,
          { headers: this.faHeaders },
        );
        fusionId = resp.data.user.id;
      } else {
        throw err;
      }
    }

    // 2) Register user in FusionAuth with the correct role
    const registrationPayload = {
      registration: {
        applicationId: this.faAppId,
        roles: [role],
      },
    };

    try {
      await axios.post(
        `${this.faUrl}/api/user/registration/${fusionId}`,
        registrationPayload,
        { headers: this.faHeaders }
      );
    } catch (err: any) {
      if (
        err.response?.status === 400 &&
        typeof err.response.data === 'object' &&
        JSON.stringify(err.response.data)
          .toLowerCase()
          .includes('already registered')
      ) {
        console.log('User already registered to the application, skipping.');
      } else {
        throw err;
      }
    }

    // Generate a unique slugifiedName
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let i = 1;
    while (await this.prisma.user.findUnique({ where: { slugifiedName: slug } })) {
      slug = `${baseSlug}-${i++}`;
    }

    // 3) Upsert local Prisma user
    const user = await this.prisma.user.upsert({
      where: { fusionAuthId: fusionId },
      update: { email, name, updatedAt: new Date() },
      create: {
        fusionAuthId: fusionId,
        email,
        name,
        username: email,
        slugifiedName: slug,
        type: 'USER',
      },
    });

    // 4) Exchange password for tokens via OAuth2
    const tokenUrl = `${this.faUrl}/oauth2/token`;
    const form = new URLSearchParams();
    form.append('grant_type', 'password');
    form.append('username', email);
    form.append('password', password);
    form.append('client_id', this.faAppId);
    form.append('client_secret', this.faClientSecret);

    let tokenResp;
    try {
      tokenResp = await axios.post(
        tokenUrl,
        form.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    } catch (err: any) {
      console.error('OAuth2 password grant error:', err.response?.status, err.response?.data);
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = tokenResp.data.access_token;
    const refreshToken = tokenResp.data.refresh_token;

    const grafanaBase = this.configService.get<string>('GRAFANA_URL');
    // REMOVE: Do not provision Grafana resources here
    // if (role === 'provider') {
    //   await this.grafana.provisionProviderResources(slug, email);
    // }
    return {
      user,
      tokens: {
        accessToken,
        refreshToken
      },
      grafana: role === 'provider'
        ? {
            loginUrl: `${grafanaBase}/login/generic_oauth`
          }
        : undefined,
    };
  }

  public async provisionGrafanaResourcesForUser(slug: string, email: string) {
    return this.grafana.provisionProviderResources(slug, email);
  }
}
