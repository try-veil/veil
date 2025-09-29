import { APIRepository, APIWithDetails, APISearchFilters, PaginationOptions } from '../repositories/api-repository';
import { CategoryRepository } from '../repositories/category-repository';

export interface MarketplaceAPI {
  uid: string;
  name: string;
  description: string;
  version: string;
  endpoint: string;
  price: string;
  pricingModel: string;
  requestLimit: number;
  averageRating: number;
  totalRatings: number;
  totalSubscriptions: number;
  createdAt: Date;
  seller: {
    id: number;
    firstName: string;
    lastName: string;
    verified: boolean;
  };
  category: {
    id: number;
    name: string;
  } | null;
  methods: string[];
  sampleRequests?: Array<{
    method: string;
    path: string;
    description: string;
  }>;
}

export interface MarketplaceAPIDetails extends MarketplaceAPI {
  documentation: string | null;
  requiredHeaders: Array<{
    name: string;
    description: string | null;
    isRequired: boolean;
  }>;
  recentReviews: Array<{
    rating: number;
    review: string;
    reviewerName: string;
    createdAt: Date;
  }>;
}

export interface MarketplaceFilters {
  search?: string;
  categoryId?: number;
  pricingModel?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'popularity' | 'rating' | 'price_low' | 'price_high' | 'newest';
}

