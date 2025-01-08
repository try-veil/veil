package config

import (
	"fmt"
	"os"

	"github.com/caarlos0/env/v9"
	"github.com/joho/godotenv"
)

// Config holds all configuration values
type Config struct {
	// Server configuration
	Port     int    `env:"PORT" envDefault:"8080"`
	Host     string `env:"HOST" envDefault:"0.0.0.0"`
	LogLevel string `env:"LOG_LEVEL" envDefault:"info"`

	// // Database configuration
	// DBHost     string `env:"DB_HOST" envDefault:"localhost"`
	// DBPort     int    `env:"DB_PORT" envDefault:"5432"`
	// DBName     string `env:"DB_NAME,required"`
	// DBUser     string `env:"DB_USER,required"`
	// DBPassword string `env:"DB_PASSWORD,required"`
	// DBSSLMode  string `env:"DB_SSL_MODE" envDefault:"disable"`

	// API configuration
	APITimeout     int    `env:"API_TIMEOUT" envDefault:"30"`
	APIKeyHeader   string `env:"API_KEY_HEADER" envDefault:"X-API-Key"`
	AllowedOrigins string `env:"ALLOWED_ORIGINS" envDefault:"*"`
}

// LoadConfig loads the configuration from environment variables and .env file
func LoadConfig() (*Config, error) {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("error loading .env file: %w", err)
	}

	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("error parsing environment variables: %w", err)
	}

	return cfg, nil
}

// // GetDSN returns the database connection string
// func (c *Config) GetDSN() string {
// 	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
// 		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode)
// }
