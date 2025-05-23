package dto

import (
	"time"
)

// APIKeyDTO represents an API key in requests and responses
type APIKeyDTO struct {
	Key       string     `json:"key"`
	Name      string     `json:"name"`
	IsActive  bool       `json:"is_active,omitempty"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// APIOnboardRequestDTO represents the request body for API onboarding
type APIOnboardRequestDTO struct {
	Path                 string      `json:"path" binding:"required"`
	Upstream             string      `json:"upstream" binding:"required"`
	RequiredSubscription string      `json:"required_subscription"`
	Methods              []string    `json:"methods" binding:"required"`
	RequiredHeaders      []string    `json:"required_headers"`
	APIKeys              []APIKeyDTO `json:"api_keys"`
}

// APIKeysRequestDTO represents the request body for adding API keys
type APIKeysRequestDTO struct {
	Path    string      `json:"path" binding:"required"`
	APIKeys []APIKeyDTO `json:"api_keys" binding:"required"`
}

// APIKeyStatusRequestDTO represents the request body for updating API key status
type APIKeyStatusRequestDTO struct {
	Path     string `json:"path" binding:"required"`
	APIKey   string `json:"api_key" binding:"required"`
	IsActive bool   `json:"is_active"`
}

// APIResponseDTO represents the common response structure
type APIResponseDTO struct {
	Status  string      `json:"status"`
	Message string      `json:"message"`
	API     interface{} `json:"api,omitempty"`
}
