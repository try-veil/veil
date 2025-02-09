package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/caddyconfig/caddyfile"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"github.com/techsavvyash/veil/packages/caddy/internal/config"
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

// Provision implements caddy.Provisioner.
func (h *VeilHandler) Provision(ctx caddy.Context) error {
	h.logger = ctx.Logger()

	// Initialize config
	h.Config = &config.VeilConfig{
		DBPath: h.DBPath,
	}

	if err := h.Config.Provision(ctx); err != nil {
		return fmt.Errorf("failed to provision config: %v", err)
	}

	h.store = store.NewAPIStore(h.Config.GetDB())
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

// ServeHTTP implements caddyhttp.MiddlewareHandler.
func (h *VeilHandler) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) error {
	path := r.URL.Path

	// Get API configuration for the requested path
	apiConfig, err := h.store.GetAPIByPath(path)
	if err != nil {
		return caddyhttp.Error(http.StatusInternalServerError, err)
	}
	if apiConfig == nil {
		return next.ServeHTTP(w, r)
	}

	// Validate subscription
	subscriptionKey := r.Header.Get(h.SubscriptionKey)
	if subscriptionKey == "" {
		return caddyhttp.Error(http.StatusUnauthorized,
			fmt.Errorf("missing subscription key"))
	}

	if !strings.EqualFold(subscriptionKey, apiConfig.RequiredSubscription) {
		return caddyhttp.Error(http.StatusForbidden,
			fmt.Errorf("invalid subscription level"))
	}

	// Validate required headers
	for _, header := range apiConfig.RequiredHeaders {
		if r.Header.Get(header) == "" {
			return caddyhttp.Error(http.StatusBadRequest,
				fmt.Errorf("missing required header: %s", header))
		}
	}

	// Update API stats
	if err := h.store.UpdateAPIStats(path); err != nil {
		// Log error but don't fail the request
		h.logger.Error("failed to update API stats",
			zap.Error(err),
			zap.String("path", path))
	}

	return next.ServeHTTP(w, r)
}

// Interface guards
var (
	_ caddy.Provisioner           = (*VeilHandler)(nil)
	_ caddy.Validator             = (*VeilHandler)(nil)
	_ caddyfile.Unmarshaler       = (*VeilHandler)(nil)
	_ caddyhttp.MiddlewareHandler = (*VeilHandler)(nil)
)
