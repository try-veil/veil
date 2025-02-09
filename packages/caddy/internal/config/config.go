package config

import (
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/caddyconfig/caddyfile"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// VeilConfig represents the configuration for the Veil module
type VeilConfig struct {
	DBPath string `json:"db_path,omitempty"`
	db     *gorm.DB
}

// UnmarshalCaddyfile implements caddyfile.Unmarshaler.
func (c *VeilConfig) UnmarshalCaddyfile(d *caddyfile.Dispenser) error {
	for d.Next() {
		if !d.Args(&c.DBPath) {
			return d.ArgErr()
		}
	}
	return nil
}

// Provision implements caddy.Provisioner.
func (c *VeilConfig) Provision(ctx caddy.Context) error {
	if c.DBPath == "" {
		c.DBPath = "veil.db"
	}

	db, err := gorm.Open(sqlite.Open(c.DBPath), &gorm.Config{})
	if err != nil {
		return err
	}

	c.db = db
	return nil
}

// ParseConfig parses the Caddyfile directive for Veil
func ParseConfig(h *caddyhttp.Handler, d *caddyfile.Dispenser, m any) error {
	config, ok := m.(*VeilConfig)
	if !ok {
		return d.Errf("expected config to be *VeilConfig, got: %T", m)
	}

	return config.UnmarshalCaddyfile(d)
}

// GetDB returns the database instance
func (c *VeilConfig) GetDB() *gorm.DB {
	return c.db
}

// SetDB sets the database instance
func (c *VeilConfig) SetDB(db *gorm.DB) {
	c.db = db
}

// Interface guards
var (
	_ caddy.Provisioner     = (*VeilConfig)(nil)
	_ caddyfile.Unmarshaler = (*VeilConfig)(nil)
)
