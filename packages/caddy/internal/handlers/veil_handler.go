package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/caddyconfig/caddyfile"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"github.com/techsavvyash/veil/packages/caddy/internal/config"
	"github.com/techsavvyash/veil/packages/caddy/internal/models"
	"github.com/techsavvyash/veil/packages/caddy/internal/store"

	"go.uber.org/zap"
)

// VeilHandler implements an HTTP handler that validates API subscriptions
type VeilHandler struct {
	DBPath          string             `json:"db_path,omitempty"`
	SubscriptionKey string             `json:"subscription_key,omitempty"`
	Config          *config.VeilConfig `json:"-"`
	store           *store.APIStore
	logger          *zap.Logger
	ctx             caddy.Context
	apisLoaded      bool
	adminAPIReady   bool
}

// CaddyModule returns the Caddy module information.
func (VeilHandler) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.veil_handler",
		New: func() caddy.Module { return new(VeilHandler) },
	}
}

// UnmarshalCaddyfile implements caddyfile.Unmarshaler.
func (h *VeilHandler) UnmarshalCaddyfile(d *caddyfile.Dispenser) error {
	for d.Next() {
		if !d.NextArg() {
			return d.ArgErr()
		}
		h.DBPath = d.Val()

		if !d.NextArg() {
			return d.ArgErr()
		}
		h.SubscriptionKey = d.Val()
	}
	return nil
}

func (h *VeilHandler) Start() error {
	h.logger = h.ctx.Logger().Named("veil_handler")

	h.waitForAdminAPI()
	return nil
}

// Provision implements caddy.Provisioner.
func (h *VeilHandler) Provision(ctx caddy.Context) error {
	h.logger = ctx.Logger().Named("veil_handler")
	h.ctx = ctx

	// Initialize config
	h.Config = &config.VeilConfig{
		DBPath: h.DBPath,
	}

	if err := h.Config.Provision(ctx); err != nil {
		return fmt.Errorf("failed to provision config: %v", err)
	}

	h.store = store.NewAPIStore(h.Config.GetDB())

	// Run database migrations
	if err := h.store.AutoMigrate(); err != nil {
		return fmt.Errorf("failed to run database migrations: %v", err)
	}

	h.logger.Info("VeilHandler provisioned successfully",
		zap.String("db_path", h.DBPath))

	return nil
}

// waitForAdminAPI waits for the admin API to be available before loading APIs
func (h *VeilHandler) waitForAdminAPI() {
	// Start a goroutine to wait for admin module readiness
	go func() {
		h.logger.Info("waiting for admin module to become available")

		// Wait for admin module to be loaded
		for !h.adminAPIReady {
			// Check if admin module is loaded by checking if it exists in the loaded modules
			modules := h.ctx.Modules()
			h.logger.Debug("loaded modules", zap.Any("modules", modules))
			if _, err := h.ctx.App("admin"); err == nil {
				h.adminAPIReady = true
				h.logger.Info("admin module is available, loading existing APIs")

				// Load APIs if not already loaded
				if !h.apisLoaded {
					if err := h.loadAPIs(); err != nil {
						h.logger.Error("failed to load APIs from database",
							zap.Error(err))
					} else {
						h.logger.Info("successfully loaded APIs from database")
					}
					h.apisLoaded = true
				}
				return
			}

			h.logger.Debug("admin module not ready, waiting...")
			time.Sleep(time.Second)
		}
	}()
}

// loadAPIs loads APIs from the database for this handler
func (h *VeilHandler) loadAPIs() error {
	h.logger.Info("starting to load APIs from database",
		zap.String("db_path", h.DBPath))

	apis, err := h.store.ListAPIs()
	if err != nil {
		return fmt.Errorf("failed to list APIs: %v", err)
	}

	h.logger.Info("found existing APIs in database",
		zap.Int("count", len(apis)),
		zap.String("db_path", h.DBPath))

	successCount := 0
	failureCount := 0

	// Update routes for each API
	for _, api := range apis {
		h.logger.Info("attempting to configure API route",
			zap.String("path", api.Path),
			zap.String("upstream", api.Upstream),
			zap.String("subscription", api.RequiredSubscription),
			zap.Int("api_keys_count", len(api.APIKeys)),
			zap.Int("methods_count", len(api.Methods)))

		if err := h.updateCaddyfile(&api); err != nil {
			h.logger.Error("failed to configure API route",
				zap.Error(err),
				zap.String("path", api.Path),
				zap.String("upstream", api.Upstream))
			failureCount++
			continue
		}

		h.logger.Info("successfully configured API route",
			zap.String("path", api.Path),
			zap.String("upstream", api.Upstream),
			zap.String("subscription", api.RequiredSubscription))
		successCount++
	}

	h.logger.Info("completed loading APIs",
		zap.Int("total_apis", len(apis)),
		zap.Int("success_count", successCount),
		zap.Int("failure_count", failureCount))

	return nil
}

// Stop implements caddy.App.
func (h *VeilHandler) Stop() error {
	return nil
}

// updateCaddyfile updates the Caddy configuration with new API routes
func (h *VeilHandler) updateCaddyfile(config *models.APIConfig) error {
	h.logger.Debug("updating Caddy configuration",
		zap.String("path", config.Path),
		zap.String("upstream", config.Upstream))

	// Create a new route for the API
	newRoute := map[string]interface{}{
		"group": "group4",
		"match": []map[string]interface{}{
			{
				"path": []string{config.Path},
			},
		},
		"handle": []map[string]interface{}{
			{
				"handler":          "veil_handler",
				"db_path":          h.DBPath,
				"subscription_key": h.SubscriptionKey,
			},
			{
				"handler": "reverse_proxy",
				"upstreams": []map[string]interface{}{
					{
						"dial": strings.TrimPrefix(config.Upstream, "http://"),
					},
				},
			},
		},
	}

	// Get the current config via admin API
	resp, err := http.Get("http://localhost:2019/config/")
	if err != nil {
		return fmt.Errorf("failed to get current config: %v", err)
	}
	defer resp.Body.Close()

	var currentConfig map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&currentConfig); err != nil {
		return fmt.Errorf("failed to decode current config: %v", err)
	}

	// Extract the apps.http section
	apps, ok := currentConfig["apps"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("apps section not found in config")
	}

	httpApp, ok := apps["http"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("http app not found in config")
	}

	servers, ok := httpApp["servers"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("servers section not found in config")
	}

	// Find the server listening on port 2020
	srv2020, ok := servers["srv0"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("server srv0 not found in config")
	}

	// Get the current routes
	routes, ok := srv2020["routes"].([]interface{})
	if !ok {
		routes = make([]interface{}, 0)
	}

	// Add the new route before the management API route
	var newRoutes []interface{}
	managementRouteFound := false

	for _, r := range routes {
		route, ok := r.(map[string]interface{})
		if !ok {
			continue
		}

		match, ok := route["match"].([]interface{})
		if !ok || len(match) == 0 {
			continue
		}

		matcher, ok := match[0].(map[string]interface{})
		if !ok {
			continue
		}

		paths, ok := matcher["path"].([]interface{})
		if !ok || len(paths) == 0 {
			continue
		}

		path, ok := paths[0].(string)
		if !ok {
			continue
		}

		if !managementRouteFound && strings.Contains(path, "/veil/api/") {
			newRoutes = append(newRoutes, newRoute)
			managementRouteFound = true
		}
		newRoutes = append(newRoutes, r)
	}

	// If management route wasn't found, append at the end
	if !managementRouteFound {
		newRoutes = append(newRoutes, newRoute)
	}

	// Update the routes in the config
	srv2020["routes"] = newRoutes

	// Save the updated config to a file
	if err := h.saveCaddyfile(currentConfig); err != nil {
		h.logger.Error("failed to save Caddy configuration",
			zap.Error(err))
		// Don't fail the update for file save failure
	}

	// Send the updated config back to Caddy
	jsonConfig, err := json.Marshal(currentConfig)
	if err != nil {
		return fmt.Errorf("failed to marshal updated config: %v", err)
	}

	req, err := http.NewRequest(http.MethodPost, "http://localhost:2019/load", bytes.NewReader(jsonConfig))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send updated config: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to update config: %s", body)
	}

	h.logger.Info("updated Caddy configuration with new API route",
		zap.String("path", config.Path),
		zap.String("upstream", config.Upstream))

	return nil
}

