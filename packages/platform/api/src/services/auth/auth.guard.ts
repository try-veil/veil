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
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface JWTPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string; // FusionAuth user id
  jti: string;
  authenticationType: string;
  applicationId: string;
  roles: string[];
  auth_time: number;
  tid: string;
  // Optional, may or may not be present in JWT
  name?: string;
  email?: string;
}

type FusionAuthUser = {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
};

export const Role = (role: 'consumer' | 'provider') => SetMetadata('role', role);

@Injectable()
export class AuthGuard implements CanActivate {
  private jwksClient: jwksClient.JwksClient;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private http: HttpService,
    protected reflector?: Reflector,
  ) {
    this.jwksClient = jwksClient({
      jwksUri: this.configService.get<string>('JWKS_URL'),
      cache: true,
      rateLimit: true,
    });
  }

  // ---------- JWT verification via JWKS ----------

  private async getKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch {
      throw new UnauthorizedException('Unable to get signing key');
    }
  }

  private async validateToken(token: string): Promise<JWTPayload> {
    try {
      const decodedHeader = jwt.decode(token, { complete: true }) as
        | { header: { kid?: string } }
        | null;

      if (!decodedHeader?.header?.kid) {
        throw new UnauthorizedException('Invalid token format');
      }

      const publicKey = await this.getKey(decodedHeader.header.kid);
      const decoded = jwt.verify(token, publicKey) as JWTPayload;

      if (decoded.exp < Date.now() / 1000) {
        throw new UnauthorizedException('Token expired');
      }

      return decoded;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid token');
    }
  }

  // ---------- FusionAuth Admin API helpers ----------

  private fusionAuthHeaders() {
    const apiKey = this.configService.get<string>('FUSIONAUTH_API_KEY');
    const tenantId = this.configService.get<string>('FUSIONAUTH_TENANT_ID');
    if (!apiKey) {
      // We still allow fallback to JWT claims if API key is not set.
      return null;
    }
    return {
      Authorization: apiKey,
      'X-FusionAuth-TenantId': tenantId ?? '',
      'Content-Type': 'application/json',
    };
  }

  private async fetchFusionAuthUser(
    fusionAuthUserId: string,
  ): Promise<FusionAuthUser | null> {
    const baseUrl = this.configService.get<string>('FUSIONAUTH_URL');
    const headers = this.fusionAuthHeaders();

    if (!baseUrl || !headers) return null;

    try {
      const url = `${baseUrl.replace(/\/+$/, '')}/api/user/${fusionAuthUserId}`;
      const { data } = await firstValueFrom(this.http.get(url, { headers }));
      // FusionAuth returns { user: {...} }
      const faUser = (data?.user ?? {}) as FusionAuthUser;
      if (!faUser?.id) return null;
      return faUser;
    } catch {
      // 404 or any other error → just fall back to JWT claims
      return null;
    }
  }

  private slugify(input: string) {
    return input.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // ---------- Local user upsert based on FA (or JWT fallback) ----------

  private async createOrValidateUser(payload: JWTPayload) {
    try {
      const fa = await this.fetchFusionAuthUser(payload.sub);

      // Build canonical fields (prefer FusionAuth Admin API data)
      const email =
        fa?.email ??
        payload.email ??
        `user_${payload.sub.slice(0, 8)}@example.com`;

      const fullName =
        (fa?.firstName || '') || (fa?.lastName || '')
          ? `${fa?.firstName ?? ''} ${fa?.lastName ?? ''}`.trim()
          : payload.name ?? 'Unknown User';



      const username =
        fa?.username ?? `user_${(fa?.id || payload.sub).slice(0, 8)}`;

      const slugifiedName = this.slugify(
        (fullName && fullName.length > 0 ? fullName : username) ||
        `user-${payload.sub.slice(0, 8)}`,
      );



      // Upsert keeps local DB authoritative while syncing latest FA data
      const user = await this.prisma.user.upsert({
        where: { fusionAuthId: payload.sub },
        update: {
          // update only fields we control from identity provider
          name: fullName,
          email,
          username,
          slugifiedName,
        },
        create: {
          fusionAuthId: payload.sub,
          name: fullName,
          email,
          username,
          slugifiedName,
          type: 'USER',
        },
      });



      return user;
    } catch (error) {
      // Last-resort fallback if DB operation fails
      // (rare, but we keep the error message meaningful)
      // eslint-disable-next-line no-console
      console.error('Error in createOrValidateUser:', error);
      throw new UnauthorizedException('Failed to validate user');
    }
  }

  // ---------- Role validation ----------

  private validateRole(
    payload: JWTPayload,
    requiredRole: 'consumer' | 'provider',
  ): boolean {
    const normalizedRequiredRole = requiredRole.toLowerCase();
    const normalizedUserRoles = (payload.roles ?? []).map((r) =>
      r.toLowerCase(),
    );

    return normalizedUserRoles.some(
      (role) =>
        role === normalizedRequiredRole ||
        (normalizedRequiredRole === 'provider' && role === 'api_provider') ||
        (normalizedRequiredRole === 'consumer' && role === 'api_consumer'),
    );
  }

  // ---------- Guard entry ----------

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException('No token provided');

    const payload = await this.validateToken(token);
    const user = await this.createOrValidateUser(payload);

    // Attach both the DB user and the raw JWT payload
    request['user'] = { ...user, jwt: payload };

    if (this.reflector) {
      const requiredRole = this.reflector.get<'consumer' | 'provider'>(
        'role',
        context.getHandler(),
      );
      if (requiredRole && !this.validateRole(payload, requiredRole)) {
        return false;
      }
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
