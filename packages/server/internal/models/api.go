// package models

// import (
// 	"time"

// 	"gorm.io/gorm"
// )

// type APIOwner struct {
// 	gorm.Model
// 	Name    string `gorm:"not null" json:"name"`
// 	Email   string `gorm:"not null" json:"email"`
// 	Website string `json:"website"`
// }

// type API struct {
// 	ID          string         `gorm:"primaryKey" json:"id"`
// 	CreatedAt   time.Time      `json:"created_at"`
// 	UpdatedAt   time.Time      `json:"updated_at"`
// 	DeletedAt   gorm.DeletedAt `json:"deleted_at"`
// 	Name        string         `gorm:"not null" json:"name"`
// 	Version     string         `gorm:"not null" json:"version"`
// 	Description string         `json:"description"`
// 	BaseURL     string         `gorm:"not null" json:"base_url"`
// 	Category    string         `json:"category"`
// 	// Spec        APISpec        `gorm:"references:ID" json:"spec"`
// 	Spec APISpec `json:"spec"`
// }

// type APISpec struct {
// 	ID string `json:"id"`
// 	// Auth          AuthSpec          `json:"auth" validate:"required"`            // Embedded struct
// 	Endpoints     []Endpoint        `json:"endpoints" validate:"required,min=1"` // One-to-many relationship
// 	Pricing       PricingSpec       `json:"pricing"`
// 	Documentation DocumentationSpec `json:"documentation"`
// 	Headers       []Header          `json:"headers"`
// }

// type AuthSpec struct {
// 	ID            string
// 	StaticToken   string `json:"static_token" validate:"required"`
// 	TokenLocation string `json:"token_location" validate:"required,oneof=header query"`
// 	TokenName     string `json:"token_name" validate:"required"`
// }

// type Endpoint struct {
// 	Path        string `json:"path" validate:"required"`
// 	Method      string `json:"method" validate:"required,oneof=GET POST PUT DELETE PATCH"`
// 	Name        string `json:"name" validate:"required"`
// 	Description string `json:"description"`

// 	// One-to-many relationship for parameters
// 	Parameters []EndpointParameter `json:"parameters"`

// 	// JSON field for storing responses as a map
// 	Responses string `json:"responses"`

// 	// One-to-one relationship for rate limit
// 	RateLimit *RateLimit `json:"rate_limit"`
// }

// type EndpointParameter struct {
// 	EndpointID  string `json:"endpoint_id"` // Foreign key for Endpoint
// 	Name        string `json:"name" validate:"required"`
// 	Type        string `json:"type" validate:"required"`
// 	Required    bool   `json:"required"`
// 	Location    string `json:"location" validate:"required,oneof=query path body"`
// 	Description string `json:"description"`
// }

// type Response struct {
// 	ID          string `json:"id"`          // Primary key
// 	EndpointID  string `json:"endpoint_id"` // Foreign key for Endpoint
// 	Description string `json:"description"` // Description of the response
// 	Schema      string `json:"schema"`      // JSON string to store schema
// }

// type RateLimit struct {
// 	EndpointID string `json:"endpoint_id"` // Foreign key for Endpoint
// 	Requests   int    `json:"requests"`    // Number of allowed requests
// 	Period     string `json:"period"`      // Time period (e.g., "minute", "hour", "day")
// }

// type PricingSpec struct {
// 	ID    string `json:"id"`                                       // Primary key
// 	APIID uint   `json:"api_id"`                                   // Foreign key for APISpec
// 	Type  string `json:"type" validate:"oneof=free paid freemium"` // Pricing type
// 	Plans []Plan `json:"plans"`                                    // One-to-many relationship
// }

// type Plan struct {
// 	ID        string  `json:"id"`                                     // Primary key
// 	PricingID uint    `json:"pricing_id"`                             // Foreign key for PricingSpec
// 	Name      string  `json:"name"`                                   // Plan name
// 	Price     float64 `json:"price"`                                  // Plan price
// 	Period    string  `json:"period" validate:"oneof=monthly yearly"` // Billing period
// 	Features  string  `json:"features"`                               // JSON string to store features array
// }

