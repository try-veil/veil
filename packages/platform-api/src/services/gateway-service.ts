import { CaddyClient } from './caddy-client';
import { CaddyAPIConfig, CaddyAPIKey } from '../types/caddy-types';

export interface APIGatewayConfig {
  uid: string;
  name: string;
  endpoint: string;
  baseUrl: string;
  methods: string[];
  requiredHeaders?: string[];
}

export interface APIKeyData {
  keyValue: string;
  name: string;
  isActive: boolean;
  expiresAt?: Date;
}

export class GatewayService {
  private caddyClient: CaddyClient;

  constructor() {
    this.caddyClient = new CaddyClient();
  }

  /**
   * Register a new API with the gateway
   */
  async registerAPI(apiConfig: APIGatewayConfig): Promise<void> {
    const caddyConfig: CaddyAPIConfig = {
      path: `/${apiConfig.uid}/*`,
      upstream: this.normalizeUpstream(apiConfig.baseUrl, apiConfig.endpoint),
      required_subscription: apiConfig.uid,
      methods: apiConfig.methods,
      required_headers: apiConfig.requiredHeaders || [],
      api_keys: [] // Keys will be added separately when users subscribe
    };

    try {
      await this.caddyClient.onboardAPI(caddyConfig);
    } catch (error) {
      console.error('Failed to register API with gateway:', error);
      throw new Error(`Gateway registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing API configuration
   */
  async updateAPI(apiConfig: APIGatewayConfig): Promise<void> {
    const path = `/${apiConfig.uid}/*`;
    const caddyConfig: CaddyAPIConfig = {
      path,
      upstream: this.normalizeUpstream(apiConfig.baseUrl, apiConfig.endpoint),
      required_subscription: apiConfig.uid,
      methods: apiConfig.methods,
      required_headers: apiConfig.requiredHeaders || [],
    };

    try {
      await this.caddyClient.updateAPI(path, caddyConfig);
    } catch (error) {
      console.error('Failed to update API in gateway:', error);
      throw new Error(`Gateway update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove an API from the gateway
   */
  async unregisterAPI(apiUid: string): Promise<void> {
    const path = `/${apiUid}/*`;

    try {
      await this.caddyClient.deleteAPI(path);
    } catch (error) {
      console.error('Failed to unregister API from gateway:', error);
      throw new Error(`Gateway unregistration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add API keys for a specific API
   */
  async addAPIKeys(apiUid: string, keys: APIKeyData[]): Promise<void> {
    const path = `/${apiUid}/*`;
    const caddyKeys: CaddyAPIKey[] = keys.map(key => ({
      key: key.keyValue,
      name: key.name,
      is_active: key.isActive,
      expires_at: key.expiresAt?.toISOString()
    }));

    try {
      await this.caddyClient.addAPIKeys({
        path,
        api_keys: caddyKeys
      });
    } catch (error) {
      console.error('Failed to add API keys to gateway:', error);
      throw new Error(`Gateway key addition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update API key status (activate/deactivate)
   */
  async updateAPIKeyStatus(apiUid: string, keyValue: string, isActive: boolean): Promise<void> {
    const path = `/${apiUid}/*`;

    try {
      await this.caddyClient.updateAPIKeyStatus({
        path,
        api_key: keyValue,
        is_active: isActive
      });
    } catch (error) {
      console.error('Failed to update API key status in gateway:', error);
      throw new Error(`Gateway key status update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove an API key from the gateway
   */
  async removeAPIKey(apiUid: string, keyValue: string): Promise<void> {
    const path = `/${apiUid}/*`;

    try {
      await this.caddyClient.deleteAPIKey({
        path,
        api_key: keyValue
      });
    } catch (error) {
      console.error('Failed to remove API key from gateway:', error);
      throw new Error(`Gateway key removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the gateway is healthy and reachable
   */
  async isHealthy(): Promise<boolean> {
    return await this.caddyClient.healthCheck();
  }

  /**
   * Normalize upstream URL by combining base URL and endpoint
   */
  private normalizeUpstream(baseUrl: string, endpoint: string): string {
    // If endpoint is a full URL (starts with http:// or https://), just return it
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    // Remove trailing slash from base URL
    const normalizedBase = baseUrl.replace(/\/$/, '');

    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return `${normalizedBase}${normalizedEndpoint}`;
  }

  /**
   * Generate the gateway URL where the API will be accessible
   */
  getGatewayURL(apiUid: string): string {
    const { gatewayUrl } = require('../config').config.caddy;
    return `${gatewayUrl}/${apiUid}`;
  }
}