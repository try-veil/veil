import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  VeilClientOptions,
  VeilError,
  APIOnboardRequest,
  APIKeysRequest,
  APIKeyStatusRequest,
  APIKeyDeleteRequest,
  APIResponse,
  ErrorResponse,
  APIConfig
} from './types';

/**
 * Veil API Gateway Management Client
 * 
 * Provides a comprehensive interface for managing API configurations,
 * API keys, and routing through the Veil Caddy module.
 */
export class VeilClient {
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  /**
   * Creates a new Veil client instance
   * 
   * @param options - Configuration options for the client
   */
  constructor(options: VeilClientOptions = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:2020';
    
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Add response interceptor for error handling
    this.http.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const errorData = error.response.data as ErrorResponse;
          throw new VeilError(
            errorData.error || error.message,
            error.response.status,
            error.response.data
          );
        }
        throw new VeilError(error.message);
      }
    );
  }

  /**
   * Onboards a new API by creating the configuration and updating Caddy routes
   * 
   * @param request - The API onboarding configuration
   * @returns Promise resolving to the API response with created configuration
   */
  async onboardAPI(request: APIOnboardRequest): Promise<APIResponse<APIConfig>> {
    try {
      const response: AxiosResponse<APIResponse<APIConfig>> = await this.http.post(
        '/veil/api/routes',
        request
      );
      return response.data;
    } catch (error) {
      if (error instanceof VeilError) {
        throw error;
      }
      throw new VeilError(`Failed to onboard API: ${error}`);
    }
  }

  /**
   * Updates an existing API configuration
   * 
   * @param apiPath - The API path to update (will be URL-encoded)
   * @param request - The updated API configuration
   * @returns Promise resolving to the API response with updated configuration
   */
  async updateAPI(apiPath: string, request: APIOnboardRequest): Promise<APIResponse<APIConfig>> {
    try {
      const encodedPath = encodeURIComponent(apiPath);
      const response: AxiosResponse<APIResponse<APIConfig>> = await this.http.put(
        `/veil/api/routes/${encodedPath}`,
        request
      );
      return response.data;
    } catch (error) {
      if (error instanceof VeilError) {
        throw error;
      }
      throw new VeilError(`Failed to update API: ${error}`);
    }
  }

  /**
   * Partially updates an existing API configuration
   * 
   * @param apiPath - The API path to update (will be URL-encoded)
   * @param request - The partial API configuration update
   * @returns Promise resolving to the API response with updated configuration
   */
  async patchAPI(apiPath: string, request: Partial<APIOnboardRequest>): Promise<APIResponse<APIConfig>> {
    try {
      const encodedPath = encodeURIComponent(apiPath);
      const response: AxiosResponse<APIResponse<APIConfig>> = await this.http.patch(
        `/veil/api/routes/${encodedPath}`,
        request
      );
      return response.data;
    } catch (error) {
      if (error instanceof VeilError) {
        throw error;
      }
      throw new VeilError(`Failed to patch API: ${error}`);
    }
  }

  /**
   * Deletes an API configuration from the database and removes routes from Caddy
   * 
   * @param apiPath - The API path to delete (will be URL-encoded)
   * @returns Promise resolving to the API response confirming deletion
   */
  async deleteAPI(apiPath: string): Promise<APIResponse> {
    try {
      const encodedPath = encodeURIComponent(apiPath);
      const response: AxiosResponse<APIResponse> = await this.http.delete(
        `/veil/api/routes/${encodedPath}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof VeilError) {
        throw error;
      }
      throw new VeilError(`Failed to delete API: ${error}`);
    }
  }

  /**
   * Adds new API keys to an existing API configuration
   * 
   * @param request - The API keys to add
   * @returns Promise resolving to the API response with updated configuration
   */
  async addAPIKeys(request: APIKeysRequest): Promise<APIResponse<APIConfig>> {
    try {
      const response: AxiosResponse<APIResponse<APIConfig>> = await this.http.post(
        '/veil/api/keys',
        request
      );
      return response.data;
    } catch (error) {
      if (error instanceof VeilError) {
        throw error;
      }
      throw new VeilError(`Failed to add API keys: ${error}`);
    }
  }

  /**
   * Adds new API keys to an existing API configuration (alternative PUT method)
   * 
   * @param request - The API keys to add
   * @returns Promise resolving to the API response with updated configuration
   */
  async addAPIKeysPut(request: APIKeysRequest): Promise<APIResponse<APIConfig>> {
    try {
      const response: AxiosResponse<APIResponse<APIConfig>> = await this.http.put(
        '/veil/api/keys',
        request
      );
      return response.data;
    } catch (error) {
      if (error instanceof VeilError) {
        throw error;
      }
      throw new VeilError(`Failed to add API keys: ${error}`);
    }
  }

  /**
   * Deletes a specific API key from an API configuration
   * 
   * @param request - The API key deletion request
   * @returns Promise resolving to the API response confirming deletion
   */
  async deleteAPIKey(request: APIKeyDeleteRequest): Promise<APIResponse> {
    try {
      const response: AxiosResponse<APIResponse> = await this.http.delete(
        '/veil/api/keys',
        { data: request }
      );
      return response.data;
    } catch (error) {
      if (error instanceof VeilError) {
        throw error;
      }
      throw new VeilError(`Failed to delete API key: ${error}`);
    }
  }

  /**
   * Updates the active status of an API key
   * 
   * @param request - The API key status update request
   * @returns Promise resolving to the API response with updated configuration
   */
  async updateAPIKeyStatus(request: APIKeyStatusRequest): Promise<APIResponse<APIConfig>> {
    try {
      const response: AxiosResponse<APIResponse<APIConfig>> = await this.http.put(
        '/veil/api/keys/status',
        request
      );
      return response.data;
    } catch (error) {
      if (error instanceof VeilError) {
        throw error;
      }
      throw new VeilError(`Failed to update API key status: ${error}`);
    }
  }

  /**
   * Updates the active status of an API key (alternative PATCH method)
   * 
   * @param request - The API key status update request
   * @returns Promise resolving to the API response with updated configuration
   */
  async updateAPIKeyStatusPatch(request: APIKeyStatusRequest): Promise<APIResponse<APIConfig>> {
    try {
      const response: AxiosResponse<APIResponse<APIConfig>> = await this.http.patch(
        '/veil/api/keys/status',
        request
      );
      return response.data;
    } catch (error) {
      if (error instanceof VeilError) {
        throw error;
      }
      throw new VeilError(`Failed to update API key status: ${error}`);
    }
  }

  /**
   * Gets the current base URL for the management API
   */
  get managementUrl(): string {
    return this.baseUrl;
  }

  /**
   * Gets the proxied APIs server URL (typically port 2021)
   */
  get proxiedUrl(): string {
    const url = new URL(this.baseUrl);
    url.port = '2021';
    return url.toString();
  }
}