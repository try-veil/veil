package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
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

		if err := h.updateCaddyfile(api); err != nil {
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

// validateAPIKey checks if the provided API key is valid for the given path
func (h *VeilHandler) validateAPIKey(path string, apiKey string) (*models.APIConfig, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("no API key provided")
	}

	api, err := h.store.GetAPIByPath(path)
	if err != nil {
		return nil, fmt.Errorf("failed to get API config: %v", err)
	}

	// Check if API exists and is active
	if api == nil {
		return nil, fmt.Errorf("API not found for path: %s", path)
	}

	// Validate API key
	valid := false
	for _, key := range api.APIKeys {
		if key.Key == apiKey && key.IsActive {
			valid = true
			break
		}
	}

	if !valid {
		return nil, fmt.Errorf("invalid API key")
	}

	return api, nil
}

// updateCaddyfile updates the Caddy configuration with new API routes
func (h *VeilHandler) updateCaddyfile(api models.APIConfig) error {
	// Get current configuration
	currentConfig, err := h.getCurrentConfig()
	if err != nil {
		h.logger.Error("failed to get current config",
			zap.Error(err))
		return fmt.Errorf("failed to get current config: %v", err)
	}

	// Parse upstream URL to get scheme
	upstreamURL, err := url.Parse(api.Upstream)
	if err != nil {
		h.logger.Error("failed to parse upstream URL",
			zap.Error(err))
		return fmt.Errorf("failed to parse upstream URL: %v", err)
	}

	// Create transport config based on scheme
	var transportConfig string
	if upstreamURL.Scheme == "https" {
		transportConfig = `"transport": {
			"protocol": "http",
			"tls": {
				"insecure_skip_verify": true
			}
		},`
	} else {
		transportConfig = `"transport": {
			"protocol": "http"
		},`
	}

	// Create the new route JSON
	newRouteJSON := fmt.Sprintf(`{
		"match": [{"path": ["%s"]}],
		"handle": [
			{
				"handler": "subroute",
				"routes": [
					{
						"handle": [
							{
								"handler": "veil_handler",
								"db_path": "./veil.db",
								"subscription_key": "X-Subscription-Key"
							},
							{
								"handler": "reverse_proxy",
								%s
								"upstreams": [{"dial": "%s"}],
								"headers": {
									"request": {
										"set": {
											"Host": ["%s"]
										}
									}
								}
							}
						]
					}
				]
			}
		],
		"terminal": true
	}`, api.Path, transportConfig, h.getUpstreamDialAddress(api.Upstream), h.getUpstreamHost(api.Upstream))

	var newRoute map[string]interface{}
	if err := json.Unmarshal([]byte(newRouteJSON), &newRoute); err != nil {
		h.logger.Error("failed to unmarshal new route",
			zap.Error(err))
		return fmt.Errorf("failed to unmarshal new route: %v", err)
	}

	// Get the current config as a map
	var currentConfigMap map[string]interface{}
	configBytes, err := json.Marshal(currentConfig)
	if err != nil {
		h.logger.Error("failed to marshal current config",
			zap.Error(err))
		return fmt.Errorf("failed to marshal current config: %v", err)
	}

	if err := json.Unmarshal(configBytes, &currentConfigMap); err != nil {
		h.logger.Error("failed to unmarshal current config",
			zap.Error(err))
		return fmt.Errorf("failed to unmarshal current config: %v", err)
	}

	// Get the apps section
	apps, ok := currentConfigMap["apps"].(map[string]interface{})
	if !ok {
		h.logger.Error("apps section not found in config")
		return fmt.Errorf("apps section not found in config")
	}

	// Get the http app
	httpApp, ok := apps["http"].(map[string]interface{})
	if !ok {
		h.logger.Error("http app not found in config")
		return fmt.Errorf("http app not found in config")
	}

	// Get the servers section
	servers, ok := httpApp["servers"].(map[string]interface{})
	if !ok {
		h.logger.Error("servers section not found in config")
		return fmt.Errorf("servers section not found in config")
	}

	// Get srv0
	srv0, ok := servers["srv0"].(map[string]interface{})
	if !ok {
		h.logger.Error("srv0 not found in config")
		return fmt.Errorf("srv0 not found in config")
	}

	// Get the routes array
	routes, ok := srv0["routes"].([]interface{})
	if !ok {
		routes = make([]interface{}, 0)
	}

	// Find if a route with the same path already exists
	routeExists := false
	for i, route := range routes {
		routeMap, ok := route.(map[string]interface{})
		if !ok {
			continue
		}

		matchers, ok := routeMap["match"].([]interface{})
		if !ok || len(matchers) == 0 {
			continue
		}

		matcher, ok := matchers[0].(map[string]interface{})
		if !ok {
			continue
		}

		paths, ok := matcher["path"].([]interface{})
		if !ok || len(paths) == 0 {
			continue
		}

		if path, ok := paths[0].(string); ok && path == api.Path {
			// Replace the existing route
			routes[i] = newRoute
			routeExists = true
			break
		}
	}

	// If route doesn't exist, append it
	if !routeExists {
		// Find the management API route index
		mgmtRouteIndex := -1
		for i, route := range routes {
			routeMap, ok := route.(map[string]interface{})
			if !ok {
				continue
			}

			matchers, ok := routeMap["match"].([]interface{})
			if !ok || len(matchers) == 0 {
				continue
			}

			matcher, ok := matchers[0].(map[string]interface{})
			if !ok {
				continue
			}

			paths, ok := matcher["path"].([]interface{})
			if !ok || len(paths) == 0 {
				continue
			}

			if path, ok := paths[0].(string); ok && path == "/veil/api/*" {
				mgmtRouteIndex = i
				break
			}
		}

		// Insert the new route after the management route
		if mgmtRouteIndex != -1 {
			// Create a new slice with one more capacity
			newRoutes := make([]interface{}, len(routes)+1)
			// Copy elements up to mgmtRouteIndex+1
			copy(newRoutes, routes[:mgmtRouteIndex+1])
			// Insert new route
			newRoutes[mgmtRouteIndex+1] = newRoute
			// Copy remaining elements
			copy(newRoutes[mgmtRouteIndex+2:], routes[mgmtRouteIndex+1:])
			routes = newRoutes
		} else {
			routes = append(routes, newRoute)
		}
	}

	// Update the routes in the config
	srv0["routes"] = routes
	servers["srv0"] = srv0
	httpApp["servers"] = servers
	apps["http"] = httpApp
	currentConfigMap["apps"] = apps

	// Convert the updated config back to JSON
	updatedConfig, err := json.Marshal(currentConfigMap)
	if err != nil {
		h.logger.Error("failed to marshal updated config",
			zap.Error(err))
		return fmt.Errorf("failed to marshal updated config: %v", err)
	}

	// Pretty print the current config for debugging
	formattedConfig, err := json.MarshalIndent(currentConfigMap, "", "  ")
	if err != nil {
		h.logger.Error("failed to format config for debug",
			zap.Error(err))
	} else {
		h.logger.Debug("updated configuration",
			zap.ByteString("config", formattedConfig))
	}

	// Load the updated config
	if err := caddy.Load(updatedConfig, false); err != nil {
		h.logger.Error("failed to load config",
			zap.Error(err))
		return fmt.Errorf("failed to load config: %v", err)
	}

	h.logger.Info("successfully updated Caddy configuration",
		zap.String("path", api.Path),
		zap.String("upstream", api.Upstream))

	// Save the updated config to a file
	if err := h.saveCaddyfile(currentConfigMap); err != nil {
		h.logger.Error("failed to save updated config",
			zap.Error(err))
		return fmt.Errorf("failed to save updated config: %v", err)
	}

	return nil
}

// getCurrentConfig retrieves the current Caddy config
func (h *VeilHandler) getCurrentConfig() (*caddy.Config, error) {
	resp, err := http.Get("http://localhost:2019/config/")
	if err != nil {
		return nil, fmt.Errorf("failed to get current config: %v", err)
	}
	defer resp.Body.Close()

	var config caddy.Config
	if err := json.NewDecoder(resp.Body).Decode(&config); err != nil {
		return nil, fmt.Errorf("failed to decode current config: %v", err)
	}

	// Initialize HTTP app if it doesn't exist
	if config.AppsRaw == nil {
		config.AppsRaw = make(map[string]json.RawMessage)
	}

	// Get or create HTTP app
	var httpApp struct {
		Servers map[string]*caddyhttp.Server `json:"servers"`
	}

	if rawApp, ok := config.AppsRaw["http"]; ok {
		if err := json.Unmarshal(rawApp, &httpApp); err != nil {
			return nil, fmt.Errorf("failed to unmarshal HTTP app: %v", err)
		}
	}

	// Initialize servers if not present
	if httpApp.Servers == nil {
		httpApp.Servers = make(map[string]*caddyhttp.Server)
	}

	// Get or create default server
	if _, ok := httpApp.Servers["srv0"]; !ok {
		httpApp.Servers["srv0"] = &caddyhttp.Server{
			Listen: []string{":2020"},
			Routes: []caddyhttp.Route{},
		}
	}

	// Update HTTP app in config
	rawApp, err := json.Marshal(httpApp)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal HTTP app: %v", err)
	}
	config.AppsRaw["http"] = rawApp

	return &config, nil
}

// getUpstreamDialAddress returns the dial address for the given upstream URL
func (h *VeilHandler) getUpstreamDialAddress(upstream string) string {
	upstreamURL, err := url.Parse(upstream)
	if err != nil {
		return ""
	}

	// Determine if we need to include port in dial address
	dialAddr := upstreamURL.Host
	if upstreamURL.Port() == "" {
		// No port specified in URL, use default ports
		switch upstreamURL.Scheme {
		case "https":
			dialAddr = upstreamURL.Hostname() + ":443"
		case "http":
			dialAddr = upstreamURL.Hostname() + ":80"
		default:
			return ""
		}
	}

	return dialAddr
}

