import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MarketplaceApiQueryDto,
  MarketplaceSearchQueryDto,
  MarketplaceApiDto,
  MarketplaceApiDetailsDto,
  MarketplaceCategoryDto,
  MarketplaceApiListResponseDto,
} from './dto/marketplace.dto';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all marketplace APIs with filtering, search, and pagination
   */
  async getMarketplaceApis(
    query: MarketplaceApiQueryDto,
  ): Promise<MarketplaceApiListResponseDto> {
    const {
      category,
      search,
      sort = 'created_at',
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      status: 'ACTIVE',
      projectAllowedAPIs: {
        some: {
          project: {
            hubListing: {
              visibleToPublic: true,
            },
          },
        },
      },
    };

    // Add category filter
    if (category) {
      whereClause.projectAllowedAPIs.some.project.hubListing.category = {
        contains: category,
        mode: 'insensitive',
      };
    }

    // Add search filter
    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sort) {
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'popularity':
        // For now, use created_at as proxy for popularity
        orderBy = { createdAt: 'desc' };
        break;
      case 'updated_at':
        orderBy = { updatedAt: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Get APIs with pagination
    const [apis, total] = await Promise.all([
      this.prisma.api.findMany({
        where: whereClause,
        include: {
          projectAllowedAPIs: {
            include: {
              project: {
                include: {
                  hubListing: {
                    select: {
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.api.count({
        where: whereClause,
      }),
    ]);

    // Get provider information separately
    const providerIds = [...new Set(apis.map((api) => api.providerId))];
    const providers = await this.prisma.user.findMany({
      where: {
        id: {
          in: providerIds,
        },
      },
      select: {
        id: true,
        name: true,
        thumbnail: true, // Use thumbnail as logo
      },
    });

    const providerMap = new Map(providers.map((p) => [p.id, p]));

    const mappedApis = apis.map((api) =>
      this.mapToMarketplaceApi(api, providerMap),
    );

    return {
      apis: mappedApis,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get API details for marketplace
   */
  async getMarketplaceApiDetails(
    apiId: string,
  ): Promise<MarketplaceApiDetailsDto> {
    const api = await this.prisma.api.findFirst({
      where: {
        id: apiId,
        status: 'ACTIVE',
        projectAllowedAPIs: {
          some: {
            project: {
              hubListing: {
                visibleToPublic: true,
              },
            },
          },
        },
      },
      include: {
        projectAllowedAPIs: {
          include: {
            project: {
              include: {
                hubListing: {
                  select: {
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!api) {
      throw new NotFoundException(
        `API with ID ${apiId} not found in marketplace`,
      );
    }

    // Get provider information separately
    const provider = await this.prisma.user.findUnique({
      where: { id: api.providerId },
      select: {
        id: true,
        name: true,
        thumbnail: true,
      },
    });

    const providerMap = new Map();
    if (provider) {
      providerMap.set(provider.id, provider);
    }

    return this.mapToMarketplaceApiDetails(api, providerMap);
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<MarketplaceCategoryDto[]> {
    const categories = await this.prisma.hubListing.groupBy({
      by: ['category'],
      where: {
        visibleToPublic: true,
        category: {
          not: null,
        },
      },
      _count: {
        category: true,
      },
    });

    return categories.map((cat) => ({
      name: cat.category.toLowerCase(),
      display_name: this.formatCategoryName(cat.category),
      api_count: cat._count.category,
    }));
  }

  /**
   * Search APIs
   */
  async searchApis(
    query: MarketplaceSearchQueryDto,
  ): Promise<MarketplaceApiListResponseDto> {
    const { q, category, page = 1, limit = 20 } = query;

    // Use the existing getMarketplaceApis method with search parameters
    return this.getMarketplaceApis({
      search: q,
      category,
      page,
      limit,
      sort: 'popularity', // Default to popularity for search results
    });
  }

  /**
   * Map API to marketplace format
   */
  private mapToMarketplaceApi(
    api: any,
    providerMap: Map<string, any>,
  ): MarketplaceApiDto {
    const project = api.projectAllowedAPIs?.[0]?.project;
    const category = project?.hubListing?.category || 'general';
    const provider = providerMap.get(api.providerId);

    return {
      api_id: api.id,
      name: api.name,
      description: api.description || '',
      category: category.toLowerCase(),
      provider: {
        id: provider?.id || api.providerId,
        name: provider?.name || 'Unknown Provider',
        logo: provider?.thumbnail || null,
      },
      path: api.path,
      method: api.method,
      version: api.version,
      documentation_url: api.documentationUrl,
      status: api.status,
      created_at: api.createdAt,
      updated_at: api.updatedAt,
    };
  }

  /**
   * Map API to detailed marketplace format
   */
  private mapToMarketplaceApiDetails(
    api: any,
    providerMap: Map<string, any>,
  ): MarketplaceApiDetailsDto {
    const baseApi = this.mapToMarketplaceApi(api, providerMap);

    // Map required headers from JSON format to array
    const headers = Object.entries((api.requiredHeaders as any) || {}).map(
      ([name, details]: [string, any]) => ({
        name,
        value: details.value,
        is_variable: details.isVariable,
      }),
    );

    // Extract parameters from specification if available
    const parameters = (api.specification as any)?.parameters || [];

    return {
      ...baseApi,
      required_subscription:
        (api.specification as any)?.required_subscription || 'basic',
      required_headers: headers,
      parameters: parameters,
    };
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
