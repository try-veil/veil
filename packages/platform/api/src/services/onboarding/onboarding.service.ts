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
  ) { }

  async registerApi(
    request: ApiRegistrationRequestDto,
    providerId: string,
  ): Promise<ApiDetailsResponseDto> {
    // Verify user has access to the project
    const projectAcl = await this.prisma.projectAcl.findFirst({
      where: {
        projectId: request.project_id,
        userId: providerId,
      },
    });

    if (!projectAcl) {
      this.logger.warn(
        `User ${providerId} attempted to onboard API to project ${request.project_id} without access.`,
      );
      throw new ForbiddenException(
        'User does not have access to the specified project.',
      );
    }

    this.logger.log(
      `User ${providerId} verified for project ${request.project_id}. Proceeding with API onboarding.`,
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
    this.logger.log(`[registerApi] Starting upsert for API ID: ${apiId}, path: ${request.path}`);

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
        queryParams: request.query_params as any || [],
        bodyConfig: request.body as any || null,
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
        queryParams: request.query_params as any || []
        ,
        bodyConfig: request.body as any || null,
      },
      include: {
        projectAllowedAPIs: {
          include: {
            project: true,
          },
        },
      },
    });

    this.logger.log(`[registerApi] API upsert completed. API ID: ${api.id}`);

    // Check if the link already exists
    const existingLink = await this.prisma.projectAllowedAPI.findFirst({
      where: {
        projectId: request.project_id,
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
        `Existing link found for API ${api.id} and project ${request.project_id}. Updated status.`,
      );
    } else {
      // Create new link if it doesn't exist
      await this.prisma.projectAllowedAPI.create({
        data: {
          projectId: request.project_id,
          apiId: api.id,
          apiVersionId: api.version,
          status: 'ACTIVE',
          api: {}, // Assuming default or minimal info needed here
        },
      });
      this.logger.log(
        `API ${api.id} successfully linked to project ${request.project_id}.`,
      );
    }

    // Auto-generate a default API key if none provided
    const defaultApiKey = `test-key-${api.id}`;
    const apiKeys = request.api_keys || [
      {
        key: defaultApiKey,
        name: 'Platform Test Key',
        is_active: true,
      },
    ];

    // Register API route in gateway - Pass only relevant fields
    // Construct the object matching CaddyOnboardingRequestDto
    const gatewayRequest: CaddyOnboardingRequestDto = {
      path: request.path,
      target_url: request.target_url,
      method: request.method,
      required_subscription: request.required_subscription,
      required_headers: request.required_headers,
      parameters: request.parameters,
      api_keys: apiKeys,
      // Include additional context fields
      provider_id: providerId,
      project_id: request.project_id,
      api_id: api.id,
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

    // Fetch the API with proper relationships after linking
    const apiWithRelations = await this.prisma.api.findUnique({
      where: { id: api.id },
      include: {
        projectAllowedAPIs: {
          include: {
            project: true,
          },
        },
      },
    });

    return this.mapToApiDetailsResponse(apiWithRelations);
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
    request: Partial<ApiRegistrationRequestDto> & { api_id: string },
    providerId: string,
  ): Promise<ApiDetailsResponseDto> {
    this.logger.log(`Starting update for API ${request.api_id}`);

    // 1) Load existing and verify ownership
    const existing = await this.prisma.api.findUnique({
      where: { id: request.api_id },
      include: { projectAllowedAPIs: { select: { projectId: true } } },
    });
    if (!existing || existing.providerId !== providerId) {
      throw new NotFoundException('API not found or no permission');
    }

    // 2) Build DB payload inline
    const data: any = {};
    if (request.name !== undefined) data.name = request.name;
    if (request.path !== undefined) data.path = request.path;
    if (request.method !== undefined) data.method = request.method;
    if (request.version !== undefined) data.version = request.version;
    if (request.description !== undefined) data.description = request.description;
    if (request.documentation_url !== undefined)
      data.documentationUrl = request.documentation_url;

    // Merge/update specification object
    const spec: any = typeof existing.specification === 'object' && existing.specification ? { ...existing.specification } : {};
    if (request.target_url !== undefined) spec.target_url = request.target_url;
    if (request.required_subscription !== undefined)
      spec.required_subscription = request.required_subscription;
    if (request.parameters !== undefined) spec.parameters = request.parameters;
    if (Object.keys(spec).length) data.specification = spec;

    // Update headers
    if (request.required_headers !== undefined) {
      const headersObj: Record<string, any> = {};
      for (const h of request.required_headers) {
        headersObj[h.name] = { value: h.value, isVariable: h.is_variable };
      }
      data.requiredHeaders = headersObj;
    }

    // Update query params and body config
    if (request.query_params !== undefined) data.queryParams = request.query_params as any;
    if (request.body !== undefined) data.bodyConfig = request.body as any;

    // 3) Ensure test key always present
    const keys: any[] = Array.isArray(request.api_keys) ? [...request.api_keys] : [];
    const testKey = `test-key-${request.api_id}`;
    if (!keys.find(k => k.key === testKey)) {
      keys.push({ key: testKey, name: 'Platform Test Key', is_active: true });
    }

    // 4) Build gateway patch DTO
    const gatewayBody: Partial<CaddyOnboardingRequestDto> = {};
    if (data.path || request.path !== undefined) gatewayBody.path = data.path || existing.path;
    if (spec.target_url) gatewayBody.target_url = spec.target_url;
    if (request.method !== undefined) gatewayBody.method = request.method;
    if (spec.required_subscription) gatewayBody.required_subscription = spec.required_subscription;
    if (spec.parameters) gatewayBody.parameters = spec.parameters;
    if (keys.length) gatewayBody.api_keys = keys;
    if (request.required_headers !== undefined) gatewayBody.required_headers = request.required_headers;
    if (request.body !== undefined) gatewayBody.body = request.body;

    this.logger.log(`Gateway patch: ${JSON.stringify(gatewayBody)}`);
    this.logger.log(`Request body data: ${JSON.stringify(request.body)}`);
    this.logger.log(`Existing body config: ${JSON.stringify(existing.bodyConfig)}`);

    // 5) Two-phase commit: patch gateway then update DB
    try {
      await this.prisma.$transaction(async tx => {
        await this.gatewayService.updateApiRoute(
          request.api_id,
          gatewayBody as CaddyOnboardingRequestDto,
          // existing.path,
        );
        await tx.api.update({ where: { id: request.api_id }, data });
      });
    } catch (e) {
      this.logger.error('Update transaction failed', e.stack);
      throw new InternalServerErrorException('Failed to update API');
    }

    // 6) Fetch updated record and inline-map to response DTO
    const updated = await this.prisma.api.findUnique({
      where: { id: request.api_id },
      include: { projectAllowedAPIs: { select: { projectId: true } } },
    });
    const projectId = updated.projectAllowedAPIs[0]?.projectId || null;
    const headerList = Object.entries(updated.requiredHeaders || {}).map(
      ([name, d]: any) => ({ name, value: d.value, is_variable: d.isVariable }),
    );
    return {
      api_id: updated.id,
      project_id: projectId,
      name: updated.name,
      path: updated.path,
      target_url: (updated.specification as any)?.target_url || '',
      method: updated.method,
      version: updated.version,
      description: updated.description,
      required_subscription: (updated.specification as any)?.required_subscription,
      documentation_url: updated.documentationUrl,
      required_headers: headerList,
      parameters: (updated.specification as any)?.parameters || [],
      query_params: updated.queryParams as any || [],
      body: updated.bodyConfig as any || null,
      status: updated.status,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
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
      query_params: api.queryParams as any || [],
      body: api.bodyConfig as any || null,
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
    const uniqueTestKey = 'test-key-' + (request.api_id || request.name.replace(/\s+/g, '_').toLowerCase());
    this.logger.log(`[testApi] Generated test key: ${uniqueTestKey} for API ID: ${request.api_id}, name: ${request.name}`);
    const cacheKey = 'test-key-limit:' + uniqueTestKey;
    const currentUsage = (await this.cacheManager.get<number>(cacheKey)) || 0;
    const testLimit = parseInt(
      this.configService.get<string>('TEST_API_LIMIT') || '5',
    );

    if (currentUsage >= testLimit) {
      throw new ForbiddenException(
        'Test API rate limit exceeded for test key. Limit: ' + testLimit + ' requests per 5 hours',
      );
    }

    // Increment usage
    await this.cacheManager.set(cacheKey, currentUsage + 1, 18000); // 5 hours TTL

    // Prepare headers for the Caddy gateway
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Subscription-Key': uniqueTestKey,
    };

    this.logger.log(`[testApi] Using test key for API call: ${uniqueTestKey}`);

    // Add required headers from the request
    if (request.required_headers) {
      for (const header of request.required_headers) {
        headers[header.name] = header.value;
      }
    }

    // Build the Caddy gateway URL with API ID prefix
    const caddyGatewayBase = 'http://localhost:2021';
    const apiId = request.api_id || request.name.replace(/\s+/g, '_').toLowerCase();
    const url = caddyGatewayBase + '/' + apiId + request.path;
    this.logger.log('Making test API call to: ' + url + ' with headers:', headers);
    this.logger.log('Request body configuration:', JSON.stringify(request.body, null, 2));

    // If body is undefined, try to get it from the database
    if (!request.body && request.api_id) {
      this.logger.log('Body is undefined, fetching from database...');
      try {
        const apiDetails = await this.getApiDetails(request.api_id);
        if (apiDetails.body) {
          request.body = apiDetails.body;
          this.logger.log('Retrieved body from database:', JSON.stringify(request.body, null, 2));
        }
      } catch (error) {
        this.logger.error('Failed to retrieve API details:', error);
      }
    }

    try {
      // Prepare request body based on body configuration
      let requestData = null;
      if (request.body && request.method.toUpperCase() !== 'GET') {
        switch (request.body.type) {
          case 'json':
            requestData = request.body.json_data || {};
            headers['Content-Type'] = 'application/json';
            break;
          case 'form-url-encoded':
            if (request.body.form_data) {
              const formData = new URLSearchParams();
              request.body.form_data.forEach(item => {
                formData.append(item.key, item.value);
              });
              requestData = formData.toString();
              headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            break;
          case 'text':
            requestData = request.body.content;
            headers['Content-Type'] = 'text/plain';
            break;
          case 'multipart':
            // For multipart, we'll send form_data as JSON for testing
            if (request.body.form_data) {
              const multipartData = {};
              request.body.form_data.forEach(item => {
                multipartData[item.key] = item.value;
              });
              requestData = multipartData;
              headers['Content-Type'] = 'application/json'; // Send as JSON for testing
            }
            break;
          default:
            requestData = request.body.content || null;
        }
      }

      this.logger.log('Prepared request data:', JSON.stringify(requestData, null, 2));
      this.logger.log('Final headers:', JSON.stringify(headers, null, 2));

      // Make request to Caddy gateway (not direct to upstream)
      const response = await firstValueFrom(
        this.httpService
          .request({
            method: request.method as any,
            url,
            headers,
            data: requestData,
          })
          .pipe(
            timeout(30000), // 30 second timeout
            catchError((error) => {
              this.logger.error('Error calling Caddy gateway', {
                error: error.message,
                caddyUrl: url,
                method: request.method,
                status: error.response?.status,
                responseData: error.response?.data,
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
