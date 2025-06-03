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
	"github.com/caddyserver/caddy/v2/caddyconfig/caddyfile"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"github.com/try-veil/veil/packages/caddy/internal/config"
	"github.com/try-veil/veil/packages/caddy/internal/dto"
	"github.com/try-veil/veil/packages/caddy/internal/models"
	"github.com/try-veil/veil/packages/caddy/internal/store"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// VeilHandler implements an HTTP handler that validates API subscriptions
type VeilHandler struct {
	DBPath          string             `json:"db_path,omitempty"`
	SubscriptionKey string             `json:"subscription_key,omitempty"`
	Config          *config.VeilConfig `json:"-"`
	store           *store.APIStore
	logger          *zap.Logger
	ctx             caddy.Context
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
		if key.Key == apiKey && *key.IsActive {
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

	// Create a rewrite configuration to strip the API path prefix
	// Remove any wildcards from the path for the rewrite pattern
	apiPathForRewrite := strings.TrimSuffix(strings.TrimSuffix(api.Path, "*"), "/")

	// Simply extract the last path segment
	pathParts := strings.Split(apiPathForRewrite, "/")
	var lastSegment string
	if len(pathParts) > 0 {
		lastSegment = pathParts[len(pathParts)-1]
	}

	h.logger.Debug("generating rewrite pattern",
		zap.String("original_path", api.Path),
		zap.String("rewrite_path", apiPathForRewrite),
		zap.String("last_segment", lastSegment))

	// Create a rewrite rule with a direct replacement without capture groups
	rewriteConfig := fmt.Sprintf(`"rewrite": {
		"method": "GET",
		"path_regexp": [
			{
				"find": "^%s",
				"replace": "/%s"
			}
		]
	},`, apiPathForRewrite, lastSegment)

	// Get the list of methods from the API config
	methodsList := []string{}
	for _, method := range api.Methods {
		methodsList = append(methodsList, fmt.Sprintf(`"%s"`, method.Method))
	}

	// If no methods are defined, default to supporting all common methods
	if len(methodsList) == 0 {
		methodsList = []string{`"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, `"PATCH"`}
	}

	methodsJSON := strings.Join(methodsList, ", ")

	// Ensure path ends with a wildcard for matching
	apiPathForMatching := api.Path
	if !strings.HasSuffix(apiPathForMatching, "*") {
		if strings.HasSuffix(apiPathForMatching, "/") {
			apiPathForMatching = apiPathForMatching + "*"
		} else {
			apiPathForMatching = apiPathForMatching + "*"
		}
	}

	h.logger.Debug("configuring path patterns",
		zap.String("original_path", api.Path),
		zap.String("matching_path", apiPathForMatching),
		zap.String("rewrite_path", apiPathForRewrite))

	// Create the new route JSON
	newRouteJSON := fmt.Sprintf(`{
		"match": [
			{
				"method": [%s],
				"path": ["%s"]
			}
		],
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
	}`, methodsJSON, apiPathForMatching, transportConfig, rewriteConfig, h.getUpstreamDialAddress(api.Upstream), h.getUpstreamHost(api.Upstream))

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

	// Get srv1 (onboarded APIs server)
	srv1, ok := servers["srv1"].(map[string]interface{})
	if !ok {
		h.logger.Error("srv1 not found in config")
		return fmt.Errorf("srv1 not found in config")
	}

	// Get the routes array
	routes, ok := srv1["routes"].([]interface{})
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

		// Check if path with or without wildcard exists
		if path, ok := paths[0].(string); ok {
			// Strip wildcard for comparison
			pathWithoutWildcard := strings.TrimSuffix(path, "*")
			apiPathWithoutWildcard := strings.TrimSuffix(api.Path, "*")

			if pathWithoutWildcard == apiPathWithoutWildcard {
				// Replace the existing route
				routes[i] = newRoute
				routeExists = true
				break
			}
		}
	}

	// If route doesn't exist, append it
	if !routeExists {
		routes = append(routes, newRoute)
	}

	// Update the routes in the config
	srv1["routes"] = routes
	servers["srv1"] = srv1
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

	// Get or create management API server (srv0) - Port 2020
	if _, ok := httpApp.Servers["srv0"]; !ok {
		httpApp.Servers["srv0"] = &caddyhttp.Server{
			Listen: []string{":2020"},
			Routes: []caddyhttp.Route{},
		}
	}

	// Get or create onboarded APIs server (srv1) - Port 2021
	if _, ok := httpApp.Servers["srv1"]; !ok {
		httpApp.Servers["srv1"] = &caddyhttp.Server{
			Listen: []string{":2021"},
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
		return dialAddr
	}

	return dialAddr
}

// getUpstreamHost returns the host part of the given upstream URL
func (h *VeilHandler) getUpstreamHost(upstream string) string {
	upstreamURL, err := url.Parse(upstream)
	if err != nil {
		return ""
	}

	// Return just the hostname for HTTPS URLs
	if upstreamURL.Scheme == "https" {
		return upstreamURL.Hostname()
	}

	// For other schemes, return the full host (including port if specified)
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
	pathSegments := strings.Split(r.URL.Path, "/")

	// Clean up the path segments by removing empty strings
	var cleanSegments []string
	for _, seg := range pathSegments {
		if seg != "" {
			cleanSegments = append(cleanSegments, seg)
		}
	}

	// Basic format should be /veil/api/{resource}
	if len(cleanSegments) < 3 {
		http.Error(w, "Invalid API path", http.StatusNotFound)
		return nil
	}

	// Get the resource type (routes, keys, etc.)
	resource := cleanSegments[2]

	switch resource {
	case "routes":
		// Handle API routes: /veil/api/routes or /veil/api/routes/{id}
		println("Values : ======================",w,r)
		return h.handleOnboard(w, r)
	case "keys":
		// Check if this is a status update request
		if len(cleanSegments) > 3 && cleanSegments[3] == "status" {
			// Handle status update: /veil/api/keys/status
			return h.handleUpdateAPIKeyStatus(w, r)
		}
		// Handle API keys: /veil/api/keys
		return h.handleAddAPIKeys(w, r)
	default:
		http.Error(w, "Resource not found", http.StatusNotFound)
		return nil
	}
}

// handleOnboard handles the API onboarding endpoint
func (h *VeilHandler) handleOnboard(w http.ResponseWriter, r *http.Request) error {
	h.logger.Info("handling API onboarding request",
		zap.String("method", r.Method),
		zap.String("path", r.URL.Path))

	// Parse path segments
	pathSegments := strings.Split(r.URL.Path, "/")

	// Clean up the path segments by removing empty strings
	var cleanSegments []string
	for _, seg := range pathSegments {
		if seg != "" {
			cleanSegments = append(cleanSegments, seg)
		}
	}

	// Check if this is an operation on a specific API
	var apiID string
	if len(cleanSegments) > 3 {
		apiID = cleanSegments[3]
		h.logger.Debug("operation on specific API",
			zap.String("api_id", apiID))
	}

	// Handle HTTP method
	if r.Method != http.MethodPost && r.Method != http.MethodPut && r.Method != http.MethodPatch && r.Method != http.MethodDelete {
		h.logger.Warn("method not allowed",
			zap.String("method", r.Method))
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return nil
	}

	// For DELETE requests, we need an API ID
	if r.Method == http.MethodDelete {
		if apiID == "" {
			h.logger.Warn("API ID required for DELETE")
			http.Error(w, "API ID required for DELETE", http.StatusBadRequest)
			return nil
		}
		return h.handleDeleteAPI(w, r, apiID)
	}

	// Read and log the request body
	requestBody, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Error("failed to read request body",
			zap.Error(err))
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return nil
	}

	// Log the request body
	h.logger.Debug("received request body",
		zap.String("body", string(requestBody)))

	// Reset request body for later reading
	r.Body = io.NopCloser(bytes.NewBuffer(requestBody))

	// For POST, PUT, PATCH we need to decode the request body
	var req dto.APIOnboardRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("failed to decode request body",
			zap.Error(err),
			zap.String("body", string(requestBody)))
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return nil
	}

	// Log the parsed DTO
	h.logger.Debug("parsed request DTO",
		zap.String("path", req.Path),
		zap.String("upstream", req.Upstream),
		zap.Any("methods", req.Methods),
		zap.Any("required_headers", req.RequiredHeaders),
		zap.Any("parameters", req.Parameters),
		zap.Int("api_keys_count", len(req.APIKeys)))

	// Validate required fields
	if req.Path == "" || req.Upstream == "" {
		h.logger.Warn("missing required fields",
			zap.String("path", req.Path),
			zap.String("upstream", req.Upstream))
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

	// Create API parameters
	for _, param := range req.Parameters {
		config.Parameters = append(config.Parameters, models.APIParameter{
			Name:     param.Name,
			Type:     param.Type,
			Required: param.Required,
		})
	}


	// Create API keys
	for _, key := range req.APIKeys {
		isActive := true
		if key.IsActive != nil{
			isActive = *key.IsActive
		}
		config.APIKeys = append(config.APIKeys, models.APIKey{
			Key:      key.Key,
			Name:     key.Name,
			IsActive: &isActive,
		})
	}

	h.logger.Debug("created API config object",
		zap.String("path", config.Path),
		zap.String("upstream", config.Upstream),
		zap.Int("methods_count", len(config.Methods)),
		zap.Int("parameters_count", len(config.Parameters)),
		zap.Int("api_keys_count", len(config.APIKeys)))

	// For PATCH/PUT requests with an API ID, update existing API
	if (r.Method == http.MethodPatch || r.Method == http.MethodPut) && apiID != "" {
		h.logger.Info("updating existing API",
			zap.String("api_id", apiID))
		return h.handleUpdateAPI(w, r, apiID, config)
	}

	// Store in database
	h.logger.Info("storing API config in database")

	existingConfig, _ := h.store.GetAPIByPath(config.Path)
	
	if existingConfig == nil{
		err = h.store.CreateAPI(config)
		
		h.logger.Error("failed to store API config",
			zap.Error(err),
			zap.String("db_path", h.DBPath),
			zap.String("api_path", config.Path),
			zap.String("error_details", err.Error()))

		// Check for specific errors
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, "API path already exists", http.StatusConflict)
			return nil
		}

		http.Error(w, "Failed to store API configuration: "+err.Error(), http.StatusInternalServerError)
		return nil
	}

	// Update Caddy configuration
	h.logger.Info("updating Caddy configuration")
	if err := h.updateCaddyfile(*config); err != nil {
		h.logger.Error("failed to update Caddy config",
			zap.Error(err),
			zap.String("api_path", config.Path),
			zap.String("upstream", config.Upstream),
			zap.String("error_details", err.Error()))
		http.Error(w, "Failed to update Caddy configuration: "+err.Error(), http.StatusInternalServerError)
		return nil
	}

	h.logger.Info("API onboarded successfully",
		zap.String("path", config.Path),
		zap.String("upstream", config.Upstream))

	// Return success response with 201 Created status
	w.WriteHeader(http.StatusCreated)
	return json.NewEncoder(w).Encode(dto.APIResponseDTO{
		Status:  "success",
		Message: "API onboarded successfully",
		API:     config,
	})
}

// handleUpdateAPI handles updating an existing API
func (h *VeilHandler) handleUpdateAPI(w http.ResponseWriter, r *http.Request, apiID string, newConfig *models.APIConfig) error {
	// Get existing API to verify it exists
	if _, err := h.store.GetAPIByPath(newConfig.Path); err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "API not found", http.StatusNotFound)
			return nil
		}
		h.logger.Error("failed to get API",
			zap.Error(err))
		http.Error(w, "Failed to get API", http.StatusInternalServerError)
		return nil
	}

	// Update API in database
	if err := h.store.UpdateAPI(newConfig); err != nil {
		h.logger.Error("failed to update API",
			zap.Error(err))
		http.Error(w, "Failed to update API", http.StatusInternalServerError)
		return nil
	}

	// Update Caddy configuration
	if err := h.updateCaddyfile(*newConfig); err != nil {
		h.logger.Error("failed to update Caddy config",
			zap.Error(err))
		http.Error(w, "Failed to update Caddy configuration", http.StatusInternalServerError)
		return nil
	}

	w.WriteHeader(http.StatusCreated)
	return json.NewEncoder(w).Encode(dto.APIResponseDTO{
		Status:  "success",
		Message: "API updated successfully",
		API:     newConfig,
	})
}

// handleDeleteAPI handles deleting an API
func (h *VeilHandler) handleDeleteAPI(w http.ResponseWriter, r *http.Request, apiID string) error {
	// Get API to delete
	api, err := h.store.GetAPIByPath(apiID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "API not found", http.StatusNotFound)
			return nil
		}
		h.logger.Error("failed to get API",
			zap.Error(err))
		http.Error(w, "Failed to get API", http.StatusInternalServerError)
		return nil
	}

	// Delete API from database
	if err := h.store.DeleteAPI(api.Path); err != nil {
		h.logger.Error("failed to delete API",
			zap.Error(err))
		http.Error(w, "Failed to delete API", http.StatusInternalServerError)
		return nil
	}

	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(dto.APIResponseDTO{
		Status:  "success",
		Message: "API deleted successfully",
	})
}

// handleAddAPIKeys handles adding new API keys to an existing API
func (h *VeilHandler) handleAddAPIKeys(w http.ResponseWriter, r *http.Request) error {
	// Support both POST and PUT for better RESTful API design
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return nil
	}

	var req dto.APIKeysRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("failed to decode request body",
			zap.Error(err))
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return nil
	}

	// Validate required fields
	if req.Path == "" || len(req.APIKeys) == 0 {
		http.Error(w, "Path and at least one API key are required", http.StatusBadRequest)
		return nil
	}

	// Convert request keys to model keys
	newKeys := make([]models.APIKey, len(req.APIKeys))
	for i, key := range req.APIKeys {
		newKeys[i] = models.APIKey{
			Key:      key.Key,
			Name:     key.Name,
			IsActive: key.IsActive,
		}
	}

	// Add new keys
	if err := h.store.AddAPIKeys(req.Path, newKeys); err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "API not found", http.StatusNotFound)
			return nil
		}
		h.logger.Error("failed to add API keys",
			zap.Error(err))
		http.Error(w, "Failed to add API keys", http.StatusInternalServerError)
		return nil
	}

	// Get updated API config for response
	api, err := h.store.GetAPIWithKeys(req.Path)
	if err != nil {
		h.logger.Error("failed to get updated API config",
			zap.Error(err))
		http.Error(w, "Failed to get updated API configuration", http.StatusInternalServerError)
		return nil
	}

	// Return success response with 201 Created status
	w.WriteHeader(http.StatusCreated)
	return json.NewEncoder(w).Encode(dto.APIResponseDTO{
		Status:  "success",
		Message: "API keys added successfully",
		API:     api,
	})
}

// handleUpdateAPIKeyStatus handles updating the active status of an API key
func (h *VeilHandler) handleUpdateAPIKeyStatus(w http.ResponseWriter, r *http.Request) error {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return nil
	}

	var req dto.APIKeyStatusRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("failed to decode request body",
			zap.Error(err))
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return nil
	}

	// Validate required fields
	if req.Path == "" || req.APIKey == "" {
		http.Error(w, "Path and API key are required", http.StatusBadRequest)
		return nil
	}

	// Update key status
	if err := h.store.UpdateAPIKeyStatus(req.Path, req.APIKey, req.IsActive); err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "API not found", http.StatusNotFound)
			return nil
		}
		if err.Error() == "API key not found" {
			http.Error(w, "API key not found", http.StatusNotFound)
			return nil
		}
		h.logger.Error("failed to update API key status",
			zap.Error(err))
		http.Error(w, "Failed to update API key status", http.StatusInternalServerError)
		return nil
	}

	// Get updated API config for response
	api, err := h.store.GetAPIWithKeys(req.Path)
	if err != nil {
		h.logger.Error("failed to get updated API config",
			zap.Error(err))
		http.Error(w, "Failed to get updated API configuration", http.StatusInternalServerError)
		return nil
	}

	// Return success response
	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(dto.APIResponseDTO{
		Status:  "success",
		Message: "API key status updated successfully",
		API:     api,
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
