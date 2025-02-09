package veil

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/caddyconfig"
	"github.com/caddyserver/caddy/v2/caddyconfig/caddyfile"
	"github.com/caddyserver/caddy/v2/caddyconfig/httpcaddyfile"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp/reverseproxy"
	"github.com/techsavvyash/veil/packages/caddy/internal/config"
	"github.com/techsavvyash/veil/packages/caddy/internal/handlers"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

const (
	// ModuleID is the module ID for registration with Caddy
	ModuleID = "http.handlers.veil_handler"
)

func init() {
	caddy.RegisterModule(handlers.VeilHandler{})
}

// APIParameter represents a parameter configuration for an API
type APIParameter struct {
	gorm.Model
	APIConfigID uint   `json:"api_config_id" gorm:"index"`
	Name        string `json:"name" gorm:"not null"`
	Type        string `json:"type" gorm:"not null"` // query, path, header, body
	Required    bool   `json:"required" gorm:"default:false"`
	Validation  string `json:"validation"` // regex pattern for validation
}

// APIMethod represents allowed HTTP methods for an API
type APIMethod struct {
	gorm.Model
	APIConfigID uint   `json:"api_config_id" gorm:"index"`
	Method      string `json:"method" gorm:"not null"`
}

// APIConfig holds the configuration for a single API route
type APIConfig struct {
	gorm.Model
	Path                 string         `json:"path" gorm:"uniqueIndex;not null"`
	Upstream             string         `json:"upstream" gorm:"not null"`
	RequiredSubscription string         `json:"required_subscription" gorm:"not null"`
	LastAccessed         time.Time      `json:"last_accessed"`
	RequestCount         int64          `json:"request_count" gorm:"default:0"`
	Methods              []APIMethod    `json:"methods" gorm:"foreignKey:APIConfigID"`
	Parameters           []APIParameter `json:"parameters" gorm:"foreignKey:APIConfigID"`
	RequiredHeaders      []string       `json:"required_headers" gorm:"serializer:json"`
}

// APIOnboardRequest represents a request to onboard a new API
type APIOnboardRequest struct {
	Path                 string         `json:"path"`
	Upstream             string         `json:"upstream"`
	RequiredSubscription string         `json:"required_subscription"`
	Methods              []string       `json:"methods"`
	Parameters           []APIParameter `json:"parameters"`
	RequiredHeaders      []string       `json:"required_headers"`
}

// APIOnboardResponse represents the response from API onboarding
type APIOnboardResponse struct {
	Status  string    `json:"status"`
	Message string    `json:"message"`
	API     APIConfig `json:"api"`
}

// Veil implements an HTTP handler that manages dynamic API routing and subscription checks
type Veil struct {
	// APIs holds the configuration for each API route
	APIs []APIConfig `json:"apis,omitempty"`

	// SubscriptionHeader specifies which header contains the subscription information
	SubscriptionHeader string `json:"subscription_header,omitempty"`

	// CaddyfilePath is the path to the Caddyfile to modify
	CaddyfilePath string `json:"caddyfile_path,omitempty"`

	// DBPath is the path to the SQLite database
	DBPath string `json:"db_path,omitempty"`

	// mutex for safe concurrent access to APIs
	mu sync.RWMutex

	logger *zap.Logger
	db     *gorm.DB

	// Function fields for testing
	updateCaddyfile func() error
	reloadCaddy     func() error
}

// CaddyModule returns the Caddy module information.
func (Veil) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  ModuleID,
		New: func() caddy.Module { return new(Veil) },
	}
}

// Provision implements caddy.Provisioner.
func (v *Veil) Provision(ctx caddy.Context) error {
	v.logger = ctx.Logger(v)

	// Set default database path if not specified
	if v.DBPath == "" {
		caddyConfigDir := filepath.Join(caddy.AppDataDir(), "veil")
		if err := os.MkdirAll(caddyConfigDir, 0755); err != nil {
			return fmt.Errorf("failed to create config directory: %v", err)
		}
		v.DBPath = filepath.Join(caddyConfigDir, "veil.db")
	}

	// Set default function implementations
	if v.updateCaddyfile == nil {
		v.updateCaddyfile = v.defaultUpdateCaddyfile
	}
	if v.reloadCaddy == nil {
		v.reloadCaddy = v.defaultReloadCaddy
	}

	// Initialize database
	if err := v.initDB(); err != nil {
		return fmt.Errorf("failed to initialize database: %v", err)
	}

	// Load APIs from database
	if err := v.loadAPIs(); err != nil {
		return fmt.Errorf("failed to load APIs from database: %v", err)
	}

	return nil
}

