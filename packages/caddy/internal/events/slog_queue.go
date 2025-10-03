package events

import (
	"context"
	"log/slog"
	"os"
	"sync"

	"go.uber.org/zap"
)

// SlogEventQueue implements UsageEventQueue using structured logging to stdout
// This follows the RFC pattern for "Structured Logging to stdout with Vector"
// It provides maximum decoupling with zero blocking and no external dependencies
type SlogEventQueue struct {
	events      chan UsageEvent
	eventLogger *slog.Logger
	logger      *zap.Logger
	ctx         context.Context
	cancel      context.CancelFunc
	wg          sync.WaitGroup
}

// NewSlogEventQueue creates a new structured logging-based event queue
func NewSlogEventQueue(logger *zap.Logger) *SlogEventQueue {
	ctx, cancel := context.WithCancel(context.Background())

	// Create a dedicated slog logger that writes JSON to stdout
	eventLogger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	return &SlogEventQueue{
		events:      make(chan UsageEvent, 1000), // Buffer up to 1000 events
		eventLogger: eventLogger,
		logger:      logger,
		ctx:         ctx,
		cancel:      cancel,
	}
}

// Enqueue adds a usage event to the queue (non-blocking with default case)
func (q *SlogEventQueue) Enqueue(event UsageEvent) error {
	select {
	case q.events <- event:
		return nil
	case <-q.ctx.Done():
		return nil // Silently drop on shutdown
	default:
		// Queue is full, drop event silently (fire-and-forget pattern)
		// This is intentional per RFC - we never block the proxy
		return nil
	}
}

// Start begins processing events
func (q *SlogEventQueue) Start() error {
	q.wg.Add(1)
	go q.processEvents()

	q.logger.Info("slog event queue started (structured logging to stdout)")
	return nil
}

// Stop gracefully stops the event queue
func (q *SlogEventQueue) Stop() error {
	q.logger.Info("stopping slog event queue")

	q.cancel()
	close(q.events)
	q.wg.Wait()

	q.logger.Info("slog event queue stopped")
	return nil
}

// ProcessEvents is kept for interface compatibility but not used in this implementation
func (q *SlogEventQueue) ProcessEvents() error {
	return nil
}

// processEvents continuously reads events and writes them as structured logs
func (q *SlogEventQueue) processEvents() {
	defer q.wg.Done()

	for {
		select {
		case event, ok := <-q.events:
			if !ok {
				// Channel closed, exit
				return
			}

			// Write event as structured JSON log to stdout
			// This is a fire-and-forget operation - no blocking, no error handling needed
			q.eventLogger.Info("usage_event",
				slog.String("event_type", "api_usage"),
				slog.String("id", event.ID),
				slog.String("api_path", event.APIPath),
				slog.String("subscription_key", event.SubscriptionKey),
				slog.String("method", event.Method),
				slog.Int64("response_time_ms", event.ResponseTime),
				slog.Int("status_code", event.StatusCode),
				slog.Bool("success", event.Success),
				slog.Time("timestamp", event.Timestamp),
				slog.Int64("request_size", event.RequestSize),
				slog.Int64("response_size", event.ResponseSize),
			)

		case <-q.ctx.Done():
			return
		}
	}
}
