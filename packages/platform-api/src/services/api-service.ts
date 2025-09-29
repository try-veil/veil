import { APIRepository, CreateAPIData, UpdateAPIData, APIWithDetails, APISearchFilters, PaginationOptions } from '../repositories/api-repository';
import { CategoryRepository } from '../repositories/category-repository';
import { GatewayService, APIGatewayConfig } from './gateway-service';

export interface CreateAPIRequest {
  name: string;
  description: string;
  version?: string;
  endpoint: string;
  baseUrl: string;
  categoryId?: number;
  documentation?: string;
  price?: string;
  pricingModel?: 'per_request' | 'monthly' | 'yearly' | 'free';
  requestLimit?: number;
  isPublic?: boolean;
  methods: string[];
  requiredHeaders?: Array<{
    name: string;
    value?: string;
    isStatic?: boolean;
    description?: string;
  }>;
}

export interface UpdateAPIRequest {
  name?: string;
  description?: string;
  version?: string;
  endpoint?: string;
  baseUrl?: string;
  categoryId?: number;
  documentation?: string;
  price?: string;
  pricingModel?: 'per_request' | 'monthly' | 'yearly' | 'free';
  requestLimit?: number;
  isPublic?: boolean;
  methods?: string[];
  requiredHeaders?: Array<{
    name: string;
    value?: string;
    isStatic?: boolean;
    description?: string;
  }>;
}

export class APIService {
  private apiRepository: APIRepository;
  private categoryRepository: CategoryRepository;
  private gatewayService: GatewayService;

  constructor() {
    this.apiRepository = new APIRepository();
    this.categoryRepository = new CategoryRepository();
    this.gatewayService = new GatewayService();
  }

  /**
   * Create a new API (Provider only)
   */
  async createAPI(sellerId: number, data: CreateAPIRequest): Promise<APIWithDetails> {
    try {
      // Validate category exists if provided
      if (data.categoryId) {
        const categoryExists = await this.categoryRepository.exists(data.categoryId);
        if (!categoryExists) {
          throw new Error('Invalid category ID');
        }
      }

      // Validate methods
      this.validateMethods(data.methods);
      
      // Validate pricing
      if (data.price && !this.isValidPrice(data.price)) {
        throw new Error('Invalid price format');
      }

      // Create API in database
      const createData: CreateAPIData = {
        sellerId,
        ...data,
      };

      const api = await this.apiRepository.create(createData);

      // Get the full API details
      const apiDetails = await this.apiRepository.findByUid(api.uid);
      if (!apiDetails) {
        throw new Error('Failed to retrieve created API');
      }

      console.log(`API created successfully: ${api.name} (${api.uid})`);
      return apiDetails;

    } catch (error) {
      console.error('Error creating API:', error);
      throw error;
    }
  }

  /**
   * Update an existing API
   */
  async updateAPI(apiId: number, sellerId: number, data: UpdateAPIRequest): Promise<APIWithDetails> {
    try {
      // Check if API exists and belongs to seller
      const existingAPI = await this.apiRepository.findById(apiId);
      if (!existingAPI) {
        throw new Error('API not found');
      }

      if (existingAPI.sellerId !== sellerId) {
        throw new Error('You can only update your own APIs');
      }

      // Validate category if provided
      if (data.categoryId) {
        const categoryExists = await this.categoryRepository.exists(data.categoryId);
        if (!categoryExists) {
          throw new Error('Invalid category ID');
        }
      }

      // Validate methods if provided
      if (data.methods) {
        this.validateMethods(data.methods);
      }

      // Validate pricing if provided
      if (data.price && !this.isValidPrice(data.price)) {
        throw new Error('Invalid price format');
      }

      // Update API in database
      const updatedAPI = await this.apiRepository.update(apiId, data);
      if (!updatedAPI) {
        throw new Error('Failed to update API');
      }

      // If API is active and gateway-related fields changed, update gateway
      if (existingAPI.isActive && this.shouldUpdateGateway(data)) {
        try {
          const gatewayConfig: APIGatewayConfig = {
            uid: existingAPI.uid,
            name: data.name || existingAPI.name,
            endpoint: data.endpoint || existingAPI.endpoint,
            baseUrl: data.baseUrl || existingAPI.baseUrl,
            methods: data.methods || existingAPI.methods,
            requiredHeaders: (data.requiredHeaders || existingAPI.requiredHeaders).map(h => h.headerName),
          };

          await this.gatewayService.updateAPI(gatewayConfig);
          console.log(`Gateway updated for API: ${existingAPI.uid}`);
        } catch (gatewayError) {
          console.error('Failed to update gateway, but API was updated in database:', gatewayError);
          // Don't throw error here - API was successfully updated in database
        }
      }

      // Get updated API details
      const apiDetails = await this.apiRepository.findById(apiId);
      if (!apiDetails) {
        throw new Error('Failed to retrieve updated API');
      }

      return apiDetails;

    } catch (error) {
      console.error('Error updating API:', error);
      throw error;
    }
  }

