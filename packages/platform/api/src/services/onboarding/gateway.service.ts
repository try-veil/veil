import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  ApiRegistrationRequestDto,
  CaddyOnboardingRequestDto,
} from './dto/api-registration.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);
  private readonly gatewayUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this.gatewayUrl = this.configService.get<string>('DEFAULT_GATEWAY_URL');
  }

  async onboardApi(
    request: CaddyOnboardingRequestDto,
  ): Promise<{ status: string; message: string; api: any }> {
    try {
      // FIXED: Convert NestJS request to Veil's expected format
      // Ensure path starts with / to match Caddy's r.URL.Path format
      const normalizedPath = request.path.startsWith('/') ? request.path : `/${request.path}`;
      const veilRequest = {
        path: normalizedPath,
        upstream: request.target_url,
        project_id: request.project_id,
        required_subscription: request.required_subscription || 'free',
        methods: [request.method],
        required_headers: request.required_headers?.map((h) => h.name) || [],
        parameters:
          request.parameters?.map((p) => ({
            name: p.name,
            type: p.type,
            required: p.required,
          })) || [],
        api_keys:
          request.api_keys?.map((k) => ({
            key: k.key,
            name: k.name,
            is_active: k.is_active,
          })) || [],
      };

      console.log(
        'Veil onboarding payload:',
        JSON.stringify(veilRequest, null, 2),
      );

      // POST to Veil's /veil/api/routes endpoint
      const response = await firstValueFrom(
        this.httpService.post<{ status: string; message: string; api: any }>(
          `${this.gatewayUrl}/veil/api/routes`,
          veilRequest,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 second timeout
          },
        ),
      );

      this.logger.log(
        ` API onboarded successfully with Veil: ${response.data.message}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        ` Failed to onboard API with Veil: ${error.message}`,
        error.stack,
      );

      // Log more details about the error
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(
          `Response data: ${JSON.stringify(error.response.data)}`,
        );
      }

      throw error;
    }
  }

  async updateApiRoute(
    apiId: string,
    request: CaddyOnboardingRequestDto,
    currentPath?: string,
  ) {
    try {
      // Use currentPath if provided, otherwise fall back to apiId
      const routeIdentifier = currentPath || apiId;
      const normalizedIdentifier = routeIdentifier.startsWith('/') ? routeIdentifier : `/${routeIdentifier}`;
      const updateUrl = `${this.gatewayUrl}/veil/api/routes${normalizedIdentifier}`;

      // Build veilRequest with only provided fields (all optional for updates)
      const veilRequest: any = {};

      // Only include fields that are provided
      if (request.path) {
        veilRequest.path = request.path.startsWith('/') ? request.path : `/${request.path}`;
      }

      if (request.target_url) {
        veilRequest.upstream = request.target_url;
      }

      if (request.required_subscription) {
        veilRequest.required_subscription = request.required_subscription;
      }

      if (request.method) {
        veilRequest.methods = [request.method];
      }

      if (request.required_headers && request.required_headers.length > 0) {
        veilRequest.required_headers = request.required_headers.map((h) => h.name);
      }

      if (request.parameters && request.parameters.length > 0) {
        veilRequest.parameters = request.parameters.map((p) => ({
          name: p.name,
          type: p.type,
          required: p.required,
        }));
      }

      if (request.api_keys && request.api_keys.length > 0) {
        veilRequest.api_keys = request.api_keys.map((k) => ({
          key: k.key,
          name: k.name,
          is_active: k.is_active,
        }));
        this.logger.log(`[updateApiRoute] Sending ${request.api_keys.length} API keys to Caddy: ${JSON.stringify(veilRequest.api_keys)}`);
      } else {
        this.logger.log(`[updateApiRoute] No API keys provided in request - Caddy will preserve existing keys`);
      }

      // Add additional fields from request if provided
      if (request.provider_id) {
        veilRequest.provider_id = request.provider_id;
      }

      if (request.project_id) {
        veilRequest.project_id = request.project_id;
      }

      // Add API ID for reference (use from request or fallback to parameter)
      veilRequest.api_id = request.api_id || apiId;

      console.log(
        'Veil update payload:',
        JSON.stringify(veilRequest, null, 2),
      );

      // PATCH to Veil's /veil/api/routes endpoint
      const response = await firstValueFrom(
        this.httpService.patch(updateUrl, veilRequest, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }),
      );

      this.logger.log(`[updateApiRoute] API route updated successfully: ${apiId}`);
      this.logger.log(`[updateApiRoute] Caddy response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to update API route: ${error.message}`,
        error.stack,
      );

      // Log more details about the error
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(
          `Response data: ${JSON.stringify(error.response.data)}`,
        );
      }

      throw error;
    }
  }

  async deleteApiRoute(apiId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.gatewayUrl}/veil/api/routes/${apiId}`),
      );

      this.logger.log(`API route deleted successfully: ${apiId}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to delete API route: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async registerApiKey(apiKey: string, userId: string, apiId: string) {
    try {
      // First, fetch the API details to get the actual path
      const api = await this.prismaService.api.findUnique({
        where: { id: apiId },
      });

      if (!api) {
        throw new Error(`API with ID ${apiId} not found`);
      }

      const response = await firstValueFrom(
        this.httpService.put(`${this.gatewayUrl}/veil/api/keys`, {
          path: api.path.startsWith('/') ? api.path : `/${api.path}`, // Normalize path with leading slash
          api_keys: [
            {
              key: apiKey,
              name: `Key for user ${userId}`,
              is_active: true,
            },
          ],
        }),
      );

      this.logger.log(`API key registered successfully for API: ${apiId}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to register API key: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteApiKey(apiKey: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.gatewayUrl}/veil/api/keys/${apiKey}`),
      );

      this.logger.log(`API key deleted successfully: ${apiKey}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to delete API key: ${error.message}`,
        error.stack,
      );

      // Log more details about the error
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(
          `Response data: ${JSON.stringify(error.response.data)}`,
        );
        this.logger.error(`API key attempted to delete: ${apiKey}`);
        this.logger.error(`Gateway URL: ${this.gatewayUrl}/veil/api/keys/${apiKey}`);
      }

      throw error;
    }
  }
}
