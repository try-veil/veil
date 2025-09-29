package events

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"go.uber.org/zap"
)

// HTTPEventQueue implements UsageEventQueue using HTTP POST to the Elysia server
type HTTPEventQueue struct {
	events         chan UsageEvent
	endpointURL    string
	client         *http.Client
	batchSize      int
	flushInterval  time.Duration
	logger         *zap.Logger
	ctx            context.Context
	cancel         context.CancelFunc
	wg             sync.WaitGroup
	buffer         []UsageEvent
	bufferMutex    sync.Mutex
}

// NewHTTPEventQueue creates a new HTTP-based event queue
func NewHTTPEventQueue(endpointURL string, logger *zap.Logger) *HTTPEventQueue {
	ctx, cancel := context.WithCancel(context.Background())

	return &HTTPEventQueue{
		events:        make(chan UsageEvent, 1000), // Buffer up to 1000 events
		endpointURL:   endpointURL,
		client:        &http.Client{Timeout: 30 * time.Second},
		batchSize:     10,  // Send events in batches of 10
		flushInterval: 5 * time.Second, // Flush every 5 seconds
		logger:        logger,
		ctx:           ctx,
		cancel:        cancel,
		buffer:        make([]UsageEvent, 0, 10),
	}
}

// Enqueue adds a usage event to the queue
func (q *HTTPEventQueue) Enqueue(event UsageEvent) error {
	select {
	case q.events <- event:
		return nil
	case <-q.ctx.Done():
		return fmt.Errorf("event queue is stopped")
	default:
		// Queue is full, log warning and drop event
		q.logger.Warn("event queue is full, dropping event",
			zap.String("api_path", event.APIPath),
			zap.String("method", event.Method))
		return fmt.Errorf("event queue is full")
	}
}

// Start begins processing events
func (q *HTTPEventQueue) Start() error {
	q.wg.Add(2)

	// Start event collector goroutine
	go q.collectEvents()

	// Start periodic flusher goroutine
	go q.periodicFlush()

	q.logger.Info("event queue started",
		zap.String("endpoint", q.endpointURL),
		zap.Int("batch_size", q.batchSize),
		zap.Duration("flush_interval", q.flushInterval))

	return nil
}

// Stop gracefully stops the event queue
func (q *HTTPEventQueue) Stop() error {
	q.logger.Info("stopping event queue")

	q.cancel()
	close(q.events)
	q.wg.Wait()

	// Flush any remaining events
	q.bufferMutex.Lock()
	if len(q.buffer) > 0 {
		q.sendBatch(q.buffer)
	}
	q.bufferMutex.Unlock()

	q.logger.Info("event queue stopped")
	return nil
}

// ProcessEvents is kept for interface compatibility but not used in this implementation
func (q *HTTPEventQueue) ProcessEvents() error {
	return nil
}

// collectEvents collects events from the channel and batches them
func (q *HTTPEventQueue) collectEvents() {
	defer q.wg.Done()

	for {
		select {
		case event, ok := <-q.events:
			if !ok {
				// Channel closed, flush remaining buffer and exit
				return
			}

			q.bufferMutex.Lock()
			q.buffer = append(q.buffer, event)

			// Send batch if we've reached batch size
			if len(q.buffer) >= q.batchSize {
				batch := make([]UsageEvent, len(q.buffer))
				copy(batch, q.buffer)
				q.buffer = q.buffer[:0] // Clear buffer
				q.bufferMutex.Unlock()

				go q.sendBatch(batch)
			} else {
				q.bufferMutex.Unlock()
			}

		case <-q.ctx.Done():
			return
		}
	}
}

// periodicFlush periodically flushes the buffer even if it's not full
func (q *HTTPEventQueue) periodicFlush() {
	defer q.wg.Done()

	ticker := time.NewTicker(q.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			q.bufferMutex.Lock()
			if len(q.buffer) > 0 {
				batch := make([]UsageEvent, len(q.buffer))
				copy(batch, q.buffer)
				q.buffer = q.buffer[:0] // Clear buffer
				q.bufferMutex.Unlock()

				go q.sendBatch(batch)
			} else {
				q.bufferMutex.Unlock()
			}

		case <-q.ctx.Done():
			return
		}
	}
}

// sendBatch sends a batch of events to the Elysia server
func (q *HTTPEventQueue) sendBatch(events []UsageEvent) {
	if len(events) == 0 {
		return
	}

	payload := map[string]interface{}{
		"events": events,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		q.logger.Error("failed to marshal events",
			zap.Error(err),
			zap.Int("events_count", len(events)))
		return
	}

	req, err := http.NewRequest("POST", q.endpointURL, bytes.NewBuffer(jsonData))
	if err != nil {
		q.logger.Error("failed to create request",
			zap.Error(err),
			zap.Int("events_count", len(events)))
		return
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := q.client.Do(req)
	if err != nil {
		q.logger.Error("failed to send events",
			zap.Error(err),
			zap.Int("events_count", len(events)),
			zap.String("endpoint", q.endpointURL))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		q.logger.Debug("successfully sent events",
			zap.Int("events_count", len(events)),
			zap.Int("status_code", resp.StatusCode))
	} else {
		q.logger.Error("failed to send events - bad status",
			zap.Int("events_count", len(events)),
			zap.Int("status_code", resp.StatusCode),
			zap.String("endpoint", q.endpointURL))
	}
}