import { eq, desc, and, sql } from 'drizzle-orm';
import { db, webhookEvents } from '../db';
import { CreateWebhookEventData } from '../types';

export class WebhookRepository {
  /**
   * Create a new webhook event
   */
  async create(data: CreateWebhookEventData) {
    const [webhook] = await db.insert(webhookEvents).values({
      provider: data.provider,
      eventId: data.eventId,
      eventType: data.eventType,
      payload: data.payload,
      rawPayload: data.rawPayload,
      signatureValid: data.signatureValid,
      processed: false,
    }).returning();

    return webhook;
  }

  /**
   * Find webhook by event ID (to prevent duplicate processing)
   */
  async findByEventId(eventId: string) {
    const [webhook] = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.eventId, eventId));

    return webhook;
  }

  /**
   * Find webhook by UID
   */
  async findByUid(uid: string) {
    const [webhook] = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.uid, uid));

    return webhook;
  }

  /**
   * Mark webhook as processed
   */
  async markProcessed(id: number) {
    const [updated] = await db
      .update(webhookEvents)
      .set({
        processed: true,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(webhookEvents.id, id))
      .returning();

    return updated;
  }

  /**
   * Mark webhook as failed
   */
  async markFailed(id: number, error: string) {
    const [updated] = await db
      .update(webhookEvents)
      .set({
        processingError: error,
        retryCount: sql`${webhookEvents.retryCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(webhookEvents.id, id))
      .returning();

    return updated;
  }

  /**
   * Get unprocessed webhooks
   */
  async getUnprocessed(limit = 50) {
    const webhooks = await db
      .select()
      .from(webhookEvents)
      .where(
        and(
          eq(webhookEvents.processed, false),
          eq(webhookEvents.signatureValid, true)
        )
      )
      .orderBy(desc(webhookEvents.createdAt))
      .limit(limit);

    return webhooks;
  }

  /**
   * Get webhooks by provider
   */
  async findByProvider(provider: string, limit = 50) {
    const webhooks = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.provider, provider))
      .orderBy(desc(webhookEvents.createdAt))
      .limit(limit);

    return webhooks;
  }

  /**
   * Get failed webhooks for retry
   */
  async getFailedForRetry(maxRetries = 5, limit = 50) {
    const webhooks = await db
      .select()
      .from(webhookEvents)
      .where(
        and(
          eq(webhookEvents.processed, false),
          eq(webhookEvents.signatureValid, true),
          sql`${webhookEvents.retryCount} < ${maxRetries}`
        )
      )
      .orderBy(desc(webhookEvents.createdAt))
      .limit(limit);

    return webhooks;
  }
}
