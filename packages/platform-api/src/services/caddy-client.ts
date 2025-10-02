import { config } from '../config';
import {
  CaddyAPIConfig,
  CaddyAPIKeysRequest,
  CaddyAPIKeyStatusRequest,
  CaddyAPIKeyDeleteRequest,
  CaddyAPIResponse,
  CaddyErrorResponse,
  CaddyAPIError
} from '../types/caddy-types';

export class CaddyClient {
  private baseUrl: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor() {
    this.baseUrl = config.caddy.managementUrl;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx status codes
    return !error.response || 
           error.response.status >= 500 || 
           error.code === 'ECONNREFUSED' ||
           error.code === 'ETIMEDOUT';
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        console.error(`${operationName} attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Retrying ${operationName} in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }
        
        break;
      }
    }
    
    throw new CaddyAPIError(
      `${operationName} failed after ${this.maxRetries} attempts: ${lastError.message}`,
      undefined,
      lastError
    );
  }

  private async makeRequest(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestOptions);
    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      responseData = { message: responseText };
    }

    if (!response.ok) {
      throw new CaddyAPIError(
        responseData.error || responseData.message || `HTTP ${response.status}`,
        response.status,
        responseData
      );
    }

    return responseData;
  }

  /**
   * Onboard a new API to the Caddy gateway
   */
  async onboardAPI(config: CaddyAPIConfig): Promise<CaddyAPIResponse> {
    return this.executeWithRetry(async () => {
      console.log('Onboarding API to Caddy:', config.path);
      
      const response = await this.makeRequest('POST', '/veil/api/routes', config);
      
      console.log('API onboarded successfully:', config.path);
      return response;
    }, 'API onboarding');
  }

  /**
   * Update an existing API configuration
   */
  async updateAPI(path: string, config: CaddyAPIConfig): Promise<CaddyAPIResponse> {
    return this.executeWithRetry(async () => {
      console.log('Updating API in Caddy:', path);
      
      const encodedPath = encodeURIComponent(path);
      const response = await this.makeRequest('PUT', `/veil/api/routes/${encodedPath}`, config);
      
      console.log('API updated successfully:', path);
      return response;
    }, 'API update');
  }

  /**
   * Delete an API from the Caddy gateway
   */
  async deleteAPI(path: string): Promise<CaddyAPIResponse> {
    return this.executeWithRetry(async () => {
      console.log('Deleting API from Caddy:', path);
      
      const encodedPath = encodeURIComponent(path);
      const response = await this.makeRequest('DELETE', `/veil/api/routes/${encodedPath}`);
      
      console.log('API deleted successfully:', path);
      return response;
    }, 'API deletion');
  }

  /**
   * Add API keys to an existing API
   */
  async addAPIKeys(request: CaddyAPIKeysRequest): Promise<CaddyAPIResponse> {
    return this.executeWithRetry(async () => {
      console.log('Adding API keys to Caddy:', request.path, `(${request.api_keys.length} keys)`);
      
      const response = await this.makeRequest('POST', '/veil/api/keys', request);
      
      console.log('API keys added successfully:', request.path);
      return response;
    }, 'API keys addition');
  }

  /**
   * Update API key status (activate/deactivate)
   */
  async updateAPIKeyStatus(request: CaddyAPIKeyStatusRequest): Promise<CaddyAPIResponse> {
    return this.executeWithRetry(async () => {
      console.log('Updating API key status in Caddy:', request.api_key, request.is_active);
      
      const response = await this.makeRequest('PUT', '/veil/api/keys/status', request);
      
      console.log('API key status updated successfully:', request.api_key);
      return response;
    }, 'API key status update');
  }

  /**
   * Delete an API key
   */
  async deleteAPIKey(request: CaddyAPIKeyDeleteRequest): Promise<CaddyAPIResponse> {
    return this.executeWithRetry(async () => {
      console.log('Deleting API key from Caddy:', request.api_key);
      
      const response = await this.makeRequest('DELETE', '/veil/api/keys', request);
      
      console.log('API key deleted successfully:', request.api_key);
      return response;
    }, 'API key deletion');
  }

  /**
   * Health check for Caddy gateway
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      return response.ok;
    } catch (error) {
      console.error('Caddy health check failed:', error);
      return false;
    }
  }
}