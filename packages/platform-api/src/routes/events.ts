import { Elysia, t } from "elysia";
import { eventQueue } from "../utils/event-queue";

/**
 * Event Queue Management Routes
 * Admin endpoints for monitoring and managing the event queue
 */
export const eventRoutes = new Elysia({ prefix: "/events" })
  /**
   * Get event queue statistics
   */
  .get("/stats", async ({ set }) => {
    try {
      const stats = await eventQueue.getStats();

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to get queue stats"
      };
    }
  }, {
    detail: {
      tags: ['Events'],
      summary: 'Get event queue statistics',
      description: 'Returns statistics about the event queue including pending, processing, completed, failed, and dead letter counts',
    }
  })

  /**
   * Get dead letter events
   */
  .get("/dead-letter", async ({ query, set }) => {
    try {
      const limit = query.limit ? parseInt(query.limit) : 100;
      const events = await eventQueue.getDeadLetterEvents(limit);

      return {
        success: true,
        data: events
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to get dead letter events"
      };
    }
  }, {
    detail: {
      tags: ['Events'],
      summary: 'Get dead letter events',
      description: 'Returns events that failed after maximum retry attempts and need manual intervention',
    },
    query: t.Object({
      limit: t.Optional(t.String())
    })
  })

  /**
   * Retry a dead letter event
   */
  .post("/dead-letter/:eventId/retry", async ({ params, set }) => {
    try {
      const eventId = parseInt(params.eventId);

      await eventQueue.retryDeadLetterEvent(eventId);

      return {
        success: true,
        message: `Event ${eventId} queued for retry`
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to retry event"
      };
    }
  }, {
    detail: {
      tags: ['Events'],
      summary: 'Retry a dead letter event',
      description: 'Requeue a failed event for processing',
    },
    params: t.Object({
      eventId: t.String()
    })
  })

  /**
   * Clean up old completed events
   */
  .delete("/cleanup", async ({ query, set }) => {
    try {
      const olderThanDays = query.olderThanDays ? parseInt(query.olderThanDays) : 7;
      const deletedCount = await eventQueue.cleanup(olderThanDays);

      return {
        success: true,
        message: `Deleted ${deletedCount} old events`,
        data: {
          deletedCount,
          olderThanDays
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to cleanup events"
      };
    }
  }, {
    detail: {
      tags: ['Events'],
      summary: 'Clean up old completed events',
      description: 'Delete completed events older than specified days to free up database space',
    },
    query: t.Object({
      olderThanDays: t.Optional(t.String())
    })
  });
