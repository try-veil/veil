package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type ResponseData struct {
	Message     string            `json:"message"`
	Path        string            `json:"path"`
	Method      string            `json:"method"`
	Headers     map[string]string `json:"headers"`
	Timestamp   time.Time         `json:"timestamp"`
	QueryParams map[string]string `json:"queryParams"`
}

func main() {
	// Basic echo handler
	http.HandleFunc("/echo/", handleEcho)

	// Delay handler to test timeouts
	http.HandleFunc("/delay/", handleDelay)

	// Status code handler
	http.HandleFunc("/status/", handleStatus)

	// Headers echo handler
	http.HandleFunc("/headers/", handleHeaders)

	// Status code handler with path parameter
	http.HandleFunc("/status-code/", handleStatusCode)

	log.Printf("Starting test server on :8081")
	if err := http.ListenAndServe(":8081", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

// handleEcho returns the request details as JSON
func handleEcho(w http.ResponseWriter, r *http.Request) {
	headers := make(map[string]string)
	for k, v := range r.Header {
		headers[k] = v[0]
	}

	queryParams := make(map[string]string)
	for k, v := range r.URL.Query() {
		queryParams[k] = v[0]
	}

	// Check for status code in query parameters
	if statusCode := r.URL.Query().Get("status"); statusCode != "" {
		if code, err := strconv.Atoi(statusCode); err == nil {
			w.WriteHeader(code)
		}
	}

	response := ResponseData{
		Message:     "Echo response",
		Path:        r.URL.Path,
		Method:      r.Method,
		Headers:     headers,
		Timestamp:   time.Now(),
		QueryParams: queryParams,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleDelay simulates a slow response
func handleDelay(w http.ResponseWriter, r *http.Request) {
	delay := 2 * time.Second
	time.Sleep(delay)

	response := ResponseData{
		Message:   "Delayed response",
		Path:      r.URL.Path,
		Method:    r.Method,
		Timestamp: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleStatus returns the requested status code
func handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest) // Example: always returns 400

	response := ResponseData{
		Message:   "Status code response",
		Path:      r.URL.Path,
		Method:    r.Method,
		Timestamp: time.Now(),
	}

	json.NewEncoder(w).Encode(response)
}

// handleHeaders echoes back the request headers
func handleHeaders(w http.ResponseWriter, r *http.Request) {
	headers := make(map[string]string)
	for k, v := range r.Header {
		headers[k] = v[0]
		// Echo back headers as response headers too
		w.Header().Set(k, v[0])
	}

	response := ResponseData{
		Message:   "Headers echo response",
		Path:      r.URL.Path,
		Method:    r.Method,
		Headers:   headers,
		Timestamp: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleStatusCode returns the status code specified in the path
func handleStatusCode(w http.ResponseWriter, r *http.Request) {
	// Extract status code from path
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	statusCode, err := strconv.Atoi(parts[1])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	headers := make(map[string]string)
	for k, v := range r.Header {
		headers[k] = v[0]
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := ResponseData{
		Message:   fmt.Sprintf("Status code %d response", statusCode),
		Path:      r.URL.Path,
		Method:    r.Method,
		Headers:   headers,
		Timestamp: time.Now(),
	}

	json.NewEncoder(w).Encode(response)
}
