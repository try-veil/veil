package dto

import (
	"time"
)

// APIKeyDTO represents an API key in requests and responses
type APIKeyDTO struct {
	Key       string     `json:"key"`
	Name      string     `json:"name"`
	IsActive  *bool      `json:"is_active,omitempty"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// APIOnboardRequestDTO represents the request body for API onboarding
type APIOnboardRequestDTO struct {
	Path                 string              `json:"path" binding:"required"`
	Upstream             string              `json:"upstream" binding:"required"`
	RequiredSubscription string              `json:"required_subscription"`
	Methods              []string            `json:"methods" binding:"required"`
	RequiredHeaders      []string            `json:"required_headers"`
	Parameters           []ParameterDTO      `json:"parameters"`
	APIKeys              []APIKeyDTO         `json:"api_keys"`
	ProviderID           string              `json:"provider_id" binding:"required"`
	QueryParams          []QueryParameterDTO `json:"query_params,omitempty"`
	Body                 *BodyDTO            `json:"body,omitempty"`
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
	IsActive *bool  `json:"is_active,omitempty"`
}

// APIResponseDTO represents the common response structure
type APIResponseDTO struct {
	Status  string      `json:"status"`
	Message string      `json:"message"`
	API     interface{} `json:"api,omitempty"`
}

// ParameterDTO represents an API parameter in requests and responses
type ParameterDTO struct {
	Name     string `json:"name"`
	Type     string `json:"type"` // query, path, header, body
	Required bool   `json:"required"`
}

// QueryParameterDTO represents a query parameter
type QueryParameterDTO struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// MultipartFieldDTO represents a multipart form field
type MultipartFieldDTO struct {
	Name        string `json:"name"`
	Value       string `json:"value"`
	Type        string `json:"type"` // "text" or "file"
	Required    bool   `json:"required"`
	Description string `json:"description,omitempty"`
	ContentType string `json:"content_type,omitempty"`
}

// FormDataDTO represents form data key-value pairs
type FormDataDTO struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// BodyDTO represents request body configuration
type BodyDTO struct {
	Type          string              `json:"type"`
	Content       string              `json:"content,omitempty"`
	JsonData      map[string]interface{} `json:"json_data,omitempty"`
	FormData      []FormDataDTO       `json:"form_data,omitempty"`
	MultipartData []MultipartFieldDTO `json:"multipart_data,omitempty"`
}

// APIKeyDeleteRequestDTO represents the request body for deleting an API key
type APIKeyDeleteRequestDTO struct {
	Path   string `json:"path"`
	APIKey string `json:"api_key"`
}
