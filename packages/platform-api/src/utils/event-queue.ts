/**
 * Event Queue with Retry Mechanism
 *
 * Provides reliable event processing with:
 * - Automatic retries with exponential backoff
 * - Dead letter queue for failed events
 * - Event persistence
 * - Priority queuing
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface QueuedEvent {
  id: number;
  type: string;
  payload: any;
  priority: 'high' | 'normal' | 'low';
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
}

export interface EventHandler<T = any> {
  type: string;
  handler: (payload: T) => Promise<void>;
  maxAttempts?: number;
  retryDelayMs?: number;
  priority?: 'high' | 'normal' | 'low';
}

export interface EnqueueOptions {
  priority?: 'high' | 'normal' | 'low';
  maxAttempts?: number;
  delayMs?: number;
}

export class EventQueue {
  private handlers: Map<string, EventHandler> = new Map();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;

  constructor(pollIntervalMs: number = 1000) {
    this.pollIntervalMs = pollIntervalMs;
  }

  /**
   * Register an event handler
   */
  registerHandler<T = any>(handler: EventHandler<T>): void {
    this.handlers.set(handler.type, handler);
    console.log(`[EventQueue] Registered handler for event type: ${handler.type}`);
  }

  /**
   * Enqueue an event for processing
   */
  async enqueue(type: string, payload: any, options: EnqueueOptions = {}): Promise<number> {
    const handler = this.handlers.get(type);
    const maxAttempts = options.maxAttempts ?? handler?.maxAttempts ?? 5;
    const priority = options.priority ?? handler?.priority ?? 'normal';
    const delayMs = options.delayMs ?? 0;

    const nextRetryAt = delayMs > 0 ? new Date(Date.now() + delayMs) : new Date();

    const [result] = await db.execute(sql`
      INSERT INTO event_queue (type, payload, priority, max_attempts, next_retry_at, status)
      VALUES (
        ${type},
        ${JSON.stringify(payload)},
        ${priority},
        ${maxAttempts},
        ${nextRetryAt.toISOString()},
        'pending'
      )
      RETURNING id
    `);

    const eventId = (result as any).id;
    console.log(`[EventQueue] Enqueued event ${eventId} (type: ${type}, priority: ${priority})`);

    return eventId;
  }

  /**
   * Start processing events
   */
  start(): void {
    if (this.isProcessing) {
      console.log('[EventQueue] Already processing events');
      return;
    }

    this.isProcessing = true;
    console.log(`[EventQueue] Started processing (poll interval: ${this.pollIntervalMs}ms)`);

    this.processingInterval = setInterval(async () => {
      await this.processNextBatch();
    }, this.pollIntervalMs);
  }

  /**
   * Stop processing events
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    console.log('[EventQueue] Stopped processing');
  }

  /**
   * Process next batch of events
   */
  private async processNextBatch(): Promise<void> {
    try {
      // Get pending events that are ready to process (priority order)
      const events = await db.execute<QueuedEvent>(sql`
        SELECT *
        FROM event_queue
        WHERE status = 'pending'
          AND next_retry_at <= NOW()
        ORDER BY
          CASE priority
            WHEN 'high' THEN 1
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 3
          END,
          created_at ASC
        LIMIT 10
        FOR UPDATE SKIP LOCKED
      `);

      if (!events || events.length === 0) {
        return;
      }

      console.log(`[EventQueue] Processing batch of ${events.length} events`);

      // Process each event
      await Promise.all(
        events.map((event) => this.processEvent(event))
      );
    } catch (error) {
      console.error('[EventQueue] Error processing batch:', error);
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: QueuedEvent): Promise<void> {
    const handler = this.handlers.get(event.type);

    if (!handler) {
      console.error(`[EventQueue] No handler registered for event type: ${event.type}`);
      await this.markAsFailed(event.id, 'No handler registered');
      return;
    }

    // Mark as processing
    await db.execute(sql`
      UPDATE event_queue
      SET status = 'processing',
          updated_at = NOW()
      WHERE id = ${event.id}
    `);

    try {
      console.log(`[EventQueue] Processing event ${event.id} (type: ${event.type}, attempt ${event.attempts + 1}/${event.maxAttempts})`);

      // Execute handler
      await handler.handler(event.payload);

      // Mark as completed
      await db.execute(sql`
        UPDATE event_queue
        SET status = 'completed',
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${event.id}
      `);

      console.log(`[EventQueue] ✓ Event ${event.id} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[EventQueue] ✗ Event ${event.id} failed:`, errorMessage);

      // Increment attempts
      const newAttempts = event.attempts + 1;

      if (newAttempts >= event.maxAttempts) {
        // Move to dead letter queue
        await this.moveToDeadLetter(event.id, errorMessage);
      } else {
        // Schedule retry with exponential backoff
        await this.scheduleRetry(event.id, newAttempts, errorMessage, handler.retryDelayMs ?? 1000);
      }
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(
    eventId: number,
    attempts: number,
    error: string,
    baseDelayMs: number
  ): Promise<void> {
    // Exponential backoff: baseDelay * 2^(attempts - 1)
    const delayMs = baseDelayMs * Math.pow(2, attempts - 1);
    const nextRetryAt = new Date(Date.now() + delayMs);

    await db.execute(sql`
      UPDATE event_queue
      SET status = 'pending',
          attempts = ${attempts},
          next_retry_at = ${nextRetryAt.toISOString()},
          error = ${error},
          updated_at = NOW()
      WHERE id = ${eventId}
    `);

    console.log(`[EventQueue] Event ${eventId} scheduled for retry in ${delayMs}ms (attempt ${attempts})`);
  }

  /**
   * Move event to dead letter queue
   */
  private async moveToDeadLetter(eventId: number, error: string): Promise<void> {
    await db.execute(sql`
      UPDATE event_queue
      SET status = 'dead_letter',
          error = ${error},
          updated_at = NOW()
      WHERE id = ${eventId}
    `);

    console.error(`[EventQueue] Event ${eventId} moved to dead letter queue after max retries`);
  }

  /**
   * Mark event as failed
   */
  private async markAsFailed(eventId: number, error: string): Promise<void> {
    await db.execute(sql`
      UPDATE event_queue
      SET status = 'failed',
          error = ${error},
          updated_at = NOW()
      WHERE id = ${eventId}
    `);
  }

  /**
   * Get dead letter events for manual review
   */
  async getDeadLetterEvents(limit: number = 100): Promise<QueuedEvent[]> {
    const events = await db.execute<QueuedEvent>(sql`
      SELECT *
      FROM event_queue
      WHERE status = 'dead_letter'
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `);

    return events || [];
  }

  /**
   * Retry a dead letter event
   */
  async retryDeadLetterEvent(eventId: number): Promise<void> {
    await db.execute(sql`
      UPDATE event_queue
      SET status = 'pending',
          attempts = 0,
          next_retry_at = NOW(),
          error = NULL,
          updated_at = NOW()
      WHERE id = ${eventId}
        AND status = 'dead_letter'
    `);

    console.log(`[EventQueue] Dead letter event ${eventId} queued for retry`);
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
  }> {
    const [result] = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'dead_letter') as dead_letter
      FROM event_queue
    `);

    return {
      pending: Number((result as any).pending || 0),
      processing: Number((result as any).processing || 0),
      completed: Number((result as any).completed || 0),
      failed: Number((result as any).failed || 0),
      deadLetter: Number((result as any).dead_letter || 0),
    };
  }

  /**
   * Clean up old completed events
   */
  async cleanup(olderThanDays: number = 7): Promise<number> {
    const [result] = await db.execute(sql`
      DELETE FROM event_queue
      WHERE status = 'completed'
        AND processed_at < NOW() - INTERVAL '${olderThanDays} days'
    `);

    const deletedCount = (result as any).rowCount || 0;
    console.log(`[EventQueue] Cleaned up ${deletedCount} old completed events`);

    return deletedCount;
  }
}

// Global event queue instance
export const eventQueue = new EventQueue();