// initDB initializes the SQLite database
func (v *Veil) initDB() error {
	var err error
	v.db, err = gorm.Open(sqlite.Open(v.DBPath), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to open database: %v", err)
	}

	// Auto migrate the schema
	if err := v.db.AutoMigrate(&APIConfig{}, &APIMethod{}, &APIParameter{}); err != nil {
		return fmt.Errorf("failed to migrate schema: %v", err)
	}

	return nil
}

// loadAPIs loads APIs from the database into memory
func (v *Veil) loadAPIs() error {
	v.mu.Lock()
	defer v.mu.Unlock()

	var apis []APIConfig
	if err := v.db.Preload("Methods").Preload("Parameters").Find(&apis).Error; err != nil {
		return fmt.Errorf("failed to query APIs: %v", err)
	}

	v.APIs = apis
	return nil
}

// Validate implements caddy.Validator.
func (v *Veil) Validate() error {
	if v.SubscriptionHeader == "" {
		return fmt.Errorf("subscription_header cannot be empty")
	}
	return nil
}

// validateRequest validates the incoming request against API configuration
func (v *Veil) validateRequest(r *http.Request, api *APIConfig) error {
	// Validate HTTP method
	methodAllowed := false
	for _, m := range api.Methods {
		if m.Method == r.Method {
			methodAllowed = true
			break
		}
	}
	if !methodAllowed {
		return fmt.Errorf("method %s not allowed", r.Method)
	}

	// Validate required headers
	for _, header := range api.RequiredHeaders {
		if r.Header.Get(header) == "" {
			return fmt.Errorf("missing required header: %s", header)
		}
	}

	// Validate parameters
	for _, param := range api.Parameters {
		var value string
		switch param.Type {
		case "query":
			value = r.URL.Query().Get(param.Name)
			if param.Required && value == "" {
				return fmt.Errorf("missing required query parameter: %s", param.Name)
			}
			if param.Validation != "" && value != "" {
				regex := regexp.MustCompile(param.Validation)
				if !regex.MatchString(value) {
					return fmt.Errorf("invalid query parameter: %s", param.Name)
				}
			}
		case "header":
			value = r.Header.Get(param.Name)
			if param.Required && value == "" {
				return fmt.Errorf("missing required header parameter: %s", param.Name)
			}
			if param.Validation != "" && value != "" {
				regex := regexp.MustCompile(param.Validation)
				if !regex.MatchString(value) {
					return fmt.Errorf("invalid header parameter: %s", param.Name)
				}
			}
		case "path":
			pathRegex := regexp.MustCompile(fmt.Sprintf(`%s/([^/]+)`, api.Path))
			matches := pathRegex.FindStringSubmatch(r.URL.Path)
			if len(matches) > 1 {
				value = matches[1]
			}
			if param.Required && value == "" {
				return fmt.Errorf("missing required path parameter: %s", param.Name)
			}
			if param.Validation != "" && value != "" {
				regex := regexp.MustCompile(param.Validation)
				if !regex.MatchString(value) {
					return fmt.Errorf("invalid path parameter: %s", param.Name)
				}
			}
		}
	}

	return nil
}

// captureResponseWriter is a custom response writer that captures the response
type captureResponseWriter struct {
	http.ResponseWriter
	code    int
	body    []byte
	headers http.Header
	written bool
}

func (w *captureResponseWriter) WriteHeader(code int) {
	if w.written {
		return
	}
	w.code = code
	w.written = true
	w.ResponseWriter.WriteHeader(code)
}

func (w *captureResponseWriter) Write(b []byte) (int, error) {
	if !w.written {
		w.WriteHeader(http.StatusOK)
	}
	w.body = append(w.body, b...)
	return w.ResponseWriter.Write(b)
}

func (w *captureResponseWriter) Header() http.Header {
	if w.headers == nil {
		w.headers = w.ResponseWriter.Header()
	}
	return w.headers
}

