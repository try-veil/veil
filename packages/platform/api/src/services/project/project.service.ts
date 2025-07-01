import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {HubListingService } from "../hublisting/hublisting.service"
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
  ProjectWithRelationsDto,
} from './dto/project.dto';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,  
    private readonly hubListingService: HubListingService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new project
   */
  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<ProjectResponseDto> {
    // Ensure name is provided
    if (!createProjectDto.name) {
      throw new BadRequestException('Project name is required');
    }

    // Create project with required and optional fields
    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name, // Explicitly set the name
        favorite: createProjectDto.favorite ?? false,
        thumbnail: createProjectDto.thumbnail,
        enableLimitsToAPIs: createProjectDto.enableLimitsToAPIs ?? false,
        tenant: {
          connect: { id: createProjectDto.tenantId }
        },
        target_url:createProjectDto.target_url,
          // Create initial ProjectAcl with OWNER role for the user who created it
        projectAcls: {
          create: {
            userId: userId, // Use direct field instead of relation
          },
        },
      },
    });


    await this.prisma.hubListing.create({
      data: {
        logo: createProjectDto.logo,
        category: createProjectDto.category,
        shortDescription: createProjectDto.description,
        longDescription: '',
        website: '',
        termsOfUse: '',
        visibleToPublic: false,
        healthCheckUrl: '',
        apiDocumentation: '',
        proxySecret: '',
        requestSizeLimitMb: 10,
        proxyTimeoutSeconds: 60,
    
        basicPlan: {
          create: {
            enabled: true,
            pricePerMonth: 29.99,
            requestQuotaPerMonth: 100000,
            hardLimitQuota: 150000,
          },
        },
        proPlan: {
          create: {
            enabled: false,
            pricePerMonth: 29.99,
            requestQuotaPerMonth: 100000,
            hardLimitQuota: 150000,
          },
        },
        ultraPlan: {
          create: {
            enabled: false,
            pricePerMonth: 29.99,
            requestQuotaPerMonth: 100000,
            hardLimitQuota: 150000,
          },
        },
    
        project: {
          connect: { id: project.id },
        },
      },
    });
    

    // Add back the fields for API response that aren't in the database
    return {
      ...project,
      description: createProjectDto.description,
    };
  }

  async findAllForConsumer(): Promise<ProjectResponseDto[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        hubListing: {
          visibleToPublic: true,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        hubListing: true, // if you want to access fields like logo/category later
      },
    });
  
    return projects.map((project) => ({
      ...project,
      description: null, // if you want to hide this field
      // you can optionally expose `project.hubListing.logo`, etc., here
    }));
  }
  
  
  async findOneForConsumer(id: number): Promise<ProjectWithRelationsDto> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        hubListing: {
          include: {
            basicPlan: true, 
            proPlan: true,  
            ultraPlan: true, 
          },
        },
        projectAllowedAPIs: {
          select: {
            apiId: true,
            apiVersionId: true,
            status: true,
          },
        },
      },
    });
  
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  
    const gatewayUrl = this.configService.get<string>('DEFAULT_GATEWAY_URL');
    
    // Generate unique test key per API following the same pattern as onboarding service
    const uniqueTestKey = `test-key-${project.id || project.name.replace(/\s+/g, '_').toLowerCase()}`;
    
    return {
      ...project,
      // Replace target_url with gateway URL so frontend calls go through Veil gateway
      target_url: gatewayUrl,
      gateway_api_key: uniqueTestKey,
      description: null,
      apis: project.projectAllowedAPIs.map((api) => ({
        apiId: api.apiId,
        apiVersionId: api.apiVersionId,
      })),
    };
  }
  

  /**
   * Find all projects accessible by user
   */
  async findAll(userId: string): Promise<ProjectResponseDto[]> {
    // Find all projects where the user has ACL access
    const projects = await this.prisma.project.findMany({
      where: {
        projectAcls: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Transform to add any fields needed in the response
    return projects.map((project) => ({
      ...project,
      description: null, // No description in DB, set to null for API consistency
    }));
  }

  /**
   * Find project by ID (with check if user has access)
   */
  async findOne(id: number, userId: string): Promise<ProjectWithRelationsDto> {
    console.log(
      `[ProjectService.findOne] Attempting to find project ID: ${id} for user ID: ${userId}`,
    );

    // Find project and check if user has ACL access
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        projectAcls: {
          some: {
            userId,
          },
        },
      },
      include: {
        hubListing: {
          include: {
            basicPlan: true, 
            proPlan: true,  
            ultraPlan: true, 
          },
        },
        projectAllowedAPIs: {
          select: {
            apiId: true,
            apiVersionId: true,
            status: true,
            apiModel: { 
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    console.log(
      `[ProjectService.findOne] Prisma query result for project ID ${id}:`,
      project ? `Found project ${project.id}` : 'Not found',
    );

    if (!project) {
      throw new NotFoundException(
        `Project with ID ${id} not found or you don't have access`,
      );
    }

    // Transform to expected format
    const gatewayUrl = this.configService.get<string>('DEFAULT_GATEWAY_URL');
    
    console.log(`[ProjectService.findOne] Original target_url: ${project.target_url}`);
    console.log(`[ProjectService.findOne] Gateway URL from config: ${gatewayUrl}`);
    console.log(`[ProjectService.findOne] Returning target_url: ${gatewayUrl}`);
    
    // Generate unique test key per API following the same pattern as onboarding service
    const uniqueTestKey = `test-key-${project.id || project.name.replace(/\s+/g, '_').toLowerCase()}`;
    
    return {
      ...project,
      // Replace target_url with gateway URL so frontend calls go through Veil gateway
      target_url: gatewayUrl,
      gateway_api_key: uniqueTestKey,
      description: null,
      apis: project.projectAllowedAPIs.map((api) => ({
        apiId: api.apiId,
        apiVersionId: api.apiVersionId,
        name: api.apiModel?.name ?? '',
      })),
    } as ProjectWithRelationsDto;
  }

  /**
   * Update a project
   */
  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
    userId: string,
  ): Promise<ProjectResponseDto> {
    // Check if project exists and user has access
    await this.findOne(id, userId);

    // Extract only updatable fields that exist in the Project model
    const { name, favorite, thumbnail, enableLimitsToAPIs,target_url } = updateProjectDto;

    // Only include fields that are defined and exist in the schema
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (favorite !== undefined) updateData.favorite = favorite;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (target_url !== undefined) updateData.target_url=target_url
    if (enableLimitsToAPIs !== undefined)
      updateData.enableLimitsToAPIs = enableLimitsToAPIs;

    // Update project with valid schema fields
    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: updateData,
    });

    const hubListing = await this.prisma.hubListing.findUnique({
      where: { projectId: id },
    });
    console.log("the hublisting is",hubListing)
  
    if (hubListing) {
      const {
        logo,
        category,
        shortDescription,
        visibleToPublic,
        basicPlan,
        proPlan,
        ultraPlan,
        requestSizeLimitMb,
        website,
        termsOfUse,
        proxyTimeoutSeconds,
        longDescription,
        healthCheckUrl,
        apiDocumentation,
        proxySecret
      } = updateProjectDto as any;
  
      await this.hubListingService.update(hubListing.id, {
        logo,
        category,
        shortDescription: shortDescription,
        visibleToPublic,
        basicPlan,
        proPlan,
        ultraPlan,
        projectId: id,
        requestSizeLimitMb,
        website,
        termsOfUse,
        proxyTimeoutSeconds,
        longDescription,
        healthCheckUrl,
        apiDocumentation,
        proxySecret
      });
    }

    // Add back the fields for API response
    return {
      ...updatedProject,
      description: updateProjectDto.description,
    };
  }

  /**
   * Delete a project (soft delete by setting status to DELETED)
   */
  async remove(id: number, userId: string): Promise<void> {
    // Check if project exists and user has access
    await this.findOne(id, userId);

    // Since there's no status field, we'll hard delete the project
    await this.hardDelete(id);
  }

  /**
   * Hard delete a project (for admins or testing)
   */
  async hardDelete(id: number): Promise<void> {
    // Delete all related records first to maintain referential integrity
    await this.prisma.$transaction([
      // Delete project allowed APIs
      this.prisma.projectAllowedAPI.deleteMany({
        where: { projectId: id },
      }),
      // Delete project ACLs
      this.prisma.projectAcl.deleteMany({
        where: { projectId: id },
      }),
      // Delete project pricing
      this.prisma.projectPricing.deleteMany({
        where: { projectId: id },
      }),
      // Delete project subscriptions (this might need additional logic depending on your business rules)
      this.prisma.subscription.deleteMany({
        where: { projectId: id },
      }),
      // Delete hub listing and its related plans
      this.prisma.hubListing.deleteMany({
        where: { projectId: id },
      }),
      // Finally delete the project
      this.prisma.project.delete({
        where: { id },
      }),
    ]);
  }

  /**
   * Add an API to a project
   */
  async addApiToProject(
    projectId: number,
    apiId: string,
    apiVersionId: string,
    userId: string,
  ): Promise<void> {
    // Check if project exists and user has access
    await this.findOne(projectId, userId);

    // Check if API exists
    const api = await this.prisma.api.findUnique({
      where: { id: apiId },
    });

    if (!api) {
      throw new NotFoundException(`API with ID ${apiId} not found`);
    }

    // Check if API is already linked to project
    const existingLink = await this.prisma.projectAllowedAPI.findFirst({
      where: {
        projectId,
        apiId,
      },
    });

    if (existingLink) {
      throw new BadRequestException(`API is already linked to this project`);
    }

    // Add API to project via ProjectAllowedAPI
    await this.prisma.projectAllowedAPI.create({
      data: {
        projectId: projectId, // Use direct foreign key
        apiId: apiId,
        apiVersionId: apiVersionId,
        status: 'ACTIVE',
        api: {}, // Keep JSON field as empty object placeholder
      },
    });
  }

  /**
   * Remove an API from a project
   */
  async removeApiFromProject(
    projectId: number,
    apiId: string,
    userId: string,
  ): Promise<void> {
    // Check if project exists and user has access
    await this.findOne(projectId, userId);

    // Check if API is linked to project
    const existingLink = await this.prisma.projectAllowedAPI.findFirst({
      where: {
        projectId,
        apiId,
      },
    });

    if (!existingLink) {
      throw new NotFoundException(`API is not linked to this project`);
    }

    // Remove API from project
    await this.prisma.projectAllowedAPI.deleteMany({
      where: {
        projectId,
        apiId,
      },
    });
  }
}