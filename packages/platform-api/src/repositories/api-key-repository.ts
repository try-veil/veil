import { db, apiKeys, apiSubscriptions, apis, users } from '../db';
import { eq, and, desc, sql, gt, lt, isNull, or, like } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export interface CreateAPIKeyData {
  subscriptionId: number;
  name: string;
  description?: string;
  keyValue?: string;
  expiresAt?: Date;
  permissions?: string[];
  isActive?: boolean;
}

export interface UpdateAPIKeyData {
  name?: string;
  description?: string;
  isActive?: boolean;
  expiresAt?: Date | null;
  permissions?: string[];
  lastUsed?: Date;
}

export interface APIKeyWithDetails {
  id: number;
  uid: string;
  subscriptionId: number;
  keyValue: string;
  name: string;
  description: string | null;
  isActive: boolean;
  permissions: string[];
  lastUsed: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  subscription: {
    id: number;
    uid: string;
    userId: number;
    status: string;
    requestsUsed: number;
    requestsLimit: number;
  };
  api: {
    id: number;
    uid: string;
    name: string;
    version: string;
    endpoint: string;
    baseUrl: string;
    isActive: boolean;
  };
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface APIKeyFilters {
  subscriptionId?: number;
  userId?: number;
  isActive?: boolean;
  isExpired?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  lastUsedAfter?: Date;
  lastUsedBefore?: Date;
}

export interface APIKeyUsageStats {
  keyUid: string;
  keyName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastUsed: Date | null;
  usagePercentage: number;
  isOverLimit: boolean;
  rateLimitHits: number;
  averageResponseTime: number;
}

export class APIKeyRepository {
  /**
   * Generate a secure API key
   */
  private generateAPIKey(): string {
    const prefix = 'veil_';
    const keyLength = 32;
    const randomPart = randomBytes(keyLength).toString('base64url');
    return `${prefix}${randomPart}`;
  }

  /**
   * Create a new API key
   */
  async create(data: CreateAPIKeyData) {
    const keyValue = data.keyValue || this.generateAPIKey();
    
    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        subscriptionId: data.subscriptionId,
        keyValue,
        name: data.name,
        description: data.description || null,
        expiresAt: data.expiresAt || null,
        permissions: JSON.stringify(data.permissions || ['read']),
        isActive: data.isActive ?? true,
      })
      .returning();