// type DocumentationSpec struct {
// 	ID        string `json:"id"`          // Primary key
// 	APISpecID uint   `json:"api_spec_id"` // Foreign key for APISpec
// 	Swagger   string `json:"swagger"`     // Swagger documentation
// 	Readme    string `json:"readme"`      // Readme documentation
// }

// type OwnerSpec struct {
// 	ID      string `json:"id"`                               // Primary key
// 	Name    string `json:"name" validate:"required"`         // Owner's name
// 	Email   string `json:"email" validate:"required,email"`  // Owner's email
// 	Website string `json:"website" validate:"omitempty,url"` // Owner's website
// }

// type OnboardAPIResponse struct {
// 	ID             string        `json:"id"`              // Primary key
// 	APIID          string        `json:"api_id"`          // API ID
// 	Status         string        `json:"status"`          // Status of onboarding
// 	Message        string        `json:"message"`         // Message related to the status
// 	OnboardingDate string        `json:"onboarding_date"` // Onboarding date
// 	APIURL         string        `json:"api_url"`         // API URL
// 	GatewayConfig  GatewayConfig `json:"gateway_config"`  // Foreign key for GatewayConfig
// }

// type GatewayConfig struct {
// 	ID                 string            `json:"id"`                    // Primary key
// 	ClientAPIKeyPrefix string            `json:"client_api_key_prefix"` // Prefix for the API key
// 	Endpoints          []GatewayEndpoint `json:"endpoints"`             // One-to-many relationship
// }

// type GatewayEndpoint struct {
// 	ID         string `json:"id"`          // Primary key
// 	Path       string `json:"path"`        // Path for the endpoint
// 	Method     string `json:"method"`      // HTTP method (GET, POST, etc.)
// 	GatewayURL string `json:"gateway_url"` // URL for the gateway endpoint
// }

// type ErrorResponse struct {
// 	ID      string        `json:"id"`                // Primary key
// 	Status  string        `json:"status"`            // Status of the error response
// 	Code    string        `json:"code"`              // Error code
// 	Message string        `json:"message"`           // Error message
// 	Details []ErrorDetail `json:"details,omitempty"` // One-to-many relationship
// }

// type ErrorDetail struct {
// 	ID      string `json:"id"`      // Primary key
// 	Field   string `json:"field"`   // Field related to the error
// 	Message string `json:"message"` // Message describing the error
// }

// type OnboardedAPI struct {
// 	ID      string    `json:"api_id"`   // Foreign key for APISpec
// 	OwnerID uint      `json:"owner_id"` // Foreign key for OwnerSpec
// 	API     APISpec   `json:"api"`      // Associated APISpec
// 	Owner   OwnerSpec `json:"owner"`    // Associated OwnerSpec
// }

// type APIEndpoint struct {
// 	ID          string         `json:"id"`          // Primary key
// 	Path        string         `json:"path"`        // Path for the endpoint
// 	Method      string         `json:"method"`      // HTTP method (GET, POST, etc.)
// 	Name        string         `json:"name"`        // Name of the endpoint
// 	Description string         `json:"description"` // Description of the endpoint
// 	Parameters  []APIParameter `json:"parameters"`  // One-to-many relationship with APIParameter
// }

// type APIParameter struct {
// 	Name        string `json:"name"`        // Name of the parameter
// 	Type        string `json:"type"`        // Type of the parameter (e.g., string, int)
// 	Required    bool   `json:"required"`    // Whether the parameter is required
// 	Location    string `json:"location"`    // Location of the parameter (query, body, etc.)
// 	Description string `json:"description"` // Description of the parameter
// }

// type Header struct {
// 	Name  string `json:"name"`  // Name of the header
// 	Value string `json:"value"` // Value of the header
// }

package models

import (
	"time"

	"gorm.io/gorm"
)

type OnboardAPIRequest struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	APIID     string    `gorm:"index" json:"api_id"` // Foreign key for API
	API       API       `gorm:"foreignKey:APIID" json:"api"`
	APISpecID string    `gorm:"index" json:"api_spec_id"` // Foreign key for APISpec
	APISpec   APISpec   `gorm:"foreignKey:APISpecID" json:"api_spec"`
	OwnerID   string    `gorm:"index" json:"owner_id"` // Foreign key for OwnerSpec
	Owner     OwnerSpec `gorm:"foreignKey:OwnerID" json:"owner"`
}
type APIOwner struct {
	gorm.Model
	Name    string `gorm:"not null" json:"name"`
	Email   string `gorm:"not null" json:"email"`
	Website string `gorm:"type:varchar(255)" json:"website"`
}

type API struct {
	ID          string         `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at"`
	Name        string         `gorm:"not null" json:"name"`
	Version     string         `gorm:"not null" json:"version"`
	Description string         `gorm:"type:text" json:"description"`
	BaseURL     string         `gorm:"not null" json:"base_url"`
	Category    string         `gorm:"type:varchar(255)" json:"category"`
	Spec        APISpec        `gorm:"foreignKey:ID" json:"spec"`
}

type APISpec struct {
	ID            string            `gorm:"primaryKey" json:"id"`
	AuthID        string            `gorm:"index" json:"auth_id"` // Foreign key for AuthSpec
	Auth          AuthSpec          `gorm:"foreignKey:AuthID" json:"auth"`
	Endpoints     []Endpoint        `gorm:"foreignKey:APISpecID" json:"endpoints"`
	Pricing       PricingSpec       `gorm:"foreignKey:APISpecID" json:"pricing"`
	Documentation DocumentationSpec `gorm:"foreignKey:APISpecID" json:"documentation"`
	Headers       []Header          `gorm:"foreignKey:APISpecID" json:"headers"`
}

type AuthSpec struct {
	ID            string `gorm:"primaryKey" json:"id"`
	StaticToken   string `gorm:"not null" json:"static_token"`
	TokenLocation string `gorm:"not null" json:"token_location"`
	TokenName     string `gorm:"not null" json:"token_name"`
}

type Endpoint struct {
	ID          string              `gorm:"primaryKey" json:"id"`
	APISpecID   string              `gorm:"index" json:"api_spec_id"`
	Path        string              `gorm:"not null" json:"path"`
	Method      string              `gorm:"not null" json:"method"`
	Name        string              `gorm:"not null" json:"name"`
	Description string              `gorm:"type:text" json:"description"`
	Parameters  []EndpointParameter `gorm:"foreignKey:EndpointID" json:"parameters"`
	Responses   string              `gorm:"type:json" json:"responses"`
	RateLimit   *RateLimit          `gorm:"foreignKey:EndpointID" json:"rate_limit"`
}

type EndpointParameter struct {
	ID          string `gorm:"primaryKey" json:"id"`
	EndpointID  string `gorm:"index" json:"endpoint_id"`
	Name        string `gorm:"not null" json:"name"`
	Type        string `gorm:"not null" json:"type"`
	Required    bool   `gorm:"not null" json:"required"`
	Location    string `gorm:"not null" json:"location"`
	Description string `gorm:"type:text" json:"description"`
}

type Response struct {
	ID          string `gorm:"primaryKey" json:"id"`
	EndpointID  string `gorm:"index" json:"endpoint_id"`
	Description string `gorm:"type:text" json:"description"`
	Schema      string `gorm:"type:json" json:"schema"`
}

type RateLimit struct {
	ID         string `gorm:"primaryKey" json:"id"`
	EndpointID string `gorm:"index" json:"endpoint_id"`
	Requests   int    `gorm:"not null" json:"requests"`
	Period     string `gorm:"not null" json:"period"`
}

type PricingSpec struct {
	ID        string `gorm:"primaryKey" json:"id"`
	APISpecID string `gorm:"index" json:"api_spec_id"`
	Type      string `gorm:"not null" json:"type"`
	Plans     []Plan `gorm:"foreignKey:PricingID" json:"plans"`
}

