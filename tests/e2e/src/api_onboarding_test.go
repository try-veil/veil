// Package e2e provides end-to-end testing for the API gateway
package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestAPIOnboardingAndValidation tests the complete flow of API onboarding and validation
func TestAPIOnboardingAndValidation(t *testing.T) {
	// Test configuration
	const (
		baseURL    = "http://localhost:8080/v1"
		apiName    = "Test Weather API"
		apiVersion = "1.0.0"
	)

	// ARRANGE
	onboardingReq := createTestOnboardingRequest()

	// ACT - Onboarding
	onboardingResp, err := performOnboarding(t, baseURL, onboardingReq)

	// ASSERT - Onboarding
	require.NoError(t, err)
	assert.Equal(t, "success", onboardingResp.Status)
	assert.NotEmpty(t, onboardingResp.APIID)
	assert.NotEmpty(t, onboardingResp.GatewayConfig.ClientAPIKeyPrefix)

	// ACT - Validation
	validationReq := ValidationRequest{
		APIID: onboardingResp.APIID,
		TestParameters: map[string]interface{}{
			"query": map[string]string{
				"status": "200",
			},
		},
	}

	validationResp, err := performValidation(t, baseURL, validationReq)

	// ASSERT - Validation
	require.NoError(t, err)
	assert.Equal(t, "success", validationResp.Status)
	assert.True(t, validationResp.Validation.IsValid)
	assert.NotEmpty(t, validationResp.Gateway.SampleAPIKey)

	// Test the actual endpoint using the gateway
	for _, endpoint := range validationResp.Validation.TestedEndpoints {
		assert.Equal(t, 200, endpoint.StatusCode)
		assert.True(t, endpoint.Success)
		assert.Greater(t, endpoint.ResponseTime, 0)
	}
}

// createTestOnboardingRequest creates a test request for API onboarding
func createTestOnboardingRequest() OnboardingRequest {
	req := OnboardingRequest{}
	req.API.Name = "Test Echo API"
	req.API.Version = "1.0.0"
	req.API.Description = "A test echo API for e2e testing"
	req.API.BaseURL = "http://localhost:8081"
	req.API.Category = "Testing"

	req.API.Auth.StaticToken = "test-token-123"
	req.API.Auth.TokenLocation = "header"
	req.API.Auth.TokenName = "Authorization"

	endpoint := struct {
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
	}{
		Path:        "/echo",
		Method:      "GET",
		Name:        "Echo Request",
		Description: "Echo back request details",
	}

	endpoint.Parameters = append(endpoint.Parameters, struct {
		Name        string `json:"name"`
		Type        string `json:"type"`
		Required    bool   `json:"required"`
		Location    string `json:"location"`
		Description string `json:"description"`
	}{
		Name:        "status",
		Type:        "string",
		Required:    false,
		Location:    "query",
		Description: "Optional status code to return",
	})

	req.API.Endpoints = append(req.API.Endpoints, endpoint)

	req.Owner.Name = "Test Company"
	req.Owner.Email = "test@example.com"
	req.Owner.Website = "https://example.com"

	return req
}

// performOnboarding executes the API onboarding request
func performOnboarding(t *testing.T, baseURL string, req OnboardingRequest) (*OnboardingResponse, error) {
	jsonData, err := json.Marshal(req)
	require.NoError(t, err)

	resp, err := http.Post(fmt.Sprintf("%s/apis/onboard", baseURL), "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var onboardingResp OnboardingResponse
	err = json.NewDecoder(resp.Body).Decode(&onboardingResp)
	require.NoError(t, err)

	return &onboardingResp, nil
}

// performValidation executes the API validation request
func performValidation(t *testing.T, baseURL string, req ValidationRequest) (*ValidationResponse, error) {
	jsonData, err := json.Marshal(req)
	require.NoError(t, err)

	resp, err := http.Post(fmt.Sprintf("%s/apis/validate", baseURL), "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var validationResp ValidationResponse
	err = json.NewDecoder(resp.Body).Decode(&validationResp)
	require.NoError(t, err)

	return &validationResp, nil
}

func TestMain(m *testing.M) {
	// Check if required services are running
	services := map[string]string{
		"Caddy Admin":     "http://localhost:2019/config/",
		"Upstream Server": "http://localhost:8081/echo",
		"API Server":      "http://localhost:8080/health",
	}

	for name, url := range services {
		resp, err := http.Get(url)
		if err != nil || resp.StatusCode != http.StatusOK {
			log.Fatalf("%s is not running. Please start it before running tests.\nExpected: %s to be available", name, url)
		}
		resp.Body.Close()
	}

	os.Exit(m.Run())
}