    return apiKey;
  }

  /**
   * Find API key by ID with full details
   */
  async findById(id: number): Promise<APIKeyWithDetails | null> {
    const result = await db
      .select({
        apiKey: apiKeys,
        subscription: {
          id: apiSubscriptions.id,
          uid: apiSubscriptions.uid,
          userId: apiSubscriptions.userId,
          status: apiSubscriptions.status,
          requestsUsed: apiSubscriptions.requestsUsed,
          requestsLimit: apiSubscriptions.requestsLimit,
        },
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          version: apis.version,
          endpoint: apis.endpoint,
          baseUrl: apis.baseUrl,
          isActive: apis.isActive,
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(apiKeys)
      .leftJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
      .leftJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .leftJoin(users, eq(apiSubscriptions.userId, users.id))
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return {
      ...row.apiKey,
      permissions: JSON.parse(row.apiKey.permissions || '["read"]'),
      subscription: row.subscription,
      api: row.api,
      user: row.user,
    };
  }

  /**
   * Find API key by UID with full details
   */
  async findByUid(uid: string): Promise<APIKeyWithDetails | null> {
    const result = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(eq(apiKeys.uid, uid))
      .limit(1);

    if (result.length === 0) return null;

    return this.findById(result[0].id);
  }

  /**
   * Find API key by key value (for validation)
   */
  async findByKeyValue(keyValue: string) {
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyValue, keyValue))
      .limit(1);

    return apiKey || null;
  }

  /**
   * Get API keys for a subscription
   */
  async findBySubscription(subscriptionId: number): Promise<APIKeyWithDetails[]> {
    const results = await db
      .select({
        apiKey: apiKeys,
        subscription: {
          id: apiSubscriptions.id,
          uid: apiSubscriptions.uid,
          userId: apiSubscriptions.userId,
          status: apiSubscriptions.status,
          requestsUsed: apiSubscriptions.requestsUsed,
          requestsLimit: apiSubscriptions.requestsLimit,
        },
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          version: apis.version,
          endpoint: apis.endpoint,
          baseUrl: apis.baseUrl,
          isActive: apis.isActive,
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(apiKeys)
      .leftJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
      .leftJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .leftJoin(users, eq(apiSubscriptions.userId, users.id))
      .where(eq(apiKeys.subscriptionId, subscriptionId))
      .orderBy(desc(apiKeys.createdAt));

    return results.map(row => ({
      ...row.apiKey,
      permissions: JSON.parse(row.apiKey.permissions || '["read"]'),
      subscription: row.subscription,
      api: row.api,
      user: row.user,
    }));
  }

  /**
   * Get API keys for a user
   */
  async findByUser(
    userId: number,
    filters?: APIKeyFilters
  ): Promise<APIKeyWithDetails[]> {
    let query = db
      .select({
        apiKey: apiKeys,
        subscription: {
          id: apiSubscriptions.id,
          uid: apiSubscriptions.uid,
          userId: apiSubscriptions.userId,
          status: apiSubscriptions.status,
          requestsUsed: apiSubscriptions.requestsUsed,
          requestsLimit: apiSubscriptions.requestsLimit,
        },
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          version: apis.version,
          endpoint: apis.endpoint,
          baseUrl: apis.baseUrl,
          isActive: apis.isActive,
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(apiKeys)
      .leftJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
      .leftJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .leftJoin(users, eq(apiSubscriptions.userId, users.id))
      .where(eq(apiSubscriptions.userId, userId));

    // Apply filters
    if (filters?.subscriptionId) {
      query = query.where(eq(apiKeys.subscriptionId, filters.subscriptionId));
    }

    if (filters?.isActive !== undefined) {
      query = query.where(eq(apiKeys.isActive, filters.isActive));
    }

    if (filters?.isExpired !== undefined) {
      if (filters.isExpired) {
        query = query.where(and(
          eq(apiKeys.expiresAt, sql`NOT NULL`),
          lt(apiKeys.expiresAt, new Date())
        ));
      } else {
        query = query.where(or(
          isNull(apiKeys.expiresAt),
          gt(apiKeys.expiresAt, new Date())
        ));
      }
    }

    if (filters?.createdAfter) {
      query = query.where(gt(apiKeys.createdAt, filters.createdAfter));
    }

    if (filters?.createdBefore) {
      query = query.where(lt(apiKeys.createdAt, filters.createdBefore));
    }

    if (filters?.lastUsedAfter) {
      query = query.where(gt(apiKeys.lastUsed, filters.lastUsedAfter));
    }

    if (filters?.lastUsedBefore) {
      query = query.where(lt(apiKeys.lastUsed, filters.lastUsedBefore));
    }

    const results = await query.orderBy(desc(apiKeys.createdAt));

    return results.map(row => ({
      ...row.apiKey,
      permissions: JSON.parse(row.apiKey.permissions || '["read"]'),
      subscription: row.subscription,
      api: row.api,
      user: row.user,
    }));
  }

  /**
   * Update API key
   */
  async update(id: number, data: UpdateAPIKeyData) {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.permissions) {
      updateData.permissions = JSON.stringify(data.permissions);
    }

    const [apiKey] = await db
      .update(apiKeys)
      .set(updateData)
      .where(eq(apiKeys.id, id))
      .returning();

    return apiKey || null;
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(id: number): Promise<void> {
    await db
      .update(apiKeys)
      .set({
        lastUsed: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id));
  }

  /**
   * Deactivate API key
   */
  async deactivate(id: number) {
    const [apiKey] = await db
      .update(apiKeys)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning();

    return apiKey || null;
  }

  /**
   * Activate API key
   */
  async activate(id: number) {
    const [apiKey] = await db
      .update(apiKeys)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning();

    return apiKey || null;
  }

  /**
   * Regenerate API key value
   */
  async regenerate(id: number): Promise<string> {
    const newKeyValue = this.generateAPIKey();
    
    const [apiKey] = await db
      .update(apiKeys)
      .set({
        keyValue: newKeyValue,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning();

    if (!apiKey) {
      throw new Error('Failed to regenerate API key');
    }

    return newKeyValue;
  }

  /**
   * Delete API key
   */
  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(apiKeys)
      .where(eq(apiKeys.id, id));

    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Check if API key exists
   */
  async exists(id: number): Promise<boolean> {
    const [apiKey] = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    return !!apiKey;
  }

  /**
   * Get expired API keys
   */
  async getExpiredKeys(): Promise<APIKeyWithDetails[]> {
    const results = await db
      .select({
        apiKey: apiKeys,
        subscription: {
          id: apiSubscriptions.id,
          uid: apiSubscriptions.uid,
          userId: apiSubscriptions.userId,
          status: apiSubscriptions.status,
          requestsUsed: apiSubscriptions.requestsUsed,
          requestsLimit: apiSubscriptions.requestsLimit,
        },
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          version: apis.version,
          endpoint: apis.endpoint,
          baseUrl: apis.baseUrl,
          isActive: apis.isActive,
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(apiKeys)
      .leftJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
      .leftJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .leftJoin(users, eq(apiSubscriptions.userId, users.id))
      .where(and(
        eq(apiKeys.isActive, true),
        lt(apiKeys.expiresAt, new Date())
      ));

    return results.map(row => ({
      ...row.apiKey,
      permissions: JSON.parse(row.apiKey.permissions || '["read"]'),
      subscription: row.subscription,
      api: row.api,
      user: row.user,
    }));
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(keyId: number): Promise<APIKeyUsageStats | null> {
    // This would typically query from a usage/analytics table
    // For now, returning mock stats based on subscription data
    const apiKey = await this.findById(keyId);
    if (!apiKey) return null;

    const usagePercentage = (apiKey.subscription.requestsUsed / apiKey.subscription.requestsLimit) * 100;

    return {
      keyUid: apiKey.uid,
      keyName: apiKey.name,
      totalRequests: apiKey.subscription.requestsUsed,
      successfulRequests: Math.floor(apiKey.subscription.requestsUsed * 0.95), // Mock 95% success rate
      failedRequests: Math.floor(apiKey.subscription.requestsUsed * 0.05),
      lastUsed: apiKey.lastUsed,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      isOverLimit: apiKey.subscription.requestsUsed >= apiKey.subscription.requestsLimit,
      rateLimitHits: Math.floor(apiKey.subscription.requestsUsed * 0.02), // Mock 2% rate limit hits
      averageResponseTime: Math.floor(Math.random() * 500) + 100, // Mock response time between 100-600ms
    };
  }

  /**
   * Bulk update API keys
   */
  async bulkUpdate(keyIds: number[], data: Partial<UpdateAPIKeyData>): Promise<number> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.permissions) {
      updateData.permissions = JSON.stringify(data.permissions);
    }

    const result = await db
      .update(apiKeys)
      .set(updateData)
      .where(sql`${apiKeys.id} IN (${keyIds.join(',')})`);

    return result.rowCount || 0;
  }

  /**
   * Search API keys by name
   */
  async searchByName(userId: number, searchTerm: string): Promise<APIKeyWithDetails[]> {
    const results = await db
      .select({
        apiKey: apiKeys,
        subscription: {
          id: apiSubscriptions.id,
          uid: apiSubscriptions.uid,
          userId: apiSubscriptions.userId,
          status: apiSubscriptions.status,
          requestsUsed: apiSubscriptions.requestsUsed,
          requestsLimit: apiSubscriptions.requestsLimit,
        },
        api: {
          id: apis.id,
          uid: apis.uid,
          name: apis.name,
          version: apis.version,
          endpoint: apis.endpoint,
          baseUrl: apis.baseUrl,
          isActive: apis.isActive,
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(apiKeys)
      .leftJoin(apiSubscriptions, eq(apiKeys.subscriptionId, apiSubscriptions.id))
      .leftJoin(apis, eq(apiSubscriptions.apiId, apis.id))
      .leftJoin(users, eq(apiSubscriptions.userId, users.id))
      .where(and(
        eq(apiSubscriptions.userId, userId),
        like(apiKeys.name, `%${searchTerm}%`)
      ))
      .orderBy(desc(apiKeys.createdAt))
      .limit(50);

    return results.map(row => ({
      ...row.apiKey,
      permissions: JSON.parse(row.apiKey.permissions || '["read"]'),
      subscription: row.subscription,
      api: row.api,
      user: row.user,
    }));
  }
}