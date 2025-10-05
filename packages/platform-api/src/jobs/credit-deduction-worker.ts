import { StringCodec, JsMsg } from 'nats';
import { natsClient } from '../services/nats-client';
import { APIKeyRepository } from '../repositories/api-key-repository';
import { SubscriptionRepository } from '../repositories/subscription-repository';
import { walletService } from '../services/wallet-service';
import { db } from '../db';
import { apiSubscriptions } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * UsageEvent structure from Caddy proxy
 * This matches the event structure published by the Caddy veil_handler
 */
interface UsageEvent {
  id: string;
  api_path: string;
  subscription_key: string;
  method: string;
  response_time_ms: number;
  status_code: number;
  success: boolean;
  timestamp: string;
  request_size: number;
  response_size: number;
}

/**
 * Credit Deduction Worker
 * Subscribes to credit.events from NATS and deducts credits from user wallets
 */
export class CreditDeductionWorker {
  private apiKeyRepo: APIKeyRepository;
  private subscriptionRepo: SubscriptionRepository;
  private isRunning = false;
  private sc = StringCodec();

  // Credit pricing configuration
  private readonly CREDIT_PER_REQUEST = 1; // 1 credit per API request (configurable)
  private readonly MIN_BALANCE_THRESHOLD = 0; // Minimum balance before deactivation

  constructor() {
    this.apiKeyRepo = new APIKeyRepository();
    this.subscriptionRepo = new SubscriptionRepository();
  }

  /**
   * Start the credit deduction worker
   * Subscribes to credit.events topic and processes incoming events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Credit Deduction Worker] Already running');
      return;
    }

    console.log('[Credit Deduction Worker] Starting...');

    const connection = await natsClient.getConnection();
    if (!connection) {
      console.error('[Credit Deduction Worker] Failed to get NATS connection, worker not started');
      return;
    }

    this.isRunning = true;

    // Subscribe to credit events
    const subscription = connection.subscribe('credit.events');
    console.log('[Credit Deduction Worker] Subscribed to credit.events');

    // Process messages asynchronously
    (async () => {
      for await (const msg of subscription) {
        try {
          await this.processEvent(msg);
        } catch (error) {
          console.error('[Credit Deduction Worker] Error processing event:', error);
          // Continue processing other events even if one fails
        }
      }
    })().catch((error) => {
      console.error('[Credit Deduction Worker] Subscription error:', error);
      this.isRunning = false;
    });

    console.log('[Credit Deduction Worker] Started successfully');
  }

  /**
   * Process a single usage event
   * @param msg - NATS message containing the usage event
   */
  private async processEvent(msg: JsMsg | any): Promise<void> {
    try {
      // Decode message data
      const data = this.sc.decode(msg.data);
      const event: UsageEvent = JSON.parse(data);

      console.log(`[Credit Deduction Worker] Processing event ${event.id} for key ${event.subscription_key.substring(0, 15)}...`);

      // Find API key by value
      const apiKey = await this.apiKeyRepo.findByKeyValue(event.subscription_key);

      if (!apiKey) {
        console.warn(`[Credit Deduction Worker] API key not found: ${event.subscription_key.substring(0, 15)}...`);
        return;
      }

      // Get subscription details
      const subscription = await this.subscriptionRepo.findById(apiKey.subscriptionId);
      if (!subscription) {
        console.warn(`[Credit Deduction Worker] Subscription not found: ${apiKey.subscriptionId}`);
        return;
      }

      // Get user ID from subscription
      const userId = subscription.userId;

      // Get or create user wallet
      const wallet = await walletService.getOrCreateWallet(userId);
      if (!wallet) {
        console.error(`[Credit Deduction Worker] Failed to get wallet for user ${userId}`);
        return;
      }

      // Check if user has sufficient credits
      const availableBalance = parseFloat(wallet.availableBalance);
      const creditsRequired = this.calculateCreditsRequired(event);

      if (availableBalance < creditsRequired) {
        console.warn(
          `[Credit Deduction Worker] Insufficient credits for user ${userId}. ` +
          `Required: ${creditsRequired}, Available: ${availableBalance}`
        );

        // Deactivate API key due to insufficient credits
        await this.deactivateApiKey(apiKey.id, apiKey.keyValue, 'insufficient_credits');
        return;
      }

      // Deduct credits from wallet
      try {
        await walletService.deductCredits({
          userId,
          amount: creditsRequired.toString(),
          description: `API request: ${event.method} ${event.api_path}`,
          referenceType: 'api_usage',
          referenceId: event.id,
          metadata: {
            apiKeyId: apiKey.id,
            subscriptionId: subscription.id,
            apiPath: event.api_path,
            method: event.method,
            statusCode: event.status_code,
            responseTimeMs: event.response_time_ms,
          },
        });

        console.log(
          `[Credit Deduction Worker] Deducted ${creditsRequired} credits from user ${userId}. ` +
          `New balance: ${parseFloat(wallet.balance) - creditsRequired}`
        );

        // Also increment subscription usage for tracking purposes
        await this.subscriptionRepo.incrementUsage(apiKey.subscriptionId, 1);

        // Check if balance is below threshold after deduction
        const newBalance = parseFloat(wallet.balance) - creditsRequired;
        if (newBalance <= this.MIN_BALANCE_THRESHOLD) {
          console.warn(
            `[Credit Deduction Worker] User ${userId} balance depleted (${newBalance}). ` +
            `Deactivating API key ${apiKey.id}`
          );
          await this.deactivateApiKey(apiKey.id, apiKey.keyValue, 'balance_depleted');
        } else if (newBalance < 10) {
          // Low balance warning (could trigger notification)
          console.warn(`[Credit Deduction Worker] Low balance warning for user ${userId}: ${newBalance} credits remaining`);
        }

      } catch (error) {
        console.error(`[Credit Deduction Worker] Failed to deduct credits for user ${userId}:`, error);
        // Don't deactivate key on error - allow retry
      }

    } catch (error) {
      console.error('[Credit Deduction Worker] Error processing event:', error);
      throw error; // Re-throw to be caught by outer handler
    }
  }