type Plan struct {
	ID        string  `gorm:"primaryKey" json:"id"`
	PricingID string  `gorm:"index" json:"pricing_id"`
	Name      string  `gorm:"not null" json:"name"`
	Price     float64 `gorm:"not null" json:"price"`
	Period    string  `gorm:"not null" json:"period"`
	Features  string  `gorm:"type:json" json:"features"`
}

type DocumentationSpec struct {
	ID        string `gorm:"primaryKey" json:"id"`
	APISpecID string `gorm:"index" json:"api_spec_id"`
	Swagger   string `gorm:"type:text" json:"swagger"`
	Readme    string `gorm:"type:text" json:"readme"`
}

type OwnerSpec struct {
	ID      string `gorm:"primaryKey" json:"id"`
	Name    string `gorm:"not null" json:"name"`
	Email   string `gorm:"not null" json:"email"`
	Website string `gorm:"type:varchar(255)" json:"website"`
}

type OnboardAPIResponse struct {
	ID             string        `gorm:"primaryKey" json:"id"`
	APIID          string        `gorm:"index" json:"api_id"`
	Status         string        `gorm:"not null" json:"status"`
	Message        string        `gorm:"type:text" json:"message"`
	OnboardingDate string        `gorm:"not null" json:"onboarding_date"`
	APIURL         string        `gorm:"not null" json:"api_url"`
	GatewayConfig  GatewayConfig `gorm:"foreignKey:ID" json:"gateway_config"`
}

type GatewayConfig struct {
	ID                 string            `gorm:"primaryKey" json:"id"`
	ClientAPIKeyPrefix string            `gorm:"not null" json:"client_api_key_prefix"`
	Endpoints          []GatewayEndpoint `gorm:"foreignKey:GatewayConfigID" json:"endpoints"`
}

type GatewayEndpoint struct {
	ID              string `gorm:"primaryKey" json:"id"`
	GatewayConfigID string `gorm:"index" json:"gateway_config_id"`
	Path            string `gorm:"not null" json:"path"`
	Method          string `gorm:"not null" json:"method"`
	GatewayURL      string `gorm:"not null" json:"gateway_url"`
}

type ErrorResponse struct {
	ID      string        `gorm:"primaryKey" json:"id"`
	Status  string        `gorm:"not null" json:"status"`
	Code    string        `gorm:"not null" json:"code"`
	Message string        `gorm:"type:text" json:"message"`
	Details []ErrorDetail `gorm:"foreignKey:ErrorResponseID" json:"details"`
}

type ErrorDetail struct {
	ID              string `gorm:"primaryKey" json:"id"`
	ErrorResponseID string `gorm:"index" json:"error_response_id"`
	Field           string `gorm:"not null" json:"field"`
	Message         string `gorm:"type:text" json:"message"`
}

type OnboardedAPI struct {
	ID      string    `gorm:"primaryKey" json:"id"`
	APIID   string    `gorm:"index" json:"api_id"`
	OwnerID string    `gorm:"index" json:"owner_id"`
	API     APISpec   `gorm:"foreignKey:APIID" json:"api"`
	Owner   OwnerSpec `gorm:"foreignKey:OwnerID" json:"owner"`
}

type APIEndpoint struct {
	ID          string         `gorm:"primaryKey" json:"id"`
	Path        string         `gorm:"not null" json:"path"`
	Method      string         `gorm:"not null" json:"method"`
	Name        string         `gorm:"not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	Parameters  []APIParameter `gorm:"foreignKey:APIEndpointID" json:"parameters"`
}

type APIParameter struct {
	ID            string `gorm:"primaryKey" json:"id"`
	APIEndpointID string `gorm:"index" json:"api_endpoint_id"`
	Name          string `gorm:"not null" json:"name"`
	Type          string `gorm:"not null" json:"type"`
	Required      bool   `gorm:"not null" json:"required"`
	Location      string `gorm:"not null" json:"location"`
	Description   string `gorm:"type:text" json:"description"`
}

type Header struct {
	ID        string `gorm:"primaryKey" json:"id"`
	APISpecID string `gorm:"index" json:"api_spec_id"`
	Name      string `gorm:"not null" json:"name"`
	Value     string `gorm:"not null" json:"value"`
}
