import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GatewayService } from './gateway.service';
import {
  ApiRegistrationRequestDto,
  ApiDetailsResponseDto,
} from './dto/api-registration.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayService: GatewayService,
  ) {}

  async registerApi(
    request: ApiRegistrationRequestDto,
    providerId: string,
  ): Promise<ApiDetailsResponseDto> {
    // Create API record using upsert
    const apiId = request.api_id || uuidv4();
    const api = await this.prisma.api.upsert({
      where: { path: request.path },
      create: {
        id: apiId,
        name: request.name,
        path: request.path,
        method: request.method,
        version: request.version,
        description: request.description,
        documentationUrl: request.documentation_url,
        providerId,
        specification: request.specification || {},
        status: 'ACTIVE',
        requiredHeaders:
          request.required_headers?.reduce(
            (acc, h) => ({
              ...acc,
              [h.name]: {
                value: h.value,
                isVariable: h.is_variable,
              },
            }),
            {},
          ) || {},
      },
      update: {
        name: request.name,
        method: request.method,
        version: request.version,
        description: request.description,
        documentationUrl: request.documentation_url,
        providerId,
        specification: request.specification || {},
        status: 'ACTIVE',
        requiredHeaders:
          request.required_headers?.reduce(
            (acc, h) => ({
              ...acc,
              [h.name]: {
                value: h.value,
                isVariable: h.is_variable,
              },
            }),
            {},
          ) || {},
      },
    });

    // Register API route in gateway
    const response = await this.gatewayService.onboardApi({
      api_id: apiId,
      name: request.name,
      path: request.path,
      target_url: request.target_url,
      method: request.method,
      version: request.version,
      description: request.description,
      documentation_url: request.documentation_url,
      required_headers: request.required_headers,
      specification: request.specification,
    });

    console.log('Gateway response:', response);

    return this.mapToApiDetailsResponse(api);
  }

  async getApiDetails(apiId: string): Promise<ApiDetailsResponseDto> {
    const api = await this.prisma.api.findUnique({
      where: { id: apiId },
    });

    if (!api) {
      throw new NotFoundException('API not found');
    }

    return this.mapToApiDetailsResponse(api);
  }

  async updateApi(
    apiId: string,
    request: Partial<ApiRegistrationRequestDto>,
    providerId: string,
  ): Promise<ApiDetailsResponseDto> {
    // Check if API exists and belongs to provider
    const existingApi = await this.prisma.api.findFirst({
      where: {
        id: apiId,
        providerId,
      },
    });

    if (!existingApi) {
      throw new NotFoundException(
        'API not found or you do not have permission to update it',
      );
    }

    // Update API record
    const api = await this.prisma.api.update({
      where: { id: apiId },
      data: {
        name: request.name,
        path: request.path,
        method: request.method,
        version: request.version,
        description: request.description,
        documentationUrl: request.documentation_url,
        specification: request.specification || {},
        requiredHeaders:
          request.required_headers?.reduce(
            (acc, h) => ({
              ...acc,
              [h.name]: {
                value: h.value,
                isVariable: h.is_variable,
              },
            }),
            {},
          ) || {},
      },
    });

    // Update API route in gateway
    await this.gatewayService.updateApiRoute(apiId, request);

    return this.mapToApiDetailsResponse(api);
  }

  async deleteApi(apiId: string, providerId: string): Promise<void> {
    // Check if API exists and belongs to provider
    const api = await this.prisma.api.findFirst({
      where: {
        id: apiId,
        providerId,
      },
    });

    if (!api) {
      throw new NotFoundException(
        'API not found or you do not have permission to delete it',
      );
    }

    // Delete API record
    await this.prisma.api.delete({
      where: { id: apiId },
    });

    // Delete API route from gateway
    await this.gatewayService.deleteApiRoute(apiId);
  }

  private mapToApiDetailsResponse(api: any): ApiDetailsResponseDto {
    const headers = Object.entries(api.requiredHeaders || {}).map(
      ([name, details]: [string, any]) => ({
        name,
        value: details.value,
        is_variable: details.isVariable,
      }),
    );

    return {
      api_id: api.id,
      name: api.name,
      path: api.path,
      required_headers: headers,
      method: api.method,
      description: api.description,
      documentation_url: api.documentationUrl,
      status: api.status,
      created_at: api.createdAt,
      updated_at: api.updatedAt,
    };
  }
}
