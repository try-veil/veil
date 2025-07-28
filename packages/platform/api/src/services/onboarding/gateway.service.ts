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
      const veilRequest = {
        path: request.path,
        upstream: request.target_url,
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
    request: Partial<ApiRegistrationRequestDto>,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.gatewayUrl}/veil/api/routes/${apiId}`, {
          path: request.path,
          upstream: request.target_url,
          methods: [request.method],
          required_headers: request.required_headers?.map((h) => ({
            name: h.name,
            value: h.value,
            is_static: !h.is_variable,
          })),
        }),
      );

      this.logger.log(`API route updated successfully: ${apiId}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to update API route: ${error.message}`,
        error.stack,
      );
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
          path: api.path, // Use the actual API path instead of the ID
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
      throw error;
    }
  }
}
