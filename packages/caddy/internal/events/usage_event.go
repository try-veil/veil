package events

import (
	"time"
)

// UsageEvent represents a single API usage event
type UsageEvent struct {
	ID             string    `json:"id"`
	APIPath        string    `json:"api_path"`
	SubscriptionKey string    `json:"subscription_key"`
	Method         string    `json:"method"`
	ResponseTime   int64     `json:"response_time_ms"`
	StatusCode     int       `json:"status_code"`
	Success        bool      `json:"success"`
	Timestamp      time.Time `json:"timestamp"`
	RequestSize    int64     `json:"request_size"`
	ResponseSize   int64     `json:"response_size"`
}

// UsageEventQueue handles queuing of usage events
type UsageEventQueue interface {
	Enqueue(event UsageEvent) error
	ProcessEvents() error
	Start() error
	Stop() error
}