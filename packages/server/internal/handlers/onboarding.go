package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"server/internal/models"
	"server/internal/repositories"
	"server/pkg/validator"

	"github.com/google/uuid"
)

type GatewayConfigManager struct {
	configDir string
}

func NewGatewayConfigManager(configDir string) *GatewayConfigManager {
	return &GatewayConfigManager{
		configDir: configDir,
	}
}

type OnboardingHandler struct {
	apiRepo   *repositories.APIRepository
	validator *validator.APIValidator
	gateway   *GatewayConfigManager
}

func NewOnboardingHandler(apiRepo *repositories.APIRepository, configDir string) *OnboardingHandler {
	validator := validator.New()
	gateway := NewGatewayConfigManager(configDir)
	return &OnboardingHandler{
		apiRepo:   apiRepo,
		validator: validator,
		gateway:   gateway,
	}
}

func (g *GatewayConfigManager) saveAPIConfig(apiID string, providerID string, req models.OnboardAPIRequest) error {
	// Get absolute paths
	absConfigDir, err := filepath.Abs(g.configDir)
	if err != nil {
		return fmt.Errorf("failed to resolve config directory path: %w", err)
	}

	// Create config directory structure
	configPath := filepath.Join(absConfigDir, providerID, apiID)
	if err := os.MkdirAll(configPath, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	// Find main Caddy config
	mainConfigPath := filepath.Join(filepath.Dir(filepath.Dir(absConfigDir)), "caddy.json")
	log.Printf("Using main config path: %s", mainConfigPath)

	mainConfig := make(map[string]interface{})
	mainConfigData, err := os.ReadFile(mainConfigPath)
	if err != nil {
		log.Printf("Error reading main config: %v", err)
		// Initialize new config if file doesn't exist
		mainConfig = map[string]interface{}{
			"apps": map[string]interface{}{
				"http": map[string]interface{}{
					"servers": map[string]interface{}{
						"example": map[string]interface{}{
							"listen": []string{":2015"},
							"routes": []interface{}{},
						},
					},
				},
			},
		}
	} else {
		if err := json.Unmarshal(mainConfigData, &mainConfig); err != nil {
			return fmt.Errorf("failed to parse main Caddy config: %w", err)
		}
	}

	// Get or initialize routes array
	httpServers := mainConfig["apps"].(map[string]interface{})["http"].(map[string]interface{})["servers"].(map[string]interface{})
	server := httpServers["example"].(map[string]interface{})
	var routes []interface{}
	if existingRoutes, ok := server["routes"].([]interface{}); ok {
		routes = existingRoutes
	} else {
		routes = []interface{}{}
	}

	// Generate and save configs
	for _, endpoint := range req.API.Endpoints {
		config := generateCaddyConfig(endpoint, req.API, apiID)

		// Save individual config file
		configFile := filepath.Join(configPath, fmt.Sprintf("%s_%s.json", endpoint.Method, sanitizePath(endpoint.Path)))
		log.Printf("Saving endpoint config to: %s", configFile)
		if err := os.WriteFile(configFile, config, 0644); err != nil {
			return fmt.Errorf("failed to write config file: %w", err)
		}

		// Merge into main config
		var routeConfig map[string]interface{}
		if err := json.Unmarshal(config, &routeConfig); err != nil {
			return fmt.Errorf("failed to parse route config: %w", err)
		}
		routes = append(routes, routeConfig)
	}

	// Update routes in main config
	server["routes"] = routes
	httpServers["example"] = server

	// Save updated main config
	updatedConfig, err := json.MarshalIndent(mainConfig, "", "    ")
	if err != nil {
		return fmt.Errorf("failed to marshal updated config: %w", err)
	}

	log.Printf("Saving updated main config to: %s", mainConfigPath)
	if err := os.WriteFile(mainConfigPath, updatedConfig, 0644); err != nil {
		return fmt.Errorf("failed to save updated main config: %w", err)
	}

	// Upload config to Caddy
	if err := g.uploadToCaddy(mainConfigPath); err != nil {
		return fmt.Errorf("failed to upload config to Caddy: %w", err)
	}

	return nil
}

func (g *GatewayConfigManager) uploadToCaddy(configPath string) error {
	configData, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read config file: %w", err)
	}

	// Verify JSON is valid
	var configMap map[string]interface{}
	if err := json.Unmarshal(configData, &configMap); err != nil {
		return fmt.Errorf("invalid JSON config: %w", err)
	}

	// Create request with proper JSON content
	req, err := http.NewRequest(http.MethodPost, "http://localhost:2019/load", bytes.NewBuffer(configData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Log the config being sent
	log.Printf("Uploading config to Caddy: %s", string(configData))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to upload config: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Caddy returned error status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

func generateCaddyConfig(endpoint models.Endpoint, api models.APISpec, apiID string) []byte {
	// Create header map from provider headers
	providerHeaders := make(map[string][]string)
	for _, header := range api.Headers {
		providerHeaders[header.Name] = []string{header.Value}
	}

	config := map[string]interface{}{
		"match": []map[string]interface{}{
			{
				"path":   []string{fmt.Sprintf("/api/%s%s*", apiID, endpoint.Path)},
				"method": []string{endpoint.Method},
			},
		},
		"handle": []map[string]interface{}{
			{
				"handler": "reverse_proxy",
				"rewrite": map[string]interface{}{
					"path_regexp": []map[string]interface{}{
						{
							"find":    fmt.Sprintf("/api/%s%s/", apiID, endpoint.Path),
							"replace": fmt.Sprintf("%s/", endpoint.Path),
						},
					},
					"method": endpoint.Method,
				},
				"headers": map[string]interface{}{
					"request": map[string]interface{}{
						"set": map[string]interface{}{
							"Authorization":     []string{fmt.Sprintf("Bearer %s", api.Auth.StaticToken)},
							"X-Real-IP":         []string{"{http.request.remote.host}"},
							"X-Forwarded-For":   []string{"{http.request.remote.host}"},
							"X-Forwarded-Proto": []string{"{http.request.scheme}"},
							"X-Veil-Key":        []string{""},
						},
						"add":    providerHeaders,
						"delete": []string{"Authorization"},
					},
				},
				"upstreams": []map[string]interface{}{
					{
						"dial": "localhost:8081",
					},
				},
			},
		},
	}

	configJSON, _ := json.MarshalIndent(config, "", "    ")
	return configJSON
}

func (g *GatewayConfigManager) testAPIConfig(baseURL string) error {
	// Test connection to upstream server
	resp, err := http.Get(fmt.Sprintf("http://localhost:8080/echo"))
	if err != nil {
		return fmt.Errorf("upstream server test failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("upstream server returned status %d", resp.StatusCode)
	}

	// Test gateway configuration
	gatewayResp, err := http.Get("http://localhost:2019/config/")
	if err != nil {
		return fmt.Errorf("gateway config test failed: %w", err)
	}
	defer gatewayResp.Body.Close()

	if gatewayResp.StatusCode != http.StatusOK {
		return fmt.Errorf("gateway config test returned status %d", gatewayResp.StatusCode)
	}

	return nil
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

	// Generate API ID and provider ID
	apiID := uuid.New().String()
	providerID := uuid.New().String() // In practice, this would come from authentication
	now := time.Now().UTC()

	// Save API configuration
	if err := h.gateway.saveAPIConfig(apiID, providerID, req); err != nil {
		sendErrorResponse(w, "config_error", fmt.Sprintf("Failed to save gateway config: %v", err), http.StatusInternalServerError, nil)
		return
	}

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

func sanitizePath(path string) string {
	return strings.NewReplacer("/", "_", "{", "", "}", "").Replace(path)
}