  /**
   * Delete an API
   */
  async deleteAPI(apiId: number, sellerId: number): Promise<void> {
    try {
      // Check if API exists and belongs to seller
      const existingAPI = await this.apiRepository.findById(apiId);
      if (!existingAPI) {
        throw new Error('API not found');
      }

      if (existingAPI.sellerId !== sellerId) {
        throw new Error('You can only delete your own APIs');
      }

      // Remove from gateway if active
      if (existingAPI.isActive) {
        try {
          await this.gatewayService.unregisterAPI(existingAPI.uid);
          console.log(`API removed from gateway: ${existingAPI.uid}`);
        } catch (gatewayError) {
          console.error('Failed to remove API from gateway:', gatewayError);
          // Continue with database deletion even if gateway fails
        }
      }

      // Delete from database
      const deleted = await this.apiRepository.delete(apiId);
      if (!deleted) {
        throw new Error('Failed to delete API');
      }

      console.log(`API deleted successfully: ${existingAPI.name}`);

    } catch (error) {
      console.error('Error deleting API:', error);
      throw error;
    }
  }

  /**
   * Get API by ID
   */
  async getAPIById(apiId: number, sellerId?: number): Promise<APIWithDetails> {
    try {
      const api = await this.apiRepository.findById(apiId);
      if (!api) {
        throw new Error('API not found');
      }

      // If sellerId is provided, check ownership
      if (sellerId && api.sellerId !== sellerId) {
        throw new Error('You can only access your own APIs');
      }

      return api;

    } catch (error) {
      console.error('Error fetching API:', error);
      throw error;
    }
  }

  /**
   * Get API by UID
   */
  async getAPIByUid(uid: string, sellerId?: number): Promise<APIWithDetails> {
    try {
      const api = await this.apiRepository.findByUid(uid);
      if (!api) {
        throw new Error('API not found');
      }

      // If sellerId is provided, check ownership
      if (sellerId && api.sellerId !== sellerId) {
        throw new Error('You can only access your own APIs');
      }

      return api;

    } catch (error) {
      console.error('Error fetching API:', error);
      throw error;
    }
  }

  /**
   * Get seller's APIs
   */
  async getSellerAPIs(
    sellerId: number,
    filters?: APISearchFilters,
    pagination?: PaginationOptions
  ): Promise<{ apis: APIWithDetails[]; total: number }> {
    try {
      return await this.apiRepository.findAll(
        { ...filters, sellerId },
        pagination
      );
    } catch (error) {
      console.error('Error fetching seller APIs:', error);
      throw new Error('Failed to fetch APIs');
    }
  }

  /**
   * Approve an API (Admin only)
   */
  async approveAPI(apiId: number): Promise<APIWithDetails> {
    try {
      const api = await this.apiRepository.findById(apiId);
      if (!api) {
        throw new Error('API not found');
      }

      if (api.isActive) {
        throw new Error('API is already approved and active');
      }

      // Register with gateway
      const gatewayConfig: APIGatewayConfig = {
        uid: api.uid,
        name: api.name,
        endpoint: api.endpoint,
        baseUrl: api.baseUrl,
        methods: api.methods,
        requiredHeaders: api.requiredHeaders.map(h => h.headerName),
      };

      await this.gatewayService.registerAPI(gatewayConfig);
      console.log(`API registered with gateway: ${api.uid}`);

      // Update status to active
      await this.apiRepository.updateStatus(apiId, true);

      // Get updated API details
      const updatedAPI = await this.apiRepository.findById(apiId);
      if (!updatedAPI) {
        throw new Error('Failed to retrieve approved API');
      }

      console.log(`API approved successfully: ${api.name}`);
      return updatedAPI;

    } catch (error) {
      console.error('Error approving API:', error);
      
      // If gateway registration failed, don't activate the API
      if (error instanceof Error && error.message.includes('Gateway')) {
        throw new Error(`Failed to approve API: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Deactivate an API (Admin only)
   */
  async deactivateAPI(apiId: number): Promise<APIWithDetails> {
    try {
      const api = await this.apiRepository.findById(apiId);
      if (!api) {
        throw new Error('API not found');
      }

      if (!api.isActive) {
        throw new Error('API is already inactive');
      }

      // Remove from gateway
      try {
        await this.gatewayService.unregisterAPI(api.uid);
        console.log(`API removed from gateway: ${api.uid}`);
      } catch (gatewayError) {
        console.error('Failed to remove API from gateway:', gatewayError);
        // Continue with deactivation even if gateway fails
      }

      // Update status to inactive
      await this.apiRepository.updateStatus(apiId, false);

      // Get updated API details
      const updatedAPI = await this.apiRepository.findById(apiId);
      if (!updatedAPI) {
        throw new Error('Failed to retrieve deactivated API');
      }

      console.log(`API deactivated successfully: ${api.name}`);
      return updatedAPI;

    } catch (error) {
      console.error('Error deactivating API:', error);
      throw error;
    }
  }

  /**
   * Get gateway URL for an API
   */
  getGatewayURL(apiUid: string): string {
    return this.gatewayService.getGatewayURL(apiUid);
  }

  /**
   * Validate HTTP methods
   */
  private validateMethods(methods: string[]): void {
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
    const invalidMethods = methods.filter(method => 
      !validMethods.includes(method.toUpperCase())
    );

    if (invalidMethods.length > 0) {
      throw new Error(`Invalid HTTP methods: ${invalidMethods.join(', ')}`);
    }

    if (methods.length === 0) {
      throw new Error('At least one HTTP method is required');
    }
  }

  /**
   * Validate price format
   */
  private isValidPrice(price: string): boolean {
    const priceRegex = /^\d+(\.\d{1,2})?$/;
    return priceRegex.test(price) && parseFloat(price) >= 0;
  }

  /**
   * Check if gateway should be updated based on changed fields
   */
  private shouldUpdateGateway(data: UpdateAPIRequest): boolean {
    return !!(
      data.endpoint ||
      data.baseUrl ||
      data.methods ||
      data.requiredHeaders
    );
  }
}