package models

type OnboardAPIRequest struct {
	API   APISpec   `json:"api"`
	Owner OwnerSpec `json:"owner"`
}

type APISpec struct {
	Name          string            `json:"name" validate:"required"`
	Version       string            `json:"version" validate:"required"`
	Description   string            `json:"description"`
	BaseURL       string            `json:"baseUrl" validate:"required,url"`
	Category      string            `json:"category"`
	Auth          AuthSpec          `json:"auth" validate:"required"`
	Endpoints     []Endpoint        `json:"endpoints" validate:"required,min=1"`
	Pricing       PricingSpec       `json:"pricing"`
	Documentation DocumentationSpec `json:"documentation"`
}

type AuthSpec struct {
	StaticToken   string `json:"staticToken" validate:"required"`
	TokenLocation string `json:"tokenLocation" validate:"required,oneof=header query"`
	TokenName     string `json:"tokenName" validate:"required"`
}

type Endpoint struct {
	Path        string              `json:"path" validate:"required"`
	Method      string              `json:"method" validate:"required,oneof=GET POST PUT DELETE PATCH"`
	Name        string              `json:"name" validate:"required"`
	Description string              `json:"description"`
	Parameters  []EndpointParameter `json:"parameters"`
	Responses   map[string]Response `json:"responses"`
	RateLimit   *RateLimit          `json:"rateLimit"`
}

type EndpointParameter struct {
	Name        string `json:"name" validate:"required"`
	Type        string `json:"type" validate:"required"`
	Required    bool   `json:"required"`
	Location    string `json:"location" validate:"required,oneof=query path body"`
	Description string `json:"description"`
}

type Response struct {
	Description string      `json:"description"`
	Schema      interface{} `json:"schema"`
}

type RateLimit struct {
	Requests int    `json:"requests"`
	Period   string `json:"period"`
}

type PricingSpec struct {
	Type  string `json:"type" validate:"oneof=free paid freemium"`
	Plans []Plan `json:"plans"`
}

type Plan struct {
	Name     string   `json:"name"`
	Price    float64  `json:"price"`
	Period   string   `json:"period" validate:"oneof=monthly yearly"`
	Features []string `json:"features"`
}

type DocumentationSpec struct {
	Swagger string `json:"swagger"`
	Readme  string `json:"readme"`
}

type OwnerSpec struct {
	Name    string `json:"name" validate:"required"`
	Email   string `json:"email" validate:"required,email"`
	Website string `json:"website" validate:"omitempty,url"`
}

type OnboardAPIResponse struct {
	APIID          string        `json:"apiId"`
	Status         string        `json:"status"`
	Message        string        `json:"message"`
	OnboardingDate string        `json:"onboardingDate"`
	APIURL         string        `json:"apiUrl"`
	GatewayConfig  GatewayConfig `json:"gatewayConfig"`
}

type GatewayConfig struct {
	ClientAPIKeyPrefix string            `json:"clientApiKeyPrefix"`
	Endpoints          []GatewayEndpoint `json:"endpoints"`
}

type GatewayEndpoint struct {
	Path       string `json:"path"`
	Method     string `json:"method"`
	GatewayURL string `json:"gatewayUrl"`
}

type ErrorResponse struct {
	Status  string        `json:"status"`
	Code    string        `json:"code"`
	Message string        `json:"message"`
	Details []ErrorDetail `json:"details,omitempty"`
}

type ErrorDetail struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type OnboardedAPI struct {
	ID    string    `json:"id"`
	API   APISpec   `json:"api"`
	Owner OwnerSpec `json:"owner"`
}
