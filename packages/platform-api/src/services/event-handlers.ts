/**
 * Event handlers for the event queue
 *
 * Register all event handlers that process queued events
 */

import { eventQueue, EventHandler } from '../utils/event-queue';
import { usageTrackingService, UsageEvent } from './usage-tracking-service';

// Placeholder services until they are implemented
const paymentService = {
  async processPayment(invoiceId: number, amount: number, currency: string, paymentMethod: string) {
    console.log(`[Payment] Processing payment for invoice ${invoiceId}: ${amount} ${currency}`);
  },
  async generateInvoice(subscriptionId: number, billingPeriodId: number) {
    console.log(`[Payment] Generating invoice for subscription ${subscriptionId}, billing period ${billingPeriodId}`);
  }
};

const notificationService = {
  async sendSubscriptionConfirmation(email: string, apiName: string, subscriptionKey: string) {
    console.log(`[Notification] Sending subscription confirmation to ${email} for API ${apiName}`);
  },
  async sendQuotaWarning(email: string, apiName: string, usagePercentage: number, remainingRequests: number) {
    console.log(`[Notification] Sending quota warning to ${email} for API ${apiName} (${usagePercentage}% used)`);
  }
};

/**
 * Usage Tracking Event Handler
 * Processes usage events with automatic retries
 */
const usageTrackingHandler: EventHandler<UsageEvent> = {
  type: 'usage_tracking',
  maxAttempts: 5,
  retryDelayMs: 2000, // Start with 2 second delay
  priority: 'high',
  handler: async (payload: UsageEvent) => {
    console.log(`[EventHandler] Processing usage tracking event for subscription ${payload.subscriptionId}`);

    await usageTrackingService.updateBillingPeriodUsage(payload.subscriptionId, {
      requests: payload.requests,
      successfulRequests: payload.successfulRequests,
      failedRequests: payload.failedRequests,
      dataTransferredBytes: payload.dataTransferredBytes
    });

    console.log(`[EventHandler] ✓ Usage tracking event processed successfully`);
  }
};

/**
 * Subscription Created Event Handler
 * Handles post-subscription creation tasks (email, gateway sync, etc.)
 */
const subscriptionCreatedHandler: EventHandler = {
  type: 'subscription_created',
  maxAttempts: 3,
  retryDelayMs: 3000,
  priority: 'high',
  handler: async (payload: any) => {
    console.log(`[EventHandler] Processing subscription created event for subscription ${payload.subscriptionId}`);

    // Send welcome email
    if (payload.userEmail) {
      await notificationService.sendSubscriptionConfirmation(
        payload.userEmail,
        payload.apiName,
        payload.subscriptionKey
      );
    }

    // Any other post-subscription tasks
    console.log(`[EventHandler] ✓ Subscription created event processed successfully`);
  }
};

/**
 * Payment Processing Event Handler
 * Handles asynchronous payment processing
 */
const paymentProcessingHandler: EventHandler = {
  type: 'payment_processing',
  maxAttempts: 5,
  retryDelayMs: 5000, // Longer delay for payment processing
  priority: 'high',
  handler: async (payload: any) => {
    console.log(`[EventHandler] Processing payment for invoice ${payload.invoiceId}`);

    await paymentService.processPayment(
      payload.invoiceId,
      payload.amount,
      payload.currency,
      payload.paymentMethod
    );

    console.log(`[EventHandler] ✓ Payment processed successfully`);
  }
};

/**
 * Invoice Generation Event Handler
 * Handles asynchronous invoice generation
 */
const invoiceGenerationHandler: EventHandler = {
  type: 'invoice_generation',
  maxAttempts: 3,
  retryDelayMs: 2000,
  priority: 'normal',
  handler: async (payload: any) => {
    console.log(`[EventHandler] Generating invoice for subscription ${payload.subscriptionId}`);

    await paymentService.generateInvoice(
      payload.subscriptionId,
      payload.billingPeriodId
    );

    console.log(`[EventHandler] ✓ Invoice generated successfully`);
  }
};

/**
 * Quota Warning Event Handler
 * Sends notifications when users approach quota limits
 */
const quotaWarningHandler: EventHandler = {
  type: 'quota_warning',
  maxAttempts: 3,
  retryDelayMs: 1000,
  priority: 'normal',
  handler: async (payload: any) => {
    console.log(`[EventHandler] Sending quota warning for subscription ${payload.subscriptionId}`);

    await notificationService.sendQuotaWarning(
      payload.userEmail,
      payload.apiName,
      payload.usagePercentage,
      payload.remainingRequests
    );

    console.log(`[EventHandler] ✓ Quota warning sent successfully`);
  }
};

/**
 * API Sync Event Handler
 * Syncs API configuration with gateway
 */
const apiSyncHandler: EventHandler = {
  type: 'api_sync',
  maxAttempts: 5,
  retryDelayMs: 3000,
  priority: 'high',
  handler: async (payload: any) => {
    console.log(`[EventHandler] Syncing API ${payload.apiUid} with gateway`);

    // Gateway sync logic here
    // await gatewayService.syncAPI(payload.apiUid, payload.config);

    console.log(`[EventHandler] ✓ API synced successfully`);
  }
};

/**
 * Webhook Delivery Event Handler
 * Delivers webhooks to external systems
 */
const webhookDeliveryHandler: EventHandler = {
  type: 'webhook_delivery',
  maxAttempts: 5,
  retryDelayMs: 5000,
  priority: 'low',
  handler: async (payload: any) => {
    console.log(`[EventHandler] Delivering webhook to ${payload.url}`);

    const response = await fetch(payload.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': payload.signature
      },
      body: JSON.stringify(payload.data)
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed with status ${response.status}`);
    }

    console.log(`[EventHandler] ✓ Webhook delivered successfully`);
  }
};

/**
 * Register all event handlers
 */
export function registerEventHandlers(): void {
  console.log('[EventHandlers] Registering event handlers...');

  eventQueue.registerHandler(usageTrackingHandler);
  eventQueue.registerHandler(subscriptionCreatedHandler);
  eventQueue.registerHandler(paymentProcessingHandler);
  eventQueue.registerHandler(invoiceGenerationHandler);
  eventQueue.registerHandler(quotaWarningHandler);
  eventQueue.registerHandler(apiSyncHandler);
  eventQueue.registerHandler(webhookDeliveryHandler);

  console.log('[EventHandlers] ✓ All event handlers registered');
}

/**
 * Start the event queue processor
 */
export function startEventQueue(): void {
  console.log('[EventQueue] Starting event queue processor...');

  registerEventHandlers();
  eventQueue.start();

  console.log('[EventQueue] ✓ Event queue processor started');
}

/**
 * Stop the event queue processor
 */
export function stopEventQueue(): void {
  console.log('[EventQueue] Stopping event queue processor...');
  eventQueue.stop();
  console.log('[EventQueue] ✓ Event queue processor stopped');
}
