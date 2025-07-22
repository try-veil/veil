import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { SignupDto } from './dto/signup.dto';
import axios from 'axios';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { GrafanaService } from '../grafana/grafana.service';

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
  private readonly logger = new Logger(AuthService.name);
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

    this.logger.debug(`Starting signup process for user: ${email} with role: ${role}`);

    // 1) Create or fetch FusionAuth user
    let fusionId: string;
    try {
      const resp = await axios.post(
        `${this.faUrl}/api/user`,
        { user: { email, username: email, password, active: true } },
        { headers: this.faHeaders },
      );
      fusionId = resp.data.user.id;
      this.logger.debug(`Created new FusionAuth user: ${email}`);
    } catch (err: any) {
      if (err.response?.status === 400 &&
        JSON.stringify(err.response.data).toLowerCase().includes('duplicate')
      ) {
        const resp = await axios.get(
          `${this.faUrl}/api/user?email=${encodeURIComponent(email)}`,
          { headers: this.faHeaders },
        );
        fusionId = resp.data.user.id;
        this.logger.debug(`Found existing FusionAuth user: ${email}`);
      } else {
        this.logger.error(`Failed to create FusionAuth user: ${email}`, err.message);
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
      this.logger.debug(`Registered user ${email} with role: ${role}`);
    } catch (err: any) {
      if (
        err.response?.status === 400 &&
        typeof err.response.data === 'object' &&
        JSON.stringify(err.response.data)
          .toLowerCase()
          .includes('already registered')
      ) {
        this.logger.debug(`User ${email} already registered to application, skipping`);
      } else {
        this.logger.error(`Failed to register user ${email} to application`, err.message);
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

    this.logger.debug(`Created/updated local user record for: ${email}`);

    // 4) Exchange password for tokens via OAuth2
    const tokenUrl = `${this.faUrl}/oauth2/token`;
    const form = new URLSearchParams();
    form.append('grant_type', 'password');
    form.append('username', email);
    form.append('password', password);
    form.append('client_id', this.faAppId);
    form.append('client_secret', this.faClientSecret);

    let tokenResp: any;
    try {
      tokenResp = await axios.post(
        tokenUrl,
        form.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      this.logger.debug(`Successfully obtained OAuth2 tokens for: ${email}`);
    } catch (err: any) {
      this.logger.error(`OAuth2 password grant error for ${email}:`, err.response?.status, err.response?.data);
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = tokenResp.data.access_token;
    const refreshToken = tokenResp.data.refresh_token;

    // 5) Handle Grafana provisioning for providers - Create dashboard only, let OAuth create user
    if (role === 'provider') {
      try {
        // Only create dashboard, let OAuth handle user creation
        const dashboardUid = `fa-${fusionId.substring(0, 8)}-dashboard`;
        await this.grafana.createDashboard(email, fusionId);

        const grafanaBase = this.configService.get<string>('GRAFANA_URL');
        const loginUrl = `${grafanaBase}/login/generic_oauth?rd=/d/${dashboardUid}`;

        this.logger.debug(`Signup completed successfully for provider: ${email} with dashboard creation`);

        return {
          user,
          tokens: {
            accessToken,
            refreshToken
          },
          grafana: {
            success: true,
            dashboardUid,
            loginUrl,
            message: 'Dashboard created. Use OAuth login to access Grafana.'
          }
        };
      } catch (error) {
        // Return success anyway, but log the error
        this.logger.error(`Dashboard creation failed for ${email}: ${error.message}`);

        const grafanaBase = this.configService.get<string>('GRAFANA_URL');
        return {
          user,
          tokens: {
            accessToken,
            refreshToken
          },
          grafana: {
            success: false,
            error: error.message,
            loginUrl: `${grafanaBase}/login/generic_oauth`
          }
        };
      }
    }

    // For consumers, return normal response
    this.logger.debug(`Signup completed successfully for consumer: ${email}`);
    return {
      user,
      tokens: {
        accessToken,
        refreshToken
      },
      grafana: undefined,
    };
  }


}