// Validate implements caddy.Validator.
func (h *VeilHandler) Validate() error {
	if h.DBPath == "" {
		return fmt.Errorf("db_path is required")
	}
	if h.SubscriptionKey == "" {
		return fmt.Errorf("subscription_key header name is required")
	}
	return nil
}

// saveCaddyfile saves the current Caddy configuration to a file
func (h *VeilHandler) saveCaddyfile(config map[string]interface{}) error {
	// Create configs directory if it doesn't exist
	configDir := "configs"
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("failed to create configs directory: %v", err)
	}

	// Save the config to a file with timestamp
	timestamp := time.Now().Format("20060102-150405")
	configPath := fmt.Sprintf("%s/caddy-config-%s.json", configDir, timestamp)

	jsonConfig, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %v", err)
	}

	if err := os.WriteFile(configPath, jsonConfig, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %v", err)
	}

	h.logger.Info("saved Caddy configuration",
		zap.String("path", configPath))

	return nil
}

// ServeHTTP implements caddyhttp.MiddlewareHandler.
func (h *VeilHandler) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) error {
	path := r.URL.Path

	h.logger.Info("handling request",
		zap.String("path", path),
		zap.String("method", r.Method),
		zap.String("api_key", r.Header.Get("X-API-Key")),
		zap.String("subscription", r.Header.Get(h.SubscriptionKey)))

	// Handle management API
	if strings.HasPrefix(path, "/onboard") || strings.HasPrefix(path, "/veil/api/onboard") {
		if r.Method != http.MethodPost {
			h.logger.Warn("method not allowed for onboarding API",
				zap.String("method", r.Method))
			return caddyhttp.Error(http.StatusMethodNotAllowed, fmt.Errorf("method not allowed"))
		}

		var req models.APIOnboardRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			h.logger.Error("failed to decode onboarding request body",
				zap.Error(err))
			return caddyhttp.Error(http.StatusBadRequest, err)
		}

		h.logger.Info("attempting to onboard new API",
			zap.String("path", req.Path),
			zap.String("upstream", req.Upstream),
			zap.String("subscription", req.RequiredSubscription),
			zap.Int("api_keys", len(req.APIKeys)),
			zap.Strings("methods", req.Methods),
			zap.Strings("required_headers", req.RequiredHeaders))

		// Validate required fields
		if req.Path == "" || req.Upstream == "" || req.RequiredSubscription == "" {
			h.logger.Warn("missing required fields in onboarding request",
				zap.String("path", req.Path),
				zap.String("upstream", req.Upstream),
				zap.String("subscription", req.RequiredSubscription))
			return caddyhttp.Error(http.StatusBadRequest,
				fmt.Errorf("path, upstream, and required_subscription are required"))
		}

		config := &models.APIConfig{
			Path:                 req.Path,
			Upstream:             req.Upstream,
			RequiredSubscription: req.RequiredSubscription,
			RequiredHeaders:      req.RequiredHeaders,
		}

		// Create API methods
		for _, method := range req.Methods {
			config.Methods = append(config.Methods, models.APIMethod{
				Method: method,
			})
		}

		// Create API parameters
		config.Parameters = req.Parameters

		// Create API keys
		config.APIKeys = req.APIKeys

		h.logger.Info("storing API configuration in database",
			zap.String("path", config.Path))

		// Store in database
		if err := h.store.CreateAPI(config); err != nil {
			h.logger.Error("failed to store API in database",
				zap.Error(err),
				zap.String("path", req.Path))
			return caddyhttp.Error(http.StatusInternalServerError,
				fmt.Errorf("failed to create API: %v", err))
		}

		h.logger.Info("updating Caddy configuration for new API",
			zap.String("path", config.Path))

		// Update Caddy configuration via admin API
		if err := h.updateCaddyfile(config); err != nil {
			h.logger.Error("failed to update Caddy configuration",
				zap.Error(err),
				zap.String("path", req.Path))
			return caddyhttp.Error(http.StatusInternalServerError,
				fmt.Errorf("failed to update Caddy configuration: %v", err))
		}

		h.logger.Info("API onboarded successfully",
			zap.String("path", req.Path),
			zap.String("upstream", req.Upstream),
			zap.String("subscription", req.RequiredSubscription),
			zap.Int("api_keys", len(req.APIKeys)))

		response := models.APIOnboardResponse{
			Status:  "success",
			Message: "API onboarded successfully",
			API:     *config,
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			h.logger.Error("failed to encode response",
				zap.Error(err))
			return caddyhttp.Error(http.StatusInternalServerError, err)
		}
		return nil
	}

	// Get API configuration for the requested path
	apiConfig, err := h.store.GetAPIByPath(path)
	if err != nil {
		h.logger.Error("failed to get API config",
			zap.Error(err),
			zap.String("path", path))
		return caddyhttp.Error(http.StatusInternalServerError, err)
	}
	if apiConfig == nil {
		h.logger.Debug("no API config found for path",
			zap.String("path", path))
		return next.ServeHTTP(w, r)
	}

	h.logger.Debug("found API config",
		zap.String("path", apiConfig.Path),
		zap.String("subscription", apiConfig.RequiredSubscription),
		zap.Int("api_keys", len(apiConfig.APIKeys)),
		zap.Any("api_keys_detail", apiConfig.APIKeys))

	// Validate API key
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		h.logger.Warn("missing API key",
			zap.String("path", path))
		return caddyhttp.Error(http.StatusUnauthorized,
			fmt.Errorf("API key is required"))
	}

	isValidKey := h.store.ValidateAPIKey(apiConfig, apiKey)
	h.logger.Debug("API key validation result",
		zap.String("path", path),
		zap.String("api_key", apiKey),
		zap.Bool("is_valid", isValidKey))

	if !isValidKey {
		h.logger.Warn("invalid API key",
			zap.String("path", path),
			zap.String("api_key", apiKey))
		return caddyhttp.Error(http.StatusUnauthorized,
			fmt.Errorf("invalid API key"))
	}

	// Validate subscription
	subscriptionKey := r.Header.Get(h.SubscriptionKey)
	if subscriptionKey == "" {
		h.logger.Warn("missing subscription key",
			zap.String("path", path))
		return caddyhttp.Error(http.StatusUnauthorized,
			fmt.Errorf("subscription key is required"))
	}

	h.logger.Debug("validating subscription",
		zap.String("provided", subscriptionKey),
		zap.String("required", apiConfig.RequiredSubscription))

	if !strings.EqualFold(subscriptionKey, apiConfig.RequiredSubscription) {
		h.logger.Warn("invalid subscription level",
			zap.String("path", path),
			zap.String("provided", subscriptionKey),
			zap.String("required", apiConfig.RequiredSubscription))
		return caddyhttp.Error(http.StatusForbidden,
			fmt.Errorf("invalid subscription level"))
	}

	// Validate required headers
	for _, header := range apiConfig.RequiredHeaders {
		if r.Header.Get(header) == "" {
			h.logger.Warn("missing required header",
				zap.String("path", path),
				zap.String("header", header))
			return caddyhttp.Error(http.StatusBadRequest,
				fmt.Errorf("missing required header: %s", header))
		}
	}

	// Update API stats
	if err := h.store.UpdateAPIStats(path); err != nil {
		h.logger.Error("failed to update API stats",
			zap.Error(err),
			zap.String("path", path))
		// Don't fail the request for stats update failure
	}

	h.logger.Debug("request authorized",
		zap.String("path", path),
		zap.String("method", r.Method),
		zap.String("api_key", apiKey),
		zap.String("subscription", subscriptionKey))

	return next.ServeHTTP(w, r)
}

// Interface guards ensure that VeilHandler implements the required interfaces.
var (
	_ caddy.Provisioner           = (*VeilHandler)(nil) // Ensures VeilHandler can be provisioned
	_ caddy.Validator             = (*VeilHandler)(nil) // Ensures VeilHandler can validate its configuration
	_ caddyfile.Unmarshaler       = (*VeilHandler)(nil) // Ensures VeilHandler can unmarshal from Caddyfile
	_ caddyhttp.MiddlewareHandler = (*VeilHandler)(nil) // Ensures VeilHandler can serve as a middleware handler
	_ caddy.App                   = (*VeilHandler)(nil) // Ensures VeilHandler can serve as a Caddy app
)