  /**
   * Calculate credits required for an API request
   * Can be extended to support different pricing based on:
   * - API endpoint
   * - HTTP method
   * - Response size
   * - Response time
   * @param event - Usage event
   * @returns Number of credits required
   */
  private calculateCreditsRequired(event: UsageEvent): number {
    // Base credits per request
    let credits = this.CREDIT_PER_REQUEST;

    // Example: Add premium pricing for certain endpoints
    // if (event.api_path.includes('/premium')) {
    //   credits *= 2;
    // }

    // Example: Failed requests cost less
    // if (!event.success || event.status_code >= 400) {
    //   credits *= 0.5;
    // }

    // Example: Data transfer pricing
    // const dataGB = (event.request_size + event.response_size) / (1024 * 1024 * 1024);
    // if (dataGB > 0.001) { // More than 1MB
    //   credits += Math.ceil(dataGB * 10); // 10 credits per GB
    // }

    return credits;
  }

  /**
   * Deactivate API key in platform-api database and sync to Caddy
   * @param apiKeyId - API key ID
   * @param keyValue - API key value
   * @param reason - Reason for deactivation
   */
  private async deactivateApiKey(apiKeyId: number, keyValue: string, reason: string): Promise<void> {
    try {
      // Deactivate the API key in platform-api database
      await this.apiKeyRepo.deactivate(apiKeyId);

      // Publish event to sync inactive status to Caddy
      await this.publishKeySyncEvent(keyValue, false, reason);

      console.log(`[Credit Deduction Worker] Deactivated API key ${apiKeyId} - Reason: ${reason}`);
    } catch (error) {
      console.error('[Credit Deduction Worker] Error deactivating API key:', error);
    }
  }

  /**
   * Publish key sync event to update Caddy's database
   * @param keyValue - The API key value
   * @param isActive - Whether the key should be active
   * @param reason - Reason for the change
   */
  private async publishKeySyncEvent(keyValue: string, isActive: boolean, reason: string): Promise<void> {
    try {
      const connection = await natsClient.getConnection();
      if (!connection) {
        console.error('[Credit Deduction Worker] Cannot publish sync event - no NATS connection');
        return;
      }

      const syncEvent = {
        key_value: keyValue,
        is_active: isActive,
        timestamp: new Date().toISOString(),
        reason,
      };

      const eventJSON = JSON.stringify(syncEvent);
      await connection.publish('key.sync', this.sc.encode(eventJSON));

      console.log(
        `[Credit Deduction Worker] Published key sync event for key ${keyValue.substring(0, 15)}... ` +
        `(active: ${isActive}, reason: ${reason})`
      );
    } catch (error) {
      console.error('[Credit Deduction Worker] Error publishing key sync event:', error);
    }
  }

  /**
   * Stop the credit deduction worker
   */
  async stop(): Promise<void> {
    console.log('[Credit Deduction Worker] Stopping...');
    this.isRunning = false;
    // The subscription will naturally stop when the connection is closed
    console.log('[Credit Deduction Worker] Stopped');
  }

  /**
   * Check if worker is running
   */
  get running(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const creditDeductionWorker = new CreditDeductionWorker();
