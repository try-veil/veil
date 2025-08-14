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

  private transformBodyData(body: any): any {
    if (!body) return null;

    // If body type is multipart and has form_data, convert it to multipart_data
    if (body.type === 'multipart' && body.form_data && Array.isArray(body.form_data)) {
      // Create a content string representation of the multipart data
      const contentString = body.form_data
        .map((item: { key: string; value: string }) => `${item.key}=${item.value}`)
        .join('&');

      return {
        ...body,
        content: contentString, // Add content representation
        multipart_data: body.form_data.map((item: { key: string; value: string }) => ({
          name: item.key,
          value: item.value,
          type: 'text', // Default to text type, could be enhanced to detect file types
        })),
        // Keep form_data for backward compatibility but also add multipart_data
        form_data: body.form_data,
      };
    }

    return body;
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
        methods: [request.method.toUpperCase()],
        required_headers: request.required_headers?.map((h) => h.name) || [],
        api_keys:
          request.api_keys?.map((k) => ({
            key: k.key,
            name: k.name,
            is_active: k.is_active,
          })) || [],
        query_params: request.query_params || [],
        body: this.transformBodyData(request.body) || null,
        provider_id: request.provider_id,
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
      // Use the prefixed path format for route identification
      const routeIdentifier = currentPath || `/${apiId}`;
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
        veilRequest.methods = [request.method.toUpperCase()];
      }

      if (request.required_headers && request.required_headers.length > 0) {
        veilRequest.required_headers = request.required_headers.map((h) => h.name);
      }

      // if (request.parameters && request.parameters.length > 0) {
      //   veilRequest.parameters = request.parameters.map((p) => ({
      //     name: p.name,
      //     type: p.type,
      //     required: p.required,
      //   }));
      // }

      // CRITICAL FIX: Always send API keys to prevent them from being deleted
      // if (request.api_keys && request.api_keys.length > 0) {
      //   veilRequest.api_keys = request.api_keys.map((k) => ({
      //     key: k.key,
      //     name: k.name,
      //     is_active: k.is_active,
      //   }));
      //   this.logger.log(`[updateApiRoute] Sending ${request.api_keys.length} API keys to Caddy`);
      // } else {
      //   this.logger.warn(`[updateApiRoute] No API keys provided - this may cause authentication failures`);
      //   // Don't send empty array - let Caddy preserve existing keys
      // }

      if (request.api_keys && request.api_keys.length > 0) {
        this.logger.warn(
          `[updateApiRoute] Ignoring ${request.api_keys.length} API keys on PATCH; use /veil/api/keys instead`,
        );
      }

      // Add additional fields from request if provided
      if (request.provider_id) {
        veilRequest.provider_id = request.provider_id;
      }

      if (request.project_id) {
        veilRequest.project_id = request.project_id;
      }

      // Add query_params and body if provided
      if (request.query_params && request.query_params.length > 0) {
        veilRequest.query_params = request.query_params;
      }

      if (request.body) {
        veilRequest.body = this.transformBodyData(request.body);
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
      // If API doesn't exist (404), try to create it instead
      if (error.response && error.response.status === 404) {
        this.logger.warn(`[updateApiRoute] API not found in Caddy, attempting to create it: ${apiId}`);

        try {
          // Use currentPath if provided, otherwise fall back to apiId
          const routeIdentifier = currentPath || apiId;
          const normalizedPath = routeIdentifier.startsWith('/') ? routeIdentifier : `/${routeIdentifier}`;

          // Convert the update request to a create request with proper DTO structure
          const createRequest: CaddyOnboardingRequestDto = {
            path: request.path || normalizedPath,
            target_url: request.target_url,
            method: request.method ? request.method.toUpperCase() : 'GET',
            required_subscription: request.required_subscription || 'free',
            required_headers: request.required_headers || [],
            api_keys: request.api_keys || [],
            query_params: request.query_params || [],
            body: this.transformBodyData(request.body) || null,
            provider_id: request.provider_id,
            project_id: request.project_id,
            api_id: request.api_id || apiId,
          };

          // Call the onboardApi method to create it
          const createResponse = await this.onboardApi(createRequest);
          this.logger.log(`[updateApiRoute] Successfully created missing API: ${apiId}`);
          return createResponse;
        } catch (createError) {
          this.logger.error(`[updateApiRoute] Failed to create missing API: ${createError.message}`);
          throw createError;
        }
      }

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
