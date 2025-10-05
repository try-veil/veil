import { Elysia } from 'elysia';

/**
 * Middleware to extract and validate API keys for proxy requests
 *
 * API keys can be provided via:
 * - X-API-Key header
 * - api_key query parameter
 *
 * TODO: Integrate with platform-api to validate keys or create local api_keys table
 */
export const apiKeyAuth = new Elysia()
  .resolve(async ({ headers, query, set }) => {
    // Extract API key from header or query
    const apiKey =
      headers['x-api-key'] ||
      (query as any).api_key;

    if (!apiKey) {
      set.status = 401;
      throw new Error('Missing API key. Provide via X-API-Key header or api_key query parameter');
    }

    // TODO: Validate API key against database
    // For now, we'll use a mock validation
    // In production, this should query the platform-api or local api_keys table

    // Mock API key format: sk_live_userid_keyid
    // Example: sk_live_1_abc123
    const keyParts = (apiKey as string).split('_');
    if (keyParts.length < 4 || keyParts[0] !== 'sk' || (keyParts[1] !== 'live' && keyParts[1] !== 'test')) {
      set.status = 401;
      throw new Error('Invalid API key format');
    }

    // Extract user ID from key (mock)
    const userId = parseInt(keyParts[2]);

    if (isNaN(userId)) {
      set.status = 401;
      throw new Error('Invalid API key');
    }

    // TODO: Look up actual subscription and API key details from database
    return {
      apiKey: apiKey as string,
      userId,
      subscriptionId: undefined as number | undefined, // TODO: Load from database
      apiKeyId: undefined as number | undefined, // TODO: Load from database
    };
  });

/**
 * Mock function to validate API key
 * TODO: Replace with real database lookup
 */
async function validateApiKey(apiKey: string): Promise<{
  isValid: boolean;
  userId?: number;
  subscriptionId?: number;
  apiKeyId?: number;
}> {
  // This is a placeholder
  // In production, query the database to:
  // 1. Check if key exists
  // 2. Check if key is active
  // 3. Check if subscription is active
  // 4. Get user ID and subscription ID

  return {
    isValid: false,
    userId: undefined,
    subscriptionId: undefined,
    apiKeyId: undefined,
  };
}
