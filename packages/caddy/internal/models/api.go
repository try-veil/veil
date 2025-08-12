package models

import (
	"time"

	"gorm.io/gorm"
)

// APIKey represents an API key for accessing an API
type APIKey struct {
	gorm.Model
	APIConfigID uint       `json:"api_config_id" gorm:"index"`
	Key         string     `json:"key" gorm:"uniqueIndex;not null"`
	Name        string     `json:"name" gorm:"not null"`
	IsActive    *bool      `json:"is_active,omitempty" gorm:"default:true"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

// APIParameter represents a parameter configuration for an API
type APIParameter struct {
	gorm.Model
	APIConfigID uint   `json:"api_config_id" gorm:"index"`
	Name        string `json:"name" gorm:"not null"`
	Type        string `json:"type" gorm:"not null"` // query, path, header, body
	Required    bool   `json:"required" gorm:"default:false"`
	Validation  string `json:"validation"` // regex pattern for validation
}

// APIMethod represents allowed HTTP methods for an API
type APIMethod struct {
	gorm.Model
	APIConfigID uint   `json:"api_config_id" gorm:"index"`
	Method      string `json:"method" gorm:"not null"`
}

// QueryParameter represents a query parameter
type QueryParameter struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Required bool   `json:"required"`
}

// MultipartField represents a multipart form field
type MultipartField struct {
	Name        string `json:"name"`
	Value       string `json:"value"`
	Type        string `json:"type"` // "text" or "file"
	Required    bool   `json:"required"`
	Description string `json:"description,omitempty"`
	ContentType string `json:"content_type,omitempty"`
}

// FormData represents form data key-value pairs
type FormData struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// Body represents request body configuration
type Body struct {
	Type          string                 `json:"type"`
	Content       string                 `json:"content,omitempty"`
	JsonData      map[string]interface{} `json:"json_data,omitempty"`
	FormData      []FormData             `json:"form_data,omitempty"`
	MultipartData []MultipartField       `json:"multipart_data,omitempty"`
}

// APIConfig holds the configuration for a single API route
type APIConfig struct {
	gorm.Model
	Path                 string         `json:"path" gorm:"uniqueIndex;not null"`
	Upstream             string         `json:"upstream" gorm:"not null"`
	RequiredSubscription string         `json:"required_subscription" gorm:"not null"`
	LastAccessed         time.Time      `json:"last_accessed"`
	RequestCount         int64          `json:"request_count" gorm:"default:0"`
	Methods              []APIMethod    `json:"methods" gorm:"foreignKey:APIConfigID"`
	Parameters           []APIParameter `json:"parameters" gorm:"foreignKey:APIConfigID"`
	RequiredHeaders      []string       `json:"required_headers" gorm:"serializer:json"`
	APIKeys              []APIKey       `json:"api_keys" gorm:"foreignKey:APIConfigID"`
	ProviderID           string         `json:"provider_id" gorm:"not null"`
	QueryParams          []QueryParameter `json:"query_params" gorm:"serializer:json"`
	Body                 *Body          `json:"body" gorm:"serializer:json"`
}

// APIOnboardRequest represents a request to onboard a new API
type APIOnboardRequest struct {
	Path                 string         `json:"path"`
	Upstream             string         `json:"upstream"`
	RequiredSubscription string         `json:"required_subscription"`
	Methods              []string       `json:"methods"`
	Parameters           []APIParameter `json:"parameters"`
	RequiredHeaders      []string       `json:"required_headers"`
	APIKeys              []APIKey       `json:"api_keys"`
}

// APIOnboardResponse represents the response from API onboarding
type APIOnboardResponse struct {
	Status  string    `json:"status"`
	Message string    `json:"message"`
	API     APIConfig `json:"api"`
}
