package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"server/internal/models"
	"server/internal/repositories"
	"server/pkg/validator"
)

type ValidateHandler struct {
	apiRepo   *repositories.APIRepository
	validator *validator.APIValidator
}

func NewValidateHandler(apiRepo *repositories.APIRepository) *ValidateHandler {
	return &ValidateHandler{
		apiRepo:   apiRepo,
		validator: validator.New(),
	}
}

func (h *ValidateHandler) ValidateAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.ValidationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, "invalid_request", "Invalid request body", http.StatusBadRequest, nil)
		return
	}

	// Get API details from database
	api, err := h.apiRepo.GetAPIByID(req.APIID)
	if err != nil {
		sendErrorResponse(w, "not_found", "API not found", http.StatusNotFound, nil)
		return
	}

	// Validate endpoints
	validation := h.validateEndpoints(api, req.EndpointPath, req.TestParameters)

	// Generate response
	resp := models.ValidationResponse{
		Status:     "success",
		Validation: validation,
	}

	if validation.IsValid {
		resp.Gateway = &models.GatewayInfo{
			Endpoint:     fmt.Sprintf("/v1/gateway/%s%s", api.API.Name, req.EndpointPath),
			SampleAPIKey: fmt.Sprintf("temp_key_%s_%d", api.API.Name, time.Now().Unix()),
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *ValidateHandler) validateEndpoints(api *models.OnboardAPIRequest, endpointPath string, params models.TestParameters) models.Validation {
	validation := models.Validation{
		IsValid:         true,
		TestedEndpoints: make([]models.TestedEndpoint, 0),
		CurlCommands:    &models.CurlCommands{},
	}

	if api == nil {
		validation.IsValid = false
		validation.Errors = append(validation.Errors, models.ValidationError{
			Error:   "Invalid API configuration",
			Details: "API configuration is missing or invalid",
		})
		return validation
	}

	endpoints := api.API.Endpoints
	if endpointPath != "" {
		endpoints = filterEndpoints(endpoints, endpointPath)
	}

	for _, endpoint := range endpoints {
		result := h.testEndpoint(api, endpoint, params)
		validation.TestedEndpoints = append(validation.TestedEndpoints, result)

		if !result.Success {
			validation.IsValid = false
			validation.Errors = append(validation.Errors, generateError(endpoint, result))
		}
	}

	validation.CurlCommands = generateCurlCommands(api, endpoints[0], params)
	return validation
}

func (h *ValidateHandler) testEndpoint(api *models.OnboardAPIRequest, endpoint models.Endpoint, params models.TestParameters) models.TestedEndpoint {
	// TODO: Implement actual endpoint testing
	// For now, return a mock success response
	return models.TestedEndpoint{
		Path:         endpoint.Path,
		Method:       endpoint.Method,
		StatusCode:   200,
		ResponseTime: 100,
		Success:      true,
		Response: models.EndpointResponse{
			Body: map[string]any{
				"message": "Test successful",
			},
			Headers: map[string]string{
				"content-type": "application/json",
			},
		},
	}
}

func filterEndpoints(endpoints []models.Endpoint, path string) []models.Endpoint {
	for _, e := range endpoints {
		if e.Path == path {
			return []models.Endpoint{e}
		}
	}
	return endpoints
}

func generateError(endpoint models.Endpoint, result models.TestedEndpoint) models.ValidationError {
	return models.ValidationError{
		Endpoint:   endpoint.Path,
		StatusCode: result.StatusCode,
		Error:      "Endpoint validation failed",
		Details:    "The endpoint did not respond as expected",
		Troubleshooting: []models.Troubleshooting{
			{
				Issue:      "Unexpected response",
				Suggestion: "Check the endpoint configuration and try again",
			},
		},
	}
}

func generateCurlCommands(api *models.OnboardAPIRequest, endpoint models.Endpoint, params models.TestParameters) *models.CurlCommands {
	return &models.CurlCommands{
		WithGateway: fmt.Sprintf("curl -X %s 'https://api.yourgateway.com/%s%s' -H 'X-API-Key: temp_key_%s'",
			endpoint.Method, api.API.Name, endpoint.Path, api.API.Name),
		Direct: fmt.Sprintf("curl -X %s '%s%s' -H 'Authorization: Bearer %s'",
			endpoint.Method, api.API.BaseURL, endpoint.Path, "your_token"),
	}
}
