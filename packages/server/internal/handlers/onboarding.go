package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"server/internal/models"
	"server/internal/repositories"
	"server/pkg/validator"

	"github.com/google/uuid"
)

type OnboardingHandler struct {
	apiRepo   *repositories.APIRepository
	validator *validator.APIValidator
}

func NewOnboardingHandler(apiRepo *repositories.APIRepository) *OnboardingHandler {
	validator := validator.New()
	return &OnboardingHandler{
		apiRepo:   apiRepo,
		validator: validator,
	}
}

func (h *OnboardingHandler) OnboardAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.OnboardAPIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, "invalid_request", "Invalid request body", http.StatusBadRequest, nil)
		return
	}

	// Validate request
	if err := h.validateOnboardingRequest(&req); err != nil {
		sendErrorResponse(w, "validation_error", err.Error(), http.StatusBadRequest, nil)
		return
	}

	// Generate API ID
	apiID := uuid.New().String()
	now := time.Now().UTC()

	// Save to database
	err := h.apiRepo.SaveAPI(repositories.SaveAPIParams{
		ID:           apiID,
		Name:         req.API.Name,
		Version:      req.API.Version,
		Description:  req.API.Description,
		BaseURL:      req.API.BaseURL,
		Category:     req.API.Category,
		Spec:         req,
		CreatedAt:    now,
		OwnerName:    req.Owner.Name,
		OwnerEmail:   req.Owner.Email,
		OwnerWebsite: req.Owner.Website,
	})
	if err != nil {
		sendErrorResponse(w, "database_error", "Failed to save API", http.StatusInternalServerError, nil)
		return
	}

	// Generate response
	resp := models.OnboardAPIResponse{
		APIID:          apiID,
		Status:         "success",
		Message:        "API successfully onboarded",
		OnboardingDate: now.Format(time.RFC3339),
		APIURL:         "/apis/" + req.API.Name,
		GatewayConfig: models.GatewayConfig{
			ClientAPIKeyPrefix: "api_" + req.API.Name + "_",
			Endpoints:          generateGatewayEndpoints(req.API),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *OnboardingHandler) validateOnboardingRequest(req *models.OnboardAPIRequest) error {
	for _, endpoint := range req.API.Endpoints {
		if err := h.validator.ValidateEndpoint(endpoint.Path, endpoint.Method, req.API.BaseURL+endpoint.Path); err != nil {
			return fmt.Errorf("invalid endpoint %s: %w", endpoint.Path, err)
		}
	}
	return nil
}

func generateGatewayEndpoints(api models.APISpec) []models.GatewayEndpoint {
	endpoints := make([]models.GatewayEndpoint, len(api.Endpoints))
	for i, endpoint := range api.Endpoints {
		endpoints[i] = models.GatewayEndpoint{
			Path:       endpoint.Path,
			Method:     endpoint.Method,
			GatewayURL: "/v1/gateway/" + api.Name + endpoint.Path,
		}
	}
	return endpoints
}

func sendErrorResponse(w http.ResponseWriter, code, message string, status int, details []models.ErrorDetail) {
	resp := models.ErrorResponse{
		Status:  "error",
		Code:    code,
		Message: message,
		Details: details,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}
