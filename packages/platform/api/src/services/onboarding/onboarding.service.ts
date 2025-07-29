import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { GatewayService } from './gateway.service';
import {
  ApiRegistrationRequestDto,
  ApiDetailsResponseDto,
  CaddyOnboardingRequestDto,
  ApiRegistrationResponseDto,
} from './dto/api-registration.dto';
import { v4 as uuidv4 } from 'uuid';
import { timeout, catchError } from 'rxjs/operators';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayService: GatewayService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private httpService: HttpService,
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

    // Ensure the platform test key is always present in api_keys
    const uniqueTestKey = `test-key-${request.api_id || request.name.replace(/\s+/g, '_').toLowerCase()}`;
    if (!request.api_keys) {
      request.api_keys = [];
    }
    if (!request.api_keys.some((k) => k.key === uniqueTestKey)) {
      request.api_keys.push({
        key: uniqueTestKey,
        name: 'Platform Test Key',
        is_active: true,
      });
    }

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
        specification: {
          ...(request.specification || {}),
          target_url: request.target_url,
          required_subscription: request.required_subscription,
          parameters: request.parameters || [],
        },
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
        specification: {
          ...(request.specification || {}),
          target_url: request.target_url,
          required_subscription: request.required_subscription,
          parameters: request.parameters || [],
        },
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
      include: {
        projectAllowedAPIs: {
          include: {
            project: true,
          },
        },
      },
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

    // Get the first project ID (assuming one API can be linked to multiple projects)
    const projectId = api.projectAllowedAPIs?.[0]?.projectId || null;

    // Extract parameters from specification if available
    const parameters = api.specification?.parameters || [];

    return {
      api_id: api.id,
      project_id: projectId,
      name: api.name,
      path: api.path,
      target_url: api.specification?.target_url || '', // Extract from specification
      method: api.method,
      version: api.version,
      description: api.description,
      required_subscription:
        api.specification?.required_subscription || 'basic', // Extract from specification
      documentation_url: api.documentationUrl,
      required_headers: headers,
      parameters: parameters,
      status: api.status,
      created_at: api.createdAt,
      updated_at: api.updatedAt,
    };
  }

  async testApiCall(
    request: ApiRegistrationRequestDto,
    userId: string,
  ): Promise<any> {
    // Per-test-key rate limiting
    const uniqueTestKey = `test-key-${request.api_id || request.name.replace(/\s+/g, '_').toLowerCase()}`;
    const cacheKey = `test-key-limit:${uniqueTestKey}`;
    const currentUsage = (await this.cacheManager.get<number>(cacheKey)) || 0;
    const testLimit = parseInt(
      this.configService.get<string>('TEST_API_LIMIT') || '5',
    );

    if (currentUsage >= testLimit) {
      throw new ForbiddenException(
        `Test API rate limit exceeded for test key. Limit: ${testLimit} requests per 5 hours`,
      );
    }

    // Increment usage
    await this.cacheManager.set(cacheKey, currentUsage + 1, 18000); // 5 hours TTL

    // Prepare headers for the Caddy gateway
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Subscription-Key': uniqueTestKey,
    };

    // Add required headers from the request
    if (request.required_headers) {
      for (const header of request.required_headers) {
        headers[header.name] = header.value;
      }
    }

    // Build the Caddy gateway URL
    const caddyGatewayBase = 'http://localhost:2021';
    const url = caddyGatewayBase + request.path;

    try {
      // Make request to Caddy gateway (not direct to upstream)
      const response = await firstValueFrom(
        this.httpService
          .request({
            method: request.method as any,
            url,
            headers,
            data: request, // Send the full request body if needed (for POST/PUT)
          })
          .pipe(
            timeout(30000), // 30 second timeout
            catchError((error) => {
              this.logger.error('Error calling Caddy gateway', {
                error: error.message,
                caddyUrl: url,
                method: request.method,
              });
              throw new InternalServerErrorException(
                `Failed to call Caddy gateway: ${error.message}`,
              );
            }),
          ),
      );

      return {
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers,
        usage: currentUsage + 1,
        limit: testLimit,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error('Unexpected error in test API call (via Caddy)', {
        error: error.message,
        caddyUrl: url,
        method: request.method,
      });

      throw new InternalServerErrorException('Failed to test API via Caddy');
    }
  }
}
