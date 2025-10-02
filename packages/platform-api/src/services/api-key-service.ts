import { APIKeyRepository, CreateAPIKeyData, UpdateAPIKeyData, APIKeyWithDetails, APIKeyFilters } from '../repositories/api-key-repository';
import { SubscriptionRepository } from '../repositories/subscription-repository';
import { GatewayService } from './gateway-service';

export interface CreateAPIKeyRequest {
  subscriptionUid: string;
  name: string;
  description?: string;
  expiresAt?: string;
  permissions?: string[];
}

export interface UpdateAPIKeyRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  expiresAt?: string | null;
  permissions?: string[];
}

export interface APIKeyResponse extends APIKeyWithDetails {
  maskedKey: string;
  isExpired: boolean;
  daysUntilExpiry?: number;
}

export interface APIKeyRegenerationResult {
  uid: string;
  newKeyValue: string;
  maskedKey: string;
  regeneratedAt: Date;
  reason: string;
}

export interface BulkAPIKeyResult {
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    keyUid: string;
    error: string;
  }>;
}

export class APIKeyService {
  private apiKeyRepository: APIKeyRepository;
  private subscriptionRepository: SubscriptionRepository;
  private gatewayService: GatewayService;

  constructor() {
    this.apiKeyRepository = new APIKeyRepository();
    this.subscriptionRepository = new SubscriptionRepository();
    this.gatewayService = new GatewayService();
  }

