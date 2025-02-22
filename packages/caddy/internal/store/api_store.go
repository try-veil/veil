package store

import (
	"strings"
	"time"

	"github.com/techsavvyash/veil/packages/caddy/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// APIStore handles database operations for API configurations
type APIStore struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewAPIStore creates a new APIStore instance
func NewAPIStore(db *gorm.DB) *APIStore {
	return &APIStore{
		db:     db,
		logger: zap.L().Named("api_store"),
	}
}

// CreateAPI creates a new API configuration in the database
func (s *APIStore) CreateAPI(config *models.APIConfig) error {
	s.logger.Info("creating new API configuration",
		zap.String("path", config.Path),
		zap.String("upstream", config.Upstream),
		zap.String("subscription", config.RequiredSubscription),
		zap.Int("api_keys", len(config.APIKeys)))

	err := s.db.Create(config).Error
	if err != nil {
		s.logger.Error("failed to create API configuration",
			zap.Error(err),
			zap.String("path", config.Path))
		return err
	}

	s.logger.Info("API configuration created successfully",
		zap.String("path", config.Path),
		zap.Uint("id", config.ID))

	return nil
}

// GetAPIByPath retrieves an API configuration by its path
func (s *APIStore) GetAPIByPath(path string) (*models.APIConfig, error) {
	s.logger.Debug("searching for API configuration",
		zap.String("path", path))

	var configs []models.APIConfig
	err := s.db.Preload("Methods").
		Preload("Parameters").
		Preload("APIKeys").
		Find(&configs).Error
	if err != nil {
		s.logger.Error("failed to query API configurations",
			zap.Error(err))
		return nil, err
	}

	s.logger.Debug("found API configurations",
		zap.Int("count", len(configs)))

	// Find the best matching path
	var bestMatch *models.APIConfig
	bestMatchLen := 0

	for i, config := range configs {
		s.logger.Debug("checking path match",
			zap.String("config_path", config.Path),
			zap.String("request_path", path),
			zap.Int("api_keys", len(config.APIKeys)))

		configPath := strings.TrimSuffix(config.Path, "/*")
		if strings.HasPrefix(path, configPath) && len(configPath) > bestMatchLen {
			bestMatch = &configs[i]
			bestMatchLen = len(configPath)
			s.logger.Debug("found better match",
				zap.String("path", configPath),
				zap.Int("match_len", bestMatchLen))
		}
	}

	if bestMatch != nil {
		s.logger.Debug("found matching API configuration",
			zap.String("path", bestMatch.Path),
			zap.Int("api_keys", len(bestMatch.APIKeys)))
	} else {
		s.logger.Debug("no matching API configuration found",
			zap.String("path", path))
	}

	return bestMatch, nil
}

// ValidateAPIKey checks if the provided API key is valid for the given API
func (s *APIStore) ValidateAPIKey(apiConfig *models.APIConfig, apiKey string) bool {
	if apiKey == "" || apiConfig == nil {
		s.logger.Debug("invalid input for API key validation",
			zap.Bool("has_api_key", apiKey != ""),
			zap.Bool("has_config", apiConfig != nil))
		return false
	}

	s.logger.Debug("validating API key",
		zap.String("api_key", apiKey),
		zap.String("path", apiConfig.Path),
		zap.Int("available_keys", len(apiConfig.APIKeys)))

	// Reload API keys to ensure we have the latest data
	if err := s.db.Model(apiConfig).Association("APIKeys").Find(&apiConfig.APIKeys); err != nil {
		s.logger.Error("failed to reload API keys",
			zap.Error(err),
			zap.String("path", apiConfig.Path))
		return false
	}

	s.logger.Debug("reloaded API keys",
		zap.Int("available_keys", len(apiConfig.APIKeys)))

	for _, key := range apiConfig.APIKeys {
		s.logger.Debug("checking API key",
			zap.String("key_name", key.Name),
			zap.String("key_value", key.Key),
			zap.Bool("is_active", key.IsActive),
			zap.Bool("matches", key.Key == apiKey))

		if key.Key == apiKey && key.IsActive {
			// Check expiration if set
			if key.ExpiresAt != nil && key.ExpiresAt.Before(time.Now()) {
				s.logger.Debug("API key expired",
					zap.String("key_name", key.Name),
					zap.Time("expired_at", *key.ExpiresAt))
				continue
			}
			s.logger.Debug("valid API key found",
				zap.String("key_name", key.Name))
			return true
		}
	}

	s.logger.Debug("no valid API key found")
	return false
}

// UpdateAPIStats updates the last accessed time and request count for an API
func (s *APIStore) UpdateAPIStats(path string) error {
	s.logger.Debug("updating API stats",
		zap.String("path", path))

	result := s.db.Model(&models.APIConfig{}).
		Where("path = ?", path).
		Updates(map[string]interface{}{
			"last_accessed": time.Now(),
			"request_count": gorm.Expr("request_count + ?", 1),
		})

	if result.Error != nil {
		s.logger.Error("failed to update API stats",
			zap.Error(result.Error),
			zap.String("path", path))
		return result.Error
	}

	s.logger.Debug("API stats updated successfully",
		zap.String("path", path),
		zap.Int64("rows_affected", result.RowsAffected))

	return nil
}

// ListAPIs retrieves all API configurations
func (s *APIStore) ListAPIs() ([]models.APIConfig, error) {
	var configs []models.APIConfig
	err := s.db.Preload("Methods").
		Preload("Parameters").
		Preload("APIKeys").
		Find(&configs).Error

	if err != nil {
		s.logger.Error("failed to list APIs",
			zap.Error(err))
		return nil, err
	}

	s.logger.Debug("retrieved API configurations",
		zap.Int("count", len(configs)))

	return configs, err
}

// DeleteAPI removes an API configuration by its path
func (s *APIStore) DeleteAPI(path string) error {
	s.logger.Info("deleting API configuration",
		zap.String("path", path))

	result := s.db.Where("path = ?", path).Delete(&models.APIConfig{})
	if result.Error != nil {
		s.logger.Error("failed to delete API configuration",
			zap.Error(result.Error),
			zap.String("path", path))
		return result.Error
	}

	s.logger.Info("API configuration deleted successfully",
		zap.String("path", path),
		zap.Int64("rows_affected", result.RowsAffected))

	return nil
}

// AutoMigrate performs database migrations for API-related models
func (s *APIStore) AutoMigrate() error {
	s.logger.Info("running database migrations")

	err := s.db.AutoMigrate(
		&models.APIConfig{},
		&models.APIMethod{},
		&models.APIParameter{},
		&models.APIKey{},
	)

	if err != nil {
		s.logger.Error("failed to run database migrations",
			zap.Error(err))
		return err
	}

	s.logger.Info("database migrations completed successfully")
	return nil
}
