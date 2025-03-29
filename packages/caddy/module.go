package veil

import (
	"fmt"

	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/caddyconfig/caddyfile"
	"github.com/caddyserver/caddy/v2/caddyconfig/httpcaddyfile"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"github.com/try-veil/veil/packages/caddy/internal/config"
	"github.com/try-veil/veil/packages/caddy/internal/handlers"
)

func init() {
	// Register the VeilHandler
	caddy.RegisterModule(handlers.VeilHandler{})

	// Register the handler directive for Caddyfile parsing
	httpcaddyfile.RegisterHandlerDirective("veil_handler", parseVeilHandler)
}

// parseVeilHandler sets up the handler from Caddyfile tokens.
func parseVeilHandler(h httpcaddyfile.Helper) (caddyhttp.MiddlewareHandler, error) {
	var handler handlers.VeilHandler

	// Parse the directive
	for h.Next() {
		// First argument is the database path
		if !h.NextArg() {
			return nil, h.ArgErr()
		}
		handler.DBPath = h.Val()

		// Second argument is the subscription header name
		if !h.NextArg() {
			return nil, h.ArgErr()
		}
		handler.SubscriptionKey = h.Val()

		// No more arguments allowed
		if h.NextArg() {
			return nil, h.ArgErr()
		}

		// Parse any block
		for h.NextBlock(0) {
			return nil, fmt.Errorf("no block directives are supported")
		}
	}

	// Initialize the config
	handler.Config = &config.VeilConfig{
		DBPath: handler.DBPath,
	}

	return &handler, nil
}

// Interface guards
var (
	_ caddyfile.Unmarshaler = (*config.VeilConfig)(nil)
)