  /**
   * Create a new API key
   */
  async createAPIKey(
    userId: number,
    request: CreateAPIKeyRequest
  ): Promise<APIKeyResponse> {
    try {
      // Find and validate subscription
      const subscription = await this.subscriptionRepository.findByUid(request.subscriptionUid);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.userId !== userId) {
        throw new Error('You can only create API keys for your own subscriptions');
      }

      if (subscription.status !== 'active') {
        throw new Error('Cannot create API key for inactive subscription');
      }

      // Check if subscription already has maximum number of keys (e.g., 5)
      const existingKeys = await this.apiKeyRepository.findBySubscription(subscription.id);
      const activeKeys = existingKeys.filter(key => key.isActive);
      
      if (activeKeys.length >= 5) {
        throw new Error('Maximum number of API keys (5) reached for this subscription');
      }

      // Create API key
      const keyData: CreateAPIKeyData = {
        subscriptionId: subscription.id,
        name: request.name,
        description: request.description,
        expiresAt: request.expiresAt ? new Date(request.expiresAt) : undefined,
        permissions: request.permissions || ['read'],
      };

      const apiKey = await this.apiKeyRepository.create(keyData);
      const fullApiKey = await this.apiKeyRepository.findById(apiKey.id);
      
      if (!fullApiKey) {
        throw new Error('Failed to retrieve created API key');
      }

      // Register key with gateway
      try {
        await this.gatewayService.addAPIKeys(subscription.api.uid, [{
          keyValue: apiKey.keyValue,
          isActive: true,
          expiresAt: apiKey.expiresAt,
          permissions: request.permissions || ['read'],
          subscriptionId: subscription.id,
        }]);
      } catch (gatewayError) {
        console.error('Failed to register key with gateway:', gatewayError);
        // Key is created in DB but not in gateway - could be handled by retry mechanism
      }

      console.log(`API key created successfully: ${apiKey.uid} for subscription ${request.subscriptionUid}`);
      
      return this.formatAPIKeyResponse(fullApiKey);

    } catch (error) {
      console.error('Error creating API key:', error);
      throw error;
    }
  }

  /**
   * Get API key by UID
   */
  async getAPIKey(keyUid: string, userId?: number): Promise<APIKeyResponse> {
    try {
      const apiKey = await this.apiKeyRepository.findByUid(keyUid);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      // Check ownership if userId provided
      if (userId && apiKey.user.id !== userId) {
        throw new Error('You can only access your own API keys');
      }

      return this.formatAPIKeyResponse(apiKey);

    } catch (error) {
      console.error('Error fetching API key:', error);
      throw error;
    }
  }

  /**
   * Get user's API keys
   */
  async getUserAPIKeys(
    userId: number,
    filters?: APIKeyFilters
  ): Promise<APIKeyResponse[]> {
    try {
      const apiKeys = await this.apiKeyRepository.findByUser(userId, filters);
      return apiKeys.map(key => this.formatAPIKeyResponse(key));

    } catch (error) {
      console.error('Error fetching user API keys:', error);
      throw new Error('Failed to fetch API keys');
    }
  }

  /**
   * Get API keys for a subscription
   */
  async getSubscriptionAPIKeys(
    subscriptionUid: string,
    userId: number
  ): Promise<APIKeyResponse[]> {
    try {
      const subscription = await this.subscriptionRepository.findByUid(subscriptionUid);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.userId !== userId) {
        throw new Error('You can only access API keys for your own subscriptions');
      }

      const apiKeys = await this.apiKeyRepository.findBySubscription(subscription.id);
      return apiKeys.map(key => this.formatAPIKeyResponse(key));

    } catch (error) {
      console.error('Error fetching subscription API keys:', error);
      throw error;
    }
  }

  /**
   * Update API key
   */
  async updateAPIKey(
    keyUid: string,
    userId: number,
    request: UpdateAPIKeyRequest
  ): Promise<APIKeyResponse> {
    try {
      const apiKey = await this.apiKeyRepository.findByUid(keyUid);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      if (apiKey.user.id !== userId) {
        throw new Error('You can only update your own API keys');
      }

      // Prepare update data
      const updateData: UpdateAPIKeyData = {
        ...request,
        expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
      };

      const updatedKey = await this.apiKeyRepository.update(apiKey.id, updateData);
      if (!updatedKey) {
        throw new Error('Failed to update API key');
      }

      // Update key in gateway if status changed
      if (request.isActive !== undefined && request.isActive !== apiKey.isActive) {
        try {
          await this.gatewayService.updateAPIKeyStatus(
            apiKey.api.uid,
            apiKey.keyValue,
            request.isActive
          );
        } catch (gatewayError) {
          console.error('Failed to update key status in gateway:', gatewayError);
        }
      }

      // Get updated key details
      const fullUpdatedKey = await this.apiKeyRepository.findById(apiKey.id);
      if (!fullUpdatedKey) {
        throw new Error('Failed to retrieve updated API key');
      }

      return this.formatAPIKeyResponse(fullUpdatedKey);

    } catch (error) {
      console.error('Error updating API key:', error);
      throw error;
    }
  }

  /**
   * Regenerate API key
   */
  async regenerateAPIKey(
    keyUid: string,
    userId: number,
    reason: string
  ): Promise<APIKeyRegenerationResult> {
    try {
      const apiKey = await this.apiKeyRepository.findByUid(keyUid);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      if (apiKey.user.id !== userId) {
        throw new Error('You can only regenerate your own API keys');
      }

      if (!apiKey.isActive) {
        throw new Error('Cannot regenerate inactive API key');
      }

      // Remove old key from gateway
      try {
        await this.gatewayService.removeAPIKey(apiKey.api.uid, apiKey.keyValue);
      } catch (gatewayError) {
        console.error('Failed to remove old key from gateway:', gatewayError);
      }

      // Generate new key
      const newKeyValue = await this.apiKeyRepository.regenerate(apiKey.id);

      // Add new key to gateway
      try {
        await this.gatewayService.addAPIKeys(apiKey.api.uid, [{
          keyValue: newKeyValue,
          isActive: true,
          expiresAt: apiKey.expiresAt,
          permissions: apiKey.permissions,
          subscriptionId: apiKey.subscriptionId,
        }]);
      } catch (gatewayError) {
        console.error('Failed to add new key to gateway:', gatewayError);
      }

      console.log(`API key regenerated: ${keyUid}, reason: ${reason}`);

      return {
        uid: keyUid,
        newKeyValue,
        maskedKey: this.maskAPIKey(newKeyValue),
        regeneratedAt: new Date(),
        reason,
      };

    } catch (error) {
      console.error('Error regenerating API key:', error);
      throw error;
    }
  }

  /**
   * Revoke (deactivate) API key
   */
  async revokeAPIKey(
    keyUid: string,
    userId: number,
    reason?: string
  ): Promise<APIKeyResponse> {
    try {
      const apiKey = await this.apiKeyRepository.findByUid(keyUid);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      if (apiKey.user.id !== userId) {
        throw new Error('You can only revoke your own API keys');
      }

      if (!apiKey.isActive) {
        throw new Error('API key is already inactive');
      }

      // Deactivate key
      const deactivatedKey = await this.apiKeyRepository.deactivate(apiKey.id);
      if (!deactivatedKey) {
        throw new Error('Failed to revoke API key');
      }

      // Remove key from gateway
      try {
        await this.gatewayService.updateAPIKeyStatus(
          apiKey.api.uid,
          apiKey.keyValue,
          false
        );
      } catch (gatewayError) {
        console.error('Failed to deactivate key in gateway:', gatewayError);
      }

      console.log(`API key revoked: ${keyUid}, reason: ${reason || 'No reason provided'}`);

      // Get updated key details
      const fullKey = await this.apiKeyRepository.findById(apiKey.id);
      if (!fullKey) {
        throw new Error('Failed to retrieve revoked API key');
      }

      return this.formatAPIKeyResponse(fullKey);

    } catch (error) {
      console.error('Error revoking API key:', error);
      throw error;
    }
  }

  /**
   * Delete API key permanently
   */
  async deleteAPIKey(keyUid: string, userId: number): Promise<void> {
    try {
      const apiKey = await this.apiKeyRepository.findByUid(keyUid);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      if (apiKey.user.id !== userId) {
        throw new Error('You can only delete your own API keys');
      }

      // Remove key from gateway first
      if (apiKey.isActive) {
        try {
          await this.gatewayService.removeAPIKey(apiKey.api.uid, apiKey.keyValue);
        } catch (gatewayError) {
          console.error('Failed to remove key from gateway:', gatewayError);
        }
      }

      // Delete from database
      const deleted = await this.apiKeyRepository.delete(apiKey.id);
      if (!deleted) {
        throw new Error('Failed to delete API key');
      }

      console.log(`API key deleted: ${keyUid}`);

    } catch (error) {
      console.error('Error deleting API key:', error);
      throw error;
    }
  }

  /**
   * Get API key usage statistics
   */
  async getAPIKeyUsage(keyUid: string, userId?: number) {
    try {
      const apiKey = await this.apiKeyRepository.findByUid(keyUid);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      if (userId && apiKey.user.id !== userId) {
        throw new Error('You can only access usage statistics for your own API keys');
      }

      return await this.apiKeyRepository.getUsageStats(apiKey.id);

    } catch (error) {
      console.error('Error fetching API key usage:', error);
      throw error;
    }
  }

  /**
   * Bulk operations on API keys
   */
  async bulkAPIKeyOperation(
    keyUids: string[],
    userId: number,
    action: 'activate' | 'deactivate' | 'delete',
    reason?: string
  ): Promise<BulkAPIKeyResult> {
    const result: BulkAPIKeyResult = {
      processed: keyUids.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const keyUid of keyUids) {
      try {
        switch (action) {
          case 'activate':
            await this.updateAPIKey(keyUid, userId, { isActive: true });
            break;
          case 'deactivate':
            await this.revokeAPIKey(keyUid, userId, reason);
            break;
          case 'delete':
            await this.deleteAPIKey(keyUid, userId);
            break;
        }
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          keyUid,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Search API keys by name
   */
  async searchAPIKeys(userId: number, searchTerm: string): Promise<APIKeyResponse[]> {
    try {
      const apiKeys = await this.apiKeyRepository.searchByName(userId, searchTerm);
      return apiKeys.map(key => this.formatAPIKeyResponse(key));

    } catch (error) {
      console.error('Error searching API keys:', error);
      throw new Error('Failed to search API keys');
    }
  }

  /**
   * Cleanup expired keys (admin function)
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      const expiredKeys = await this.apiKeyRepository.getExpiredKeys();
      let cleaned = 0;

      for (const key of expiredKeys) {
        try {
          // Deactivate expired key
          await this.apiKeyRepository.deactivate(key.id);
          
          // Remove from gateway
          await this.gatewayService.updateAPIKeyStatus(
            key.api.uid,
            key.keyValue,
            false
          );
          
          cleaned++;
        } catch (error) {
          console.error(`Failed to cleanup expired key ${key.uid}:`, error);
        }
      }

      console.log(`Cleaned up ${cleaned} expired API keys`);
      return cleaned;

    } catch (error) {
      console.error('Error cleaning up expired keys:', error);
      throw new Error('Failed to cleanup expired keys');
    }
  }

  /**
   * Private helper methods
   */
  private formatAPIKeyResponse(apiKey: APIKeyWithDetails): APIKeyResponse {
    const now = new Date();
    const isExpired = apiKey.expiresAt ? apiKey.expiresAt < now : false;
    const daysUntilExpiry = apiKey.expiresAt ? 
      Math.ceil((apiKey.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) :
      undefined;

    return {
      ...apiKey,
      maskedKey: this.maskAPIKey(apiKey.keyValue),
      isExpired,
      daysUntilExpiry: daysUntilExpiry && daysUntilExpiry > 0 ? daysUntilExpiry : undefined,
    };
  }

  private maskAPIKey(keyValue: string): string {
    if (keyValue.length <= 8) {
      return '*'.repeat(keyValue.length);
    }
    
    const visibleStart = keyValue.substring(0, 4);
    const visibleEnd = keyValue.substring(keyValue.length - 4);
    const maskedMiddle = '*'.repeat(keyValue.length - 8);
    
    return `${visibleStart}${maskedMiddle}${visibleEnd}`;
  }
}