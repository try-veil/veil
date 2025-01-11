package e2e

import "time"

// OnboardingRequest represents the request body for API onboarding
type OnboardingRequest struct {
	API struct {
		Name        string `json:"name"`
		Version     string `json:"version"`
		Description string `json:"description"`
		BaseURL     string `json:"baseUrl"`
		Category    string `json:"category"`
		Auth        struct {
			StaticToken   string `json:"staticToken"`
			TokenLocation string `json:"tokenLocation"`
			TokenName     string `json:"tokenName"`
		} `json:"auth"`
		Endpoints []struct {
			Path        string `json:"path"`
			Method      string `json:"method"`
			Name        string `json:"name"`
			Description string `json:"description"`
			Parameters  []struct {
				Name        string `json:"name"`
				Type        string `json:"type"`
				Required    bool   `json:"required"`
				Location    string `json:"location"`
				Description string `json:"description"`
			} `json:"parameters"`
		} `json:"endpoints"`
	} `json:"api"`
	Owner struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		Website string `json:"website"`
	} `json:"owner"`
}

// OnboardingResponse represents the response from API onboarding
type OnboardingResponse struct {
	APIID          string    `json:"apiId"`
	Status         string    `json:"status"`
	Message        string    `json:"message"`
	OnboardingDate time.Time `json:"onboardingDate"`
	APIURL         string    `json:"apiUrl"`
	GatewayConfig  struct {
		ClientAPIKeyPrefix string `json:"clientApiKeyPrefix"`
		Endpoints          []struct {
			Path       string `json:"path"`
			Method     string `json:"method"`
			GatewayURL string `json:"gatewayUrl"`
		} `json:"endpoints"`
	} `json:"gatewayConfig"`
}

// ValidationRequest represents the request body for API validation
type ValidationRequest struct {
	APIID          string                 `json:"apiId"`
	EndpointPath   string                 `json:"endpointPath,omitempty"`
	TestParameters map[string]interface{} `json:"testParameters"`
}

// ValidationResponse represents the response from API validation
type ValidationResponse struct {
	Status     string `json:"status"`
	Validation struct {
		IsValid         bool `json:"isValid"`
		TestedEndpoints []struct {
			Path         string      `json:"path"`
			Method       string      `json:"method"`
			StatusCode   int         `json:"statusCode"`
			ResponseTime int         `json:"responseTime"`
			Success      bool        `json:"success"`
			Response     interface{} `json:"response"`
		} `json:"testedEndpoints"`
		CurlCommands struct {
			WithGateway string `json:"withGateway"`
			Direct      string `json:"direct"`
		} `json:"curlCommands"`
	} `json:"validation"`
	Gateway struct {
		Endpoint     string `json:"endpoint"`
		SampleAPIKey string `json:"sampleApiKey"`
	} `json:"gateway"`
}