// getUpstreamHost returns the host part of the given upstream URL
func (h *VeilHandler) getUpstreamHost(upstream string) string {
	upstreamURL, err := url.Parse(upstream)
	if err != nil {
		return ""
	}
	return upstreamURL.Host
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
func (h *VeilHandler) saveCaddyfile(configMap map[string]interface{}) error {
	// Create configs directory if it doesn't exist
	configDir := "configs"
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("failed to create configs directory: %v", err)
	}

	// Save the config to a file with timestamp
	timestamp := time.Now().Format("20060102-150405")
	configPath := fmt.Sprintf("%s/caddy-config-%s.json", configDir, timestamp)

	jsonConfig, err := json.MarshalIndent(configMap, "", "  ")
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
	// Handle management API without validation
	if strings.HasPrefix(r.URL.Path, "/veil/api/") {
		h.logger.Debug("handling management API request",
			zap.String("path", r.URL.Path),
			zap.String("method", r.Method))
		return h.handleManagementAPI(w, r)
	}

	// Extract API key from header
	apiKey := r.Header.Get(h.SubscriptionKey)

	// Validate API key
	api, err := h.validateAPIKey(r.URL.Path, apiKey)
	if err != nil {
		h.logger.Debug("API key validation failed",
			zap.String("path", r.URL.Path),
			zap.Error(err))
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return nil
	}

	// Check if method is allowed
	methodAllowed := false
	for _, method := range api.Methods {
		if method.Method == r.Method {
			methodAllowed = true
			break
		}
	}

	if !methodAllowed {
		h.logger.Debug("method not allowed",
			zap.String("path", r.URL.Path),
			zap.String("method", r.Method))
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return nil
	}

	// Check required headers
	for _, header := range api.RequiredHeaders {
		if r.Header.Get(header) == "" {
			h.logger.Debug("missing required header",
				zap.String("path", r.URL.Path),
				zap.String("header", header))
			http.Error(w, fmt.Sprintf("Missing required header: %s", header), http.StatusBadRequest)
			return nil
		}
	}

	h.logger.Debug("request authorized",
		zap.String("path", r.URL.Path),
		zap.String("method", r.Method))

	return next.ServeHTTP(w, r)
}

// handleManagementAPI handles the management API endpoints
func (h *VeilHandler) handleManagementAPI(w http.ResponseWriter, r *http.Request) error {
	switch {
	case strings.HasSuffix(r.URL.Path, "/onboard"):
		return h.handleOnboard(w, r)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
		return nil
	}
}

// handleOnboard handles the API onboarding endpoint
func (h *VeilHandler) handleOnboard(w http.ResponseWriter, r *http.Request) error {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return nil
	}

	var req models.APIOnboardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("failed to decode request body",
			zap.Error(err))
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return nil
	}

	// Validate required fields
	if req.Path == "" || req.Upstream == "" {
		http.Error(w, "Path and upstream are required", http.StatusBadRequest)
		return nil
	}

	// Create API config
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

	// Create API keys
	for _, key := range req.APIKeys {
		config.APIKeys = append(config.APIKeys, models.APIKey{
			Key:      key.Key,
			Name:     key.Name,
			IsActive: true,
		})
	}

	// Store in database
	if err := h.store.CreateAPI(config); err != nil {
		h.logger.Error("failed to store API config",
			zap.Error(err))
		http.Error(w, "Failed to store API configuration", http.StatusInternalServerError)
		return nil
	}

	// Update Caddy configuration
	if err := h.updateCaddyfile(*config); err != nil {
		h.logger.Error("failed to update Caddy config",
			zap.Error(err))
		http.Error(w, "Failed to update Caddy configuration", http.StatusInternalServerError)
		return nil
	}

	// Return success response
	w.WriteHeader(http.StatusCreated)
	return json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "API onboarded successfully",
		"api":     config,
	})
}

// Interface guards ensure that VeilHandler implements the required interfaces.
var (
	_ caddy.Provisioner           = (*VeilHandler)(nil) // Ensures VeilHandler can be provisioned
	_ caddy.Validator             = (*VeilHandler)(nil) // Ensures VeilHandler can validate its configuration
	_ caddyfile.Unmarshaler       = (*VeilHandler)(nil) // Ensures VeilHandler can unmarshal from Caddyfile
	_ caddyhttp.MiddlewareHandler = (*VeilHandler)(nil) // Ensures VeilHandler can serve as a middleware handler
	_ caddy.App                   = (*VeilHandler)(nil) // Ensures VeilHandler can serve as a Caddy app
)
