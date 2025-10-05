import { Elysia, t } from 'elysia';
import { WebhookRepository } from '../repositories/webhook-repository';
import { PaymentRepository } from '../repositories/payment-repository';
import { RazorpayProvider } from '../services/providers/razorpay-provider';
import { creditPurchaseService } from '../services/credit-purchase-service';

const webhookRepository = new WebhookRepository();
const paymentRepository = new PaymentRepository();
const razorpayProvider = new RazorpayProvider();

export const webhookRoutes = new Elysia({ prefix: '/webhooks' })
  .post(
    '/razorpay',
    async ({ body, headers, set }) => {
      try {
        const signature = headers['x-razorpay-signature'];
        if (!signature) {
          set.status = 400;
          return { success: false, message: 'Missing webhook signature' };
        }

        // Parse webhook payload
        const payload = typeof body === 'string' ? JSON.parse(body) : body;
        const rawPayload = typeof body === 'string' ? body : JSON.stringify(body);

        // Validate webhook signature
        const isValid = razorpayProvider.validateWebhook(rawPayload, signature);

        // Extract event details
        const eventId = payload.event || payload.id || `evt_${Date.now()}`;
        const eventType = payload.event;

        // Check if webhook already processed
        const existing = await webhookRepository.findByEventId(eventId);
        if (existing) {
          console.log(`Webhook already processed: ${eventId}`);
          return { success: true, message: 'Webhook already processed' };
        }

        // Save webhook event
        const webhook = await webhookRepository.create({
          provider: 'razorpay',
          eventId,
          eventType,
          payload,
          rawPayload,
          signatureValid: isValid,
        });

        // Process webhook if signature is valid
        if (isValid) {
          await processRazorpayWebhook(webhook.id, payload);
          await webhookRepository.markProcessed(webhook.id);
        } else {
          console.error('Invalid webhook signature');
          await webhookRepository.markFailed(webhook.id, 'Invalid signature');
        }

        return { success: true };
      } catch (error) {
        console.error('Webhook processing error:', error);
        set.status = 500;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Webhook processing failed',
        };
      }
    },
    {
      type: 'json',
      detail: {
        tags: ['Webhooks'],
        summary: 'Razorpay webhook handler',
        description: 'Handle webhook events from Razorpay',
      },
    }
  );

/**
 * Process Razorpay webhook events
 */
async function processRazorpayWebhook(webhookId: number, payload: any) {
  const eventType = payload.event;
  const entity = payload.payload?.payment?.entity || payload.payload?.order?.entity;

  if (!entity) {
    console.error('No entity found in webhook payload');
    return;
  }

  console.log(`Processing Razorpay webhook: ${eventType}`);

  switch (eventType) {
    case 'payment.authorized':
    case 'payment.captured':
      await handlePaymentSuccess(entity);
      break;

    case 'payment.failed':
      await handlePaymentFailure(entity);
      break;

    case 'order.paid':
      await handleOrderPaid(entity);
      break;

    default:
      console.log(`Unhandled event type: ${eventType}`);
  }
}

async function handlePaymentSuccess(entity: any) {
  const paymentId = entity.id;
  const orderId = entity.order_id;

  // Find payment by order ID or payment ID
  let payment = await paymentRepository.findByProviderOrderId(orderId);

  if (!payment) {
    payment = await paymentRepository.findByProviderTransactionId(paymentId);
  }

  if (!payment) {
    console.error(`Payment not found for Razorpay ID: ${paymentId}`);
    return;
  }

  if (payment.status === 'completed') {
    console.log(`Payment already completed: ${payment.uid}`);
    return;
  }

  // Update payment status
  await paymentRepository.markCompleted(payment.id, paymentId);

  console.log(`✅ Payment completed via webhook: ${payment.uid}`);

  // Check if this payment is for a credit purchase
  const metadata = payment.metadata as any;
  if (metadata?.purchaseUid) {
    try {
      await creditPurchaseService.completePurchase(metadata.purchaseUid, payment.uid);
      console.log(`💳 Credits added for purchase: ${metadata.purchaseUid}`);
    } catch (error) {
      console.error(`Failed to complete credit purchase ${metadata.purchaseUid}:`, error);
      // Don't fail the webhook - payment is still successful
    }
  }
}

async function handlePaymentFailure(entity: any) {
  const paymentId = entity.id;
  const orderId = entity.order_id;
  const errorDescription = entity.error_description || 'Payment failed';

  let payment = await paymentRepository.findByProviderOrderId(orderId);

  if (!payment) {
    payment = await paymentRepository.findByProviderTransactionId(paymentId);
  }

  if (!payment) {
    console.error(`Payment not found for Razorpay ID: ${paymentId}`);
    return;
  }

  await paymentRepository.markFailed(payment.id, errorDescription, entity.error_code);

  console.log(`❌ Payment failed via webhook: ${payment.uid}`);

  // Mark credit purchase as failed if applicable
  const metadata = payment.metadata as any;
  if (metadata?.purchaseUid) {
    try {
      await creditPurchaseService.failPurchase(metadata.purchaseUid, errorDescription);
      console.log(`❌ Credit purchase marked as failed: ${metadata.purchaseUid}`);
    } catch (error) {
      console.error(`Failed to mark credit purchase as failed ${metadata.purchaseUid}:`, error);
    }
  }
}

async function handleOrderPaid(entity: any) {
  const orderId = entity.id;

  const payment = await paymentRepository.findByProviderOrderId(orderId);

  if (!payment) {
    console.error(`Payment not found for order ID: ${orderId}`);
    return;
  }

  if (payment.status === 'completed') {
    console.log(`Order already marked as paid: ${payment.uid}`);
    return;
  }

  // Note: Order paid event doesn't have payment ID yet
  // We'll update it when we receive payment.captured event
  await paymentRepository.update(payment.id, {
    status: 'processing',
    webhookReceived: true,
    webhookProcessedAt: new Date(),
  });

  console.log(`💰 Order paid via webhook: ${payment.uid}`);
}
