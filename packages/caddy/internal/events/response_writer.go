package events

import (
	"net/http"
	"time"
)

// ResponseRecorder wraps http.ResponseWriter to capture response details
type ResponseRecorder struct {
	http.ResponseWriter
	StatusCode   int
	ResponseSize int64
	StartTime    time.Time
}

// NewResponseRecorder creates a new ResponseRecorder
func NewResponseRecorder(w http.ResponseWriter) *ResponseRecorder {
	return &ResponseRecorder{
		ResponseWriter: w,
		StatusCode:     200, // Default to 200 OK
		StartTime:      time.Now(),
	}
}

// WriteHeader captures the status code
func (rr *ResponseRecorder) WriteHeader(statusCode int) {
	rr.StatusCode = statusCode
	rr.ResponseWriter.WriteHeader(statusCode)
}

// Write captures the response size and delegates to the underlying writer
func (rr *ResponseRecorder) Write(data []byte) (int, error) {
	n, err := rr.ResponseWriter.Write(data)
	rr.ResponseSize += int64(n)
	return n, err
}

// GetResponseTime returns the time elapsed since the recorder was created
func (rr *ResponseRecorder) GetResponseTime() time.Duration {
	return time.Since(rr.StartTime)
}

// IsSuccess returns true if the status code indicates success (2xx)
func (rr *ResponseRecorder) IsSuccess() bool {
	return rr.StatusCode >= 200 && rr.StatusCode < 300
}