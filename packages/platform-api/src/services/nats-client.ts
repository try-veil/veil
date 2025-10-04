import { connect, NatsConnection, ConnectionOptions } from 'nats';

/**
 * NATS Client Singleton
 * Provides a single connection to NATS server for credit consumption tracking
 */
class NATSClient {
  private static instance: NATSClient;
  private connection: NatsConnection | null = null;
  private isConnecting = false;

  private constructor() {}

  static getInstance(): NATSClient {
    if (!NATSClient.instance) {
      NATSClient.instance = new NATSClient();
    }
    return NATSClient.instance;
  }

  async getConnection(): Promise<NatsConnection | null> {
    // Return existing connection if available
    if (this.connection && !this.connection.isClosed()) {
      return this.connection;
    }

    // Wait if connection is in progress
    if (this.isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.getConnection();
    }

    // Establish new connection
    try {
      this.isConnecting = true;
      const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';

      const options: ConnectionOptions = {
        servers: natsUrl,
        name: 'platform-api-credit-worker',
        maxReconnectAttempts: -1, // Unlimited reconnect attempts
        reconnectTimeWait: 1000, // Wait 1 second between reconnect attempts
      };

      console.log(`[NATS Client] Connecting to ${natsUrl}...`);
      this.connection = await connect(options);

      console.log('[NATS Client] Connected successfully');

      // Setup close handler
      (async () => {
        for await (const status of this.connection!.status()) {
          console.log(`[NATS Client] Status: ${status.type}`);
          if (status.type === 'disconnect' || status.type === 'error') {
            console.error('[NATS Client] Connection lost:', status);
          }
        }
      })();

      return this.connection;
    } catch (error) {
      console.error('[NATS Client] Failed to connect:', error);
      this.connection = null;
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  async close(): Promise<void> {
    if (this.connection && !this.connection.isClosed()) {
      console.log('[NATS Client] Closing connection...');
      await this.connection.drain();
      this.connection = null;
    }
  }

  isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }
}

export const natsClient = NATSClient.getInstance();
