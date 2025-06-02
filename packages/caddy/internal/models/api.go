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
	IsActive    *bool       `json:"is_active" gorm:"default:true"`
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
