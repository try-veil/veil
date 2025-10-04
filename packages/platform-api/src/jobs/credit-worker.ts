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
      } else {
        console.warn(`[Credit Worker] Failed to increment usage for subscription ${apiKey.subscriptionId}`);
      }
    } catch (error) {
      console.error('[Credit Worker] Error processing event:', error);
      throw error; // Re-throw to be caught by outer handler
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