export class MarketplaceService {
  private apiRepository: APIRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.apiRepository = new APIRepository();
    this.categoryRepository = new CategoryRepository();
  }

  /**
   * Get all marketplace APIs (public and active only)
   */
  async getMarketplaceAPIs(
    filters?: MarketplaceFilters,
    pagination?: PaginationOptions
  ): Promise<{ apis: MarketplaceAPI[]; total: number }> {
    try {
      // Convert marketplace filters to repository filters
      const repoFilters: APISearchFilters = {
        search: filters?.search,
        categoryId: filters?.categoryId,
        pricingModel: filters?.pricingModel,
        isActive: true,
        isPublic: true,
      };

      const result = await this.apiRepository.findAll(repoFilters, pagination);

      // Transform to marketplace format
      let apis = result.apis.map(api => this.transformToMarketplaceAPI(api));

      // Apply additional filters
      if (filters?.minPrice !== undefined) {
        apis = apis.filter(api => parseFloat(api.price) >= filters.minPrice!);
      }

      if (filters?.maxPrice !== undefined) {
        apis = apis.filter(api => parseFloat(api.price) <= filters.maxPrice!);
      }

      if (filters?.minRating !== undefined) {
        apis = apis.filter(api => api.averageRating >= filters.minRating!);
      }

      // Apply sorting
      if (filters?.sortBy) {
        apis = this.sortAPIs(apis, filters.sortBy);
      }

      return {
        apis,
        total: result.total
      };

    } catch (error) {
      console.error('Error fetching marketplace APIs:', error);
      throw new Error('Failed to fetch marketplace APIs');
    }
  }

  /**
   * Get API details by UID (public only)
   */
  async getAPIDetails(uid: string): Promise<MarketplaceAPIDetails> {
    try {
      const api = await this.apiRepository.findByUid(uid);
      
      if (!api) {
        throw new Error('API not found');
      }

      if (!api.isActive || !api.isPublic) {
        throw new Error('API not found');
      }

      return this.transformToMarketplaceAPIDetails(api);

    } catch (error) {
      console.error('Error fetching API details:', error);
      throw error;
    }
  }

  /**
   * Get all categories with API count
   */
  async getCategories() {
    try {
      return await this.categoryRepository.findAll();
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  /**
   * Search APIs with advanced filters
   */
  async searchAPIs(
    query: string,
    filters?: MarketplaceFilters,
    pagination?: PaginationOptions
  ): Promise<{ apis: MarketplaceAPI[]; total: number }> {
    try {
      return await this.getMarketplaceAPIs(
        { ...filters, search: query },
        pagination
      );
    } catch (error) {
      console.error('Error searching APIs:', error);
      throw new Error('Failed to search APIs');
    }
  }

  /**
   * Get featured APIs (high rating, popular)
   */
  async getFeaturedAPIs(limit: number = 10): Promise<MarketplaceAPI[]> {
    try {
      const result = await this.getMarketplaceAPIs(
        { minRating: 4.0, sortBy: 'popularity' },
        { page: 1, limit }
      );

      return result.apis;
    } catch (error) {
      console.error('Error fetching featured APIs:', error);
      throw new Error('Failed to fetch featured APIs');
    }
  }

  /**
   * Get trending APIs (recently popular)
   */
  async getTrendingAPIs(limit: number = 10): Promise<MarketplaceAPI[]> {
    try {
      const result = await this.getMarketplaceAPIs(
        { sortBy: 'newest' },
        { page: 1, limit }
      );

      return result.apis.filter(api => api.totalSubscriptions > 0);
    } catch (error) {
      console.error('Error fetching trending APIs:', error);
      throw new Error('Failed to fetch trending APIs');
    }
  }

  /**
   * Transform API to marketplace format
   */
  private transformToMarketplaceAPI(api: APIWithDetails): MarketplaceAPI {
    console.log('Marketplace Service - Transform API', api.name, 'seller:', api.seller);
    return {
      uid: api.uid,
      name: api.name,
      description: api.description,
      version: api.version,
      endpoint: api.endpoint,
      price: api.price,
      pricingModel: api.pricingModel,
      requestLimit: api.requestLimit,
      averageRating: parseFloat(api.averageRating || '0'),
      totalRatings: api.totalRatings,
      totalSubscriptions: api.totalSubscriptions,
      createdAt: api.createdAt,
      seller: {
        id: api.seller?.id || 0,
        firstName: api.seller?.firstName || 'Unknown',
        lastName: api.seller?.lastName || 'Seller',
        verified: true, // TODO: Add verification logic
      },
      category: api.category ? {
        id: api.category.id,
        name: api.category.name,
      } : null,
      methods: api.methods,
      sampleRequests: this.generateSampleRequests(api),
    };
  }

  /**
   * Transform API to detailed marketplace format
   */
  private transformToMarketplaceAPIDetails(api: APIWithDetails): MarketplaceAPIDetails {
    const baseApi = this.transformToMarketplaceAPI(api);

    return {
      ...baseApi,
      documentation: api.documentation,
      requiredHeaders: api.requiredHeaders.map(header => ({
        name: header.headerName,
        description: header.description,
        isRequired: true,
      })),
      recentReviews: [], // TODO: Implement reviews fetching
    };
  }

  /**
   * Generate sample requests based on API configuration
   */
  private generateSampleRequests(api: APIWithDetails): Array<{ method: string; path: string; description: string }> {
    const samples: Array<{ method: string; path: string; description: string }> = [];
    
    // Generate common sample requests based on methods
    api.methods.forEach(method => {
      switch (method) {
        case 'GET':
          samples.push({
            method: 'GET',
            path: `${api.endpoint}`,
            description: `Retrieve ${api.name.toLowerCase()} data`
          });
          break;
        case 'POST':
          samples.push({
            method: 'POST',
            path: `${api.endpoint}`,
            description: `Create new ${api.name.toLowerCase()} resource`
          });
          break;
        case 'PUT':
          samples.push({
            method: 'PUT',
            path: `${api.endpoint}/{id}`,
            description: `Update ${api.name.toLowerCase()} resource`
          });
          break;
        case 'DELETE':
          samples.push({
            method: 'DELETE',
            path: `${api.endpoint}/{id}`,
            description: `Delete ${api.name.toLowerCase()} resource`
          });
          break;
      }
    });

    return samples.slice(0, 3); // Limit to 3 samples
  }

  /**
   * Sort APIs based on criteria
   */
  private sortAPIs(apis: MarketplaceAPI[], sortBy: string): MarketplaceAPI[] {
    switch (sortBy) {
      case 'popularity':
        return apis.sort((a, b) => b.totalSubscriptions - a.totalSubscriptions);
      case 'rating':
        return apis.sort((a, b) => b.averageRating - a.averageRating);
      case 'price_low':
        return apis.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      case 'price_high':
        return apis.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      case 'newest':
        return apis.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      default:
        return apis;
    }
  }
}