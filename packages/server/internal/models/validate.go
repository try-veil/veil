package models

// ValidationRequest represents the request body for API validation
type ValidationRequest struct {
	APIID          string         `json:"apiId"`
	EndpointPath   string         `json:"endpointPath,omitempty"`
	TestParameters TestParameters `json:"testParameters"`
}

type TestParameters struct {
	Path    map[string]string `json:"path,omitempty"`
	Query   map[string]string `json:"query,omitempty"`
	Body    map[string]any    `json:"body,omitempty"`
	Headers map[string]string `json:"headers,omitempty"`
}

// ValidationResponse represents the success response for API validation
type ValidationResponse struct {
	Status     string       `json:"status"`
	Validation Validation   `json:"validation"`
	Gateway    *GatewayInfo `json:"gateway,omitempty"`
}

type Validation struct {
	IsValid         bool              `json:"isValid"`
	TestedEndpoints []TestedEndpoint  `json:"testedEndpoints,omitempty"`
	CurlCommands    *CurlCommands     `json:"curlCommands,omitempty"`
	Errors          []ValidationError `json:"errors,omitempty"`
}

type TestedEndpoint struct {
	Path         string           `json:"path"`
	Method       string           `json:"method"`
	StatusCode   int              `json:"statusCode"`
	ResponseTime int64            `json:"responseTime"` // in milliseconds
	Success      bool             `json:"success"`
	Response     EndpointResponse `json:"response,omitempty"`
}

type EndpointResponse struct {
	Body    map[string]any    `json:"body"`
	Headers map[string]string `json:"headers"`
}

type ValidationError struct {
	Endpoint        string            `json:"endpoint"`
	StatusCode      int               `json:"statusCode"`
	Error           string            `json:"error"`
	Details         string            `json:"details"`
	Troubleshooting []Troubleshooting `json:"troubleshooting"`
}

type Troubleshooting struct {
	Issue      string `json:"issue"`
	Suggestion string `json:"suggestion"`
}

type CurlCommands struct {
	WithGateway   string `json:"withGateway,omitempty"`
	Direct        string `json:"direct,omitempty"`
	FailedRequest string `json:"failedRequest,omitempty"`
	SuggestedFix  string `json:"suggestedFix,omitempty"`
}

type GatewayInfo struct {
	Endpoint     string `json:"endpoint"`
	SampleAPIKey string `json:"sampleApiKey"`
}
