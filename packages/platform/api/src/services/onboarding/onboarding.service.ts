import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GatewayService } from './gateway.service';
import {
  ApiRegistrationRequestDto,
  ApiDetailsResponseDto,
  CaddyOnboardingRequestDto,
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
    projectId: number,
  ): Promise<ApiDetailsResponseDto> {
    // Verify user has access to the project
    const projectAcl = await this.prisma.projectAcl.findFirst({
      where: {
        projectId: projectId,
        userId: providerId,
      },
    });

    if (!projectAcl) {
      this.logger.warn(
        `User ${providerId} attempted to onboard API to project ${projectId} without access.`,
      );
      throw new ForbiddenException(
        'User does not have access to the specified project.',
      );
    }

    this.logger.log(
      `User ${providerId} verified for project ${projectId}. Proceeding with API onboarding.`,
    );

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

    // Check if the link already exists
    const existingLink = await this.prisma.projectAllowedAPI.findFirst({
      where: {
        projectId: projectId,
        apiId: api.id,
        apiVersionId: api.version,
      },
    });

    if (existingLink) {
      // Update existing link if necessary (e.g., ensure status is ACTIVE)
      await this.prisma.projectAllowedAPI.update({
        where: { id: existingLink.id }, // Use the primary key 'id' for update
        data: { status: 'ACTIVE' },
      });
      this.logger.log(
        `Existing link found for API ${api.id} and project ${projectId}. Updated status.`,
      );
    } else {
      // Create new link if it doesn't exist
      await this.prisma.projectAllowedAPI.create({
        data: {
          projectId: projectId,
          apiId: api.id,
          apiVersionId: api.version,
          status: 'ACTIVE',
          api: {}, // Assuming default or minimal info needed here
        },
      });
      this.logger.log(
        `API ${api.id} successfully linked to project ${projectId}.`,
      );
    }

    // Register API route in gateway - Pass only relevant fields
    // Construct the object matching CaddyOnboardingRequestDto
    const gatewayRequest: CaddyOnboardingRequestDto = {
      path: request.path,
      target_url: request.target_url,
      method: request.method,
      required_subscription: request.required_subscription,
      required_headers: request.required_headers,
      parameters: request.parameters,
      api_keys: request.api_keys,
    };
    const response = await this.gatewayService.onboardApi(gatewayRequest);
    
    await this.prisma.user.update({
      where: {
        id: providerId,
      },
      data: {
        publishedApisList: {
          push: api.id,
        },
      },
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