// Unwrap returns the underlying ResponseWriter
func (w *captureResponseWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

// ServeHTTP implements caddyhttp.MiddlewareHandler.
func (v *Veil) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) error {
	// Handle Veil management endpoints
	if strings.HasPrefix(r.URL.Path, "/veil/api/") || strings.HasPrefix(r.URL.Path, "/admin/api/") {
		// Extract the endpoint path
		endpoint := strings.TrimPrefix(strings.TrimPrefix(r.URL.Path, "/veil/api"), "/admin/api")

		switch endpoint {
		case "/onboard":
			if r.Method != http.MethodPost {
				w.WriteHeader(http.StatusMethodNotAllowed)
				return fmt.Errorf("method %s not allowed", r.Method)
			}
			return v.handleAPIOnboard(w, r)
		case "/list":
			if r.Method != http.MethodGet {
				w.WriteHeader(http.StatusMethodNotAllowed)
				return fmt.Errorf("method %s not allowed", r.Method)
			}
			return v.handleAPIList(w, r)
		default:
			w.WriteHeader(http.StatusNotFound)
			return fmt.Errorf("endpoint not found")
		}
	}

	v.mu.RLock()
	defer v.mu.RUnlock()

	// Find matching API config
	var matchedAPI *APIConfig
	for _, api := range v.APIs {
		if strings.HasPrefix(r.URL.Path, api.Path) {
			apiCopy := api
			matchedAPI = &apiCopy
			break
		}
	}

	if matchedAPI == nil {
		return next.ServeHTTP(w, r)
	}

	// Validate request against API configuration
	if err := v.validateRequest(r, matchedAPI); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return err
	}

	// Check subscription
	subscription := r.Header.Get(v.SubscriptionHeader)
	if subscription == "" {
		w.WriteHeader(http.StatusUnauthorized)
		return fmt.Errorf("missing subscription header")
	}

	if subscription != matchedAPI.RequiredSubscription {
		w.WriteHeader(http.StatusForbidden)
		return fmt.Errorf("invalid subscription level")
	}

	// Update API usage stats asynchronously
	go v.updateAPIStats(matchedAPI.Path)

	// Parse the upstream URL
	upstreamURL, err := url.Parse(matchedAPI.Upstream)
	if err != nil {
		v.logger.Error("error parsing upstream URL", zap.Error(err))
		w.WriteHeader(http.StatusInternalServerError)
		return fmt.Errorf("proxy configuration error")
	}

	// Update the request URL
	r.URL.Host = upstreamURL.Host
	r.URL.Scheme = upstreamURL.Scheme
	r.Host = upstreamURL.Host

	// Add debug logging
	v.logger.Debug("proxying request",
		zap.String("original_path", r.URL.Path),
		zap.String("api_path", matchedAPI.Path),
		zap.String("upstream", matchedAPI.Upstream),
		zap.String("method", r.Method))

	// Strip the API path prefix to get the actual endpoint path
	r.URL.Path = strings.TrimPrefix(r.URL.Path, matchedAPI.Path)
	if !strings.HasPrefix(r.URL.Path, "/") {
		r.URL.Path = "/" + r.URL.Path
	}

	v.logger.Debug("modified request",
		zap.String("new_path", r.URL.Path),
		zap.String("host", r.Host),
		zap.String("scheme", r.URL.Scheme))

	// Create a custom response writer to capture the response
	crw := &captureResponseWriter{
		ResponseWriter: w,
		headers:        make(http.Header),
	}

	// Pass the request to the next handler (which should be the reverse proxy)
	err = next.ServeHTTP(crw, r)
	if err != nil {
		return err
	}

	// Copy the captured response to the original response writer
	for k, v := range crw.headers {
		w.Header()[k] = v
	}

	// If no status code was set, use 200 OK
	if crw.code == 0 {
		crw.code = http.StatusOK
	}
	w.WriteHeader(crw.code)

	// Write the captured body if it exists
	if crw.body != nil {
		if _, err := w.Write(crw.body); err != nil {
			v.logger.Error("error writing response body", zap.Error(err))
			return fmt.Errorf("error writing response body: %v", err)
		}
	}

	return nil
}

// updateAPIStats updates the API statistics in the database
func (v *Veil) updateAPIStats(path string) {
	now := time.Now()
	if err := v.db.Model(&APIConfig{}).
		Where("path = ?", path).
		Updates(map[string]interface{}{
			"last_accessed": now,
			"request_count": gorm.Expr("request_count + ?", 1),
			"updated_at":    now,
		}).Error; err != nil {
		v.logger.Error("failed to update API stats", zap.Error(err))
	}
}

// handleAPIOnboard handles requests to onboard new APIs
func (v *Veil) handleAPIOnboard(w http.ResponseWriter, r *http.Request) error {
	// Parse request body
	var req APIOnboardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return fmt.Errorf("invalid request body: %v", err)
	}

	// Validate request
	if req.Path == "" || req.Upstream == "" || req.RequiredSubscription == "" {
		w.WriteHeader(http.StatusBadRequest)
		return fmt.Errorf("path, upstream, and required_subscription are required")
	}

	if len(req.Methods) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		return fmt.Errorf("at least one HTTP method must be specified")
	}

	// Begin transaction
	tx := v.db.Begin()
	if tx.Error != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return fmt.Errorf("failed to begin transaction: %v", tx.Error)
	}

	// Check if API already exists
	var api APIConfig
	result := tx.Where("path = ?", req.Path).First(&api)
	isUpdate := result.Error == nil

	if isUpdate {
		// Update existing API
		api.Upstream = req.Upstream
		api.RequiredSubscription = req.RequiredSubscription
		api.RequiredHeaders = req.RequiredHeaders
		if err := tx.Save(&api).Error; err != nil {
			tx.Rollback()
			w.WriteHeader(http.StatusInternalServerError)
			return fmt.Errorf("failed to update API: %v", err)
		}

		// Delete existing methods and parameters
		if err := tx.Where("api_config_id = ?", api.ID).Delete(&APIMethod{}).Error; err != nil {
			tx.Rollback()
			w.WriteHeader(http.StatusInternalServerError)
			return fmt.Errorf("failed to delete existing methods: %v", err)
		}
		if err := tx.Where("api_config_id = ?", api.ID).Delete(&APIParameter{}).Error; err != nil {
			tx.Rollback()
			w.WriteHeader(http.StatusInternalServerError)
			return fmt.Errorf("failed to delete existing parameters: %v", err)
		}
	} else {
		// Create new API config
		api = APIConfig{
			Path:                 req.Path,
			Upstream:             req.Upstream,
			RequiredSubscription: req.RequiredSubscription,
			LastAccessed:         time.Now(),
			RequiredHeaders:      req.RequiredHeaders,
		}
		if err := tx.Create(&api).Error; err != nil {
			tx.Rollback()
			w.WriteHeader(http.StatusInternalServerError)
			return fmt.Errorf("failed to create API: %v", err)
		}
	}

	// Create method records
	for _, method := range req.Methods {
		apiMethod := APIMethod{
			APIConfigID: api.ID,
			Method:      method,
		}
		if err := tx.Create(&apiMethod).Error; err != nil {
			tx.Rollback()
			w.WriteHeader(http.StatusInternalServerError)
			return fmt.Errorf("failed to create API method: %v", err)
		}
	}

	// Create parameter records
	for _, param := range req.Parameters {
		param.APIConfigID = api.ID
		if err := tx.Create(&param).Error; err != nil {
			tx.Rollback()
			w.WriteHeader(http.StatusInternalServerError)
			return fmt.Errorf("failed to create API parameter: %v", err)
		}
	}

	// Update in-memory configuration
	v.mu.Lock()
	if isUpdate {
		// Replace existing API
		for i, existingAPI := range v.APIs {
			if existingAPI.Path == api.Path {
				v.APIs[i] = api
				break
			}
		}
	} else {
		// Add new API
		v.APIs = append(v.APIs, api)
	}
	v.mu.Unlock()

	// Update Caddy's configuration
	if err := v.updateCaddyfile(); err != nil {
		tx.Rollback()
		w.WriteHeader(http.StatusInternalServerError)
		return fmt.Errorf("failed to update configuration: %v", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return fmt.Errorf("failed to commit transaction: %v", err)
	}

	// Prepare and send response
	resp := APIOnboardResponse{
		Status:  "success",
		Message: fmt.Sprintf("API successfully %s", map[bool]string{true: "updated", false: "created"}[isUpdate]),
		API:     api,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	return json.NewEncoder(w).Encode(resp)
}

// handleAPIList handles requests to list all registered APIs
func (v *Veil) handleAPIList(w http.ResponseWriter, r *http.Request) error {
	var apis []APIConfig
	if err := v.db.Preload("Methods").Preload("Parameters").Find(&apis).Error; err != nil {
		return caddyhttp.Error(http.StatusInternalServerError, fmt.Errorf("failed to query APIs: %v", err))
	}

	w.Header().Set("Content-Type", "application/json")
	return json.NewEncoder(w).Encode(apis)
}

// defaultUpdateCaddyfile is the default implementation of updateCaddyfile
func (v *Veil) defaultUpdateCaddyfile() error {
	// Create the configuration using Caddy types
	routes := []caddyhttp.Route{}

	// Build routes for each API
	for _, api := range v.APIs {
		upstream := api.Upstream
		if !strings.HasPrefix(upstream, "http://") && !strings.HasPrefix(upstream, "https://") {
			upstream = "http://" + upstream
		}

		route := caddyhttp.Route{
			MatcherSetsRaw: []caddy.ModuleMap{
				{
					"path": caddyconfig.JSONModuleObject(
						caddyhttp.MatchPath{fmt.Sprintf("%s*", api.Path)},
						"matcher",
						"path",
						nil,
					),
				},
			},
			HandlersRaw: []json.RawMessage{
				caddyconfig.JSONModuleObject(
					&reverseproxy.Handler{
						Upstreams: []*reverseproxy.Upstream{
							{
								Dial: upstream,
							},
						},
					},
					"handler",
					"reverse_proxy",
					nil,
				),
			},
		}

		routes = append(routes, route)
	}

	// Create the configuration JSON for Caddy's admin API
	httpApp := &caddyhttp.App{
		Servers: map[string]*caddyhttp.Server{
			"srv0": {
				Listen: []string{":2020"},
				Routes: routes,
			},
		},
	}

	config := &caddy.Config{
		Admin: &caddy.AdminConfig{
			Listen: "0.0.0.0:2019",
		},
		AppsRaw: caddy.ModuleMap{
			"http": caddyconfig.JSON(httpApp, nil),
		},
	}

	// Convert to JSON
	configJSON, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %v", err)
	}

	v.logger.Debug("updating Caddy config via admin API", zap.String("config", string(configJSON)))

	// Send config to Caddy's admin API using PATCH instead of POST /load
	req, err := http.NewRequest(http.MethodPatch, "http://localhost:2019/config/", bytes.NewReader(configJSON))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		v.logger.Error("failed to update Caddy config",
			zap.Int("status_code", resp.StatusCode),
			zap.String("response", string(body)))
		return fmt.Errorf("failed to update config: %s", body)
	}

	v.logger.Info("successfully updated Caddy config")
	return nil
}

// defaultReloadCaddy is the default implementation of reloadCaddy
func (v *Veil) defaultReloadCaddy() error {
	// No need to reload since we're using the admin API
	return nil
}

// UnmarshalCaddyfile implements caddyfile.Unmarshaler.
func (v *Veil) UnmarshalCaddyfile(d *caddyfile.Dispenser) error {
	for d.Next() {
		if !d.Args(&v.SubscriptionHeader) {
			return d.ArgErr()
		}

		// Get the Caddyfile path from the current file being parsed
		v.CaddyfilePath = d.File()

		for d.NextBlock(0) {
			switch d.Val() {
			case "api":
				var api APIConfig
				if !d.NextArg() {
					return d.ArgErr()
				}
				api.Path = d.Val()
				if !d.NextArg() {
					return d.ArgErr()
				}
				api.Upstream = d.Val()
				if !d.NextArg() {
					return d.ArgErr()
				}
				api.RequiredSubscription = d.Val()
				v.APIs = append(v.APIs, api)
			default:
				return d.Errf("unknown subdirective %s", d.Val())
			}
		}
	}
	return nil
}

// parseCaddyfile parses the veil directive
func parseCaddyfile(h httpcaddyfile.Helper) (caddyhttp.MiddlewareHandler, error) {
	var handler handlers.VeilHandler
	cfg := new(config.VeilConfig)

	err := config.ParseConfig(nil, h.Dispenser, cfg)
	if err != nil {
		return nil, err
	}

	handler.Config = cfg
	return &handler, nil
}

// Cleanup implements caddy.CleanerUpper and closes the database connection
func (v *Veil) Cleanup() error {
	if v.db != nil {
		sqlDB, err := v.db.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}

// Interface guards
var (
	_ caddy.Provisioner           = (*Veil)(nil)
	_ caddy.Validator             = (*Veil)(nil)
	_ caddy.CleanerUpper          = (*Veil)(nil)
	_ caddyhttp.MiddlewareHandler = (*Veil)(nil)
	_ caddyfile.Unmarshaler       = (*config.VeilConfig)(nil)
)
