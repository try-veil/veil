package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/caddyconfig"
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
func (h *VeilHandler) updateCaddyfile(config *models.APIConfig) error {
	h.logger.Debug("updating Caddy configuration",
		zap.String("path", config.Path),
		zap.String("upstream", config.Upstream))

	// Create handlers chain
	veilHandler := &VeilHandler{
		DBPath:          h.DBPath,
		SubscriptionKey: h.SubscriptionKey,
	}

	h.logger.Debug("creating route configuration")

	// Parse upstream URL to get hostname and scheme
	upstreamURL, err := url.Parse(config.Upstream)
	if err != nil {
		h.logger.Error("failed to parse upstream URL",
			zap.Error(err))
		return fmt.Errorf("failed to parse upstream URL: %v", err)
	}

	h.logger.Debug("creating route configuration",
		zap.String("scheme", upstreamURL.Scheme),
		zap.String("host", upstreamURL.Host))

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
			h.logger.Error("unsupported scheme",
				zap.String("scheme", upstreamURL.Scheme))
			return fmt.Errorf("unsupported scheme: %s", upstreamURL.Scheme)
		}
	}

	// Create the route with raw JSON
	routeJSON := fmt.Sprintf(`{
		"handle": [
			{
				"handler": "subroute",
				"routes": [
					{
						"handle": [
							%s,
							{
								"handler": "reverse_proxy",
								"upstreams": [{
									"dial": "%s"
								}],
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
		"match": [
			{
				"path": ["%s"]
			}
		],
		"terminal": true
	}`,
		caddyconfig.JSONModuleObject(veilHandler, "handler", "veil_handler", nil),
		dialAddr,
		upstreamURL.Host,
		config.Path)

	var route caddyhttp.Route
	if err := json.Unmarshal([]byte(routeJSON), &route); err != nil {
		h.logger.Error("failed to create route",
			zap.Error(err))
		return fmt.Errorf("failed to create route: %v", err)
	}

	h.logger.Debug("route configuration", zap.Any("route", route))

	// Get current config
	currentConfig, err := h.getCurrentConfig()
	if err != nil {
		h.logger.Error("failed to get current config", zap.Error(err))
		return fmt.Errorf("failed to get current config: %v", err)
	}

	h.logger.Debug("updating routes")

	// Update routes
	if err := h.updateRoutes(currentConfig, route); err != nil {
		h.logger.Error("failed to update routes", zap.Error(err))
		return fmt.Errorf("failed to update routes: %v", err)
	}

	h.logger.Debug("applying config")

	// Apply the updated config
	if err := h.applyConfig(currentConfig); err != nil {
		h.logger.Error("failed to apply config", zap.Error(err))
		return fmt.Errorf("failed to apply config: %v", err)
	}

	h.logger.Info("successfully updated Caddy configuration",
		zap.String("path", config.Path),
		zap.String("upstream", config.Upstream))

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

// updateRoutes updates the routes in the config
func (h *VeilHandler) updateRoutes(config *caddy.Config, newRoute caddyhttp.Route) error {
	// Get HTTP app from raw config
	httpAppRaw, ok := config.AppsRaw["http"]
	if !ok {
		return fmt.Errorf("HTTP app not found in config")
	}

	var httpApp struct {
		Servers map[string]*caddyhttp.Server `json:"servers"`
	}

	if err := json.Unmarshal(httpAppRaw, &httpApp); err != nil {
		return fmt.Errorf("failed to unmarshal HTTP app: %v", err)
	}

	// Get server
	server, ok := httpApp.Servers["srv0"]
	if !ok {
		return fmt.Errorf("server srv0 not found")
	}

	// Find the management API route and existing routes
	var managementRoute *caddyhttp.Route
	var existingRoutes []caddyhttp.Route

	for _, route := range server.Routes {
		// Convert route to JSON to check its structure
		routeJSON, err := json.Marshal(route)
		if err != nil {
			h.logger.Debug("failed to marshal route",
				zap.Error(err))
			continue
		}

		var routeMap map[string]interface{}
		if err := json.Unmarshal(routeJSON, &routeMap); err != nil {
			h.logger.Debug("failed to unmarshal route",
				zap.Error(err))
			continue
		}

		// Check if this is a route with path matcher
		if match, ok := routeMap["match"].([]interface{}); ok && len(match) > 0 {
			if matchMap, ok := match[0].(map[string]interface{}); ok {
				if paths, ok := matchMap["path"].([]interface{}); ok && len(paths) > 0 {
					if path, ok := paths[0].(string); ok {
						if path == "/veil/api/*" {
							managementRoute = &route
							continue
						}

						// Check if this is a route we want to replace
						newRouteJSON, _ := json.Marshal(newRoute)
						var newRouteMap map[string]interface{}
						_ = json.Unmarshal(newRouteJSON, &newRouteMap)
						if newMatch, ok := newRouteMap["match"].([]interface{}); ok && len(newMatch) > 0 {
							if newMatchMap, ok := newMatch[0].(map[string]interface{}); ok {
								if newPaths, ok := newMatchMap["path"].([]interface{}); ok && len(newPaths) > 0 {
									if newPath, ok := newPaths[0].(string); ok && path == newPath {
										h.logger.Debug("found existing route to replace",
											zap.String("path", path))
										continue
									}
								}
							}
						}
					}
				}
			}
		}

		existingRoutes = append(existingRoutes, route)
	}

	// Build new routes list
	var newRoutes []caddyhttp.Route

	// Add management route first if it exists
	if managementRoute != nil {
		newRoutes = append(newRoutes, *managementRoute)
	}

	// Add the new route
	newRoutes = append(newRoutes, newRoute)

	// Add other routes that don't have path matchers
	for _, route := range existingRoutes {
		routeJSON, _ := json.Marshal(route)
		var routeMap map[string]interface{}
		_ = json.Unmarshal(routeJSON, &routeMap)

		// Only add routes that don't have path matchers
		if _, ok := routeMap["match"]; !ok {
			newRoutes = append(newRoutes, route)
		}
	}

	// Update server routes
	server.Routes = newRoutes

	// Update the app in config
	newAppRaw, err := json.Marshal(httpApp)
	if err != nil {
		return fmt.Errorf("failed to marshal HTTP app: %v", err)
	}
	config.AppsRaw["http"] = newAppRaw

	return nil
}

// applyConfig applies the updated config to Caddy
func (h *VeilHandler) applyConfig(config *caddy.Config) error {
	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(config); err != nil {
		return fmt.Errorf("failed to encode config: %v", err)
	}

	req, err := http.NewRequest(http.MethodPost, "http://localhost:2019/load", buf)
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to apply config: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to apply config: %s", body)
	}

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
	if err := h.updateCaddyfile(config); err != nil {
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
