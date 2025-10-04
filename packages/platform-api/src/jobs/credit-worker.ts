import { StringCodec, JsMsg } from 'nats';
import { natsClient } from '../services/nats-client';
import { APIKeyRepository } from '../repositories/api-key-repository';
import { SubscriptionRepository } from '../repositories/subscription-repository';

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
 * Credit Worker
 * Subscribes to credit.events from NATS and processes credit consumption
 */
export class CreditWorker {
  private apiKeyRepo: APIKeyRepository;
  private subscriptionRepo: SubscriptionRepository;
  private isRunning = false;
  private sc = StringCodec();

  constructor() {
    this.apiKeyRepo = new APIKeyRepository();
    this.subscriptionRepo = new SubscriptionRepository();
  }

  /**
   * Start the credit worker
   * Subscribes to credit.events topic and processes incoming events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Credit Worker] Already running');
      return;
    }

    console.log('[Credit Worker] Starting...');

    const connection = await natsClient.getConnection();
    if (!connection) {
      console.error('[Credit Worker] Failed to get NATS connection, worker not started');
      return;
    }

    this.isRunning = true;

    // Subscribe to credit events
    const subscription = connection.subscribe('credit.events');
    console.log('[Credit Worker] Subscribed to credit.events');

    // Process messages asynchronously
    (async () => {
      for await (const msg of subscription) {
        try {
          await this.processEvent(msg);
        } catch (error) {
          console.error('[Credit Worker] Error processing event:', error);
          // Continue processing other events even if one fails
        }
      }
    })().catch((error) => {
      console.error('[Credit Worker] Subscription error:', error);
      this.isRunning = false;
    });

    console.log('[Credit Worker] Started successfully');
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

      console.log(`[Credit Worker] Processing event ${event.id} for key ${event.subscription_key.substring(0, 15)}...`);

      // Find API key by value
      const apiKey = await this.apiKeyRepo.findByKeyValue(event.subscription_key);

      if (!apiKey) {
        console.warn(`[Credit Worker] API key not found: ${event.subscription_key.substring(0, 15)}...`);
        return;
      }

      // Increment subscription usage
      const updated = await this.subscriptionRepo.incrementUsage(apiKey.subscriptionId, 1);

      if (updated) {
        console.log(`[Credit Worker] Incremented usage for subscription ${apiKey.subscriptionId}: ${updated.requestsUsed}/${updated.requestsLimit}`);

        // Check if subscription has reached its limit
        if (updated.requestsUsed >= updated.requestsLimit) {
          console.warn(`[Credit Worker] Subscription ${apiKey.subscriptionId} has reached its limit! Deactivating API key ${apiKey.id}`);

          // Deactivate the API key in platform-api database
          await this.apiKeyRepo.deactivate(apiKey.id);

          // Publish event to sync inactive status to Caddy
          await this.publishKeySyncEvent(apiKey.keyValue, false);
        }
      } else {
        console.warn(`[Credit Worker] Failed to increment usage for subscription ${apiKey.subscriptionId}`);
      }
    } catch (error) {
      console.error('[Credit Worker] Error processing event:', error);
      throw error; // Re-throw to be caught by outer handler
    }
  }

  /**
   * Publish key sync event to update Caddy's database
   * @param keyValue - The API key value
   * @param isActive - Whether the key should be active
   */
  private async publishKeySyncEvent(keyValue: string, isActive: boolean): Promise<void> {
    try {
      const connection = await natsClient.getConnection();
      if (!connection) {
        console.error('[Credit Worker] Cannot publish sync event - no NATS connection');
        return;
      }

      const syncEvent = {
        key_value: keyValue,
        is_active: isActive,
        timestamp: new Date().toISOString(),
        reason: isActive ? 'reactivated' : 'exhausted_quota',
      };

      const eventJSON = JSON.stringify(syncEvent);
      await connection.publish('key.sync', this.sc.encode(eventJSON));

      console.log(`[Credit Worker] Published key sync event for key ${keyValue.substring(0, 15)}... (active: ${isActive})`);
    } catch (error) {
      console.error('[Credit Worker] Error publishing key sync event:', error);
    }
  }

  /**
   * Stop the credit worker
   */
  async stop(): Promise<void> {
    console.log('[Credit Worker] Stopping...');
    this.isRunning = false;
    // The subscription will naturally stop when the connection is closed
    console.log('[Credit Worker] Stopped');
  }

  /**
   * Check if worker is running
   */
  get running(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const creditWorker = new CreditWorker();
