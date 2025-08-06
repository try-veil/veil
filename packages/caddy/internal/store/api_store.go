package store

import (
	"fmt"
	"strings"
	"time"

	"github.com/try-veil/veil/packages/caddy/internal/models"
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

	// Log API keys before creation
	for _, key := range config.APIKeys {
		s.logger.Debug("API key to be created",
			zap.String("key_name", key.Name),
			zap.String("key_value", key.Key),
			zap.Bool("is_active", *key.IsActive))
	}

	err := s.db.Create(config).Error
	if err != nil {
		s.logger.Error("failed to create API configuration",
			zap.Error(err),
			zap.String("path", config.Path))
		return err
	}

	// Verify the creation by reading back
	var savedConfig models.APIConfig
	err = s.db.Preload("APIKeys").First(&savedConfig, config.ID).Error
	if err != nil {
		s.logger.Error("failed to verify API configuration creation",
			zap.Error(err),
			zap.String("path", config.Path))
	} else {
		s.logger.Info("verified API configuration creation",
			zap.String("path", savedConfig.Path),
			zap.Int("saved_api_keys", len(savedConfig.APIKeys)))
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

	// Log all found configurations
	for _, config := range configs {
		s.logger.Debug("found configuration",
			zap.String("path", config.Path),
			zap.String("upstream", config.Upstream),
			zap.Int("api_keys", len(config.APIKeys)))

		for _, key := range config.APIKeys {
			s.logger.Debug("found API key",
				zap.String("key_name", key.Name),
				zap.String("key_value", key.Key),
				zap.Bool("is_active", *key.IsActive))
		}
	}

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
			zap.Int("api_keys", len(bestMatch.APIKeys)),
			zap.Bool("has_body", bestMatch.Body != nil))

		if bestMatch.Body != nil {
			s.logger.Debug("API body configuration",
				zap.String("body_type", bestMatch.Body.Type),
				zap.String("body_content", bestMatch.Body.Content),
				zap.Int("form_data_count", len(bestMatch.Body.FormData)),
				zap.Int("multipart_data_count", len(bestMatch.Body.MultipartData)))
		}

		for _, key := range bestMatch.APIKeys {
			s.logger.Debug("matched configuration API key",
				zap.String("key_name", key.Name),
				zap.String("key_value", key.Key),
				zap.Bool("is_active", *key.IsActive))
		}
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
			zap.Bool("is_active", *key.IsActive),
			zap.Bool("matches", key.Key == apiKey))

		if key.Key == apiKey && *key.IsActive {
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

	return s.db.Transaction(func(tx *gorm.DB) error {
		// Get API config to delete
		var api models.APIConfig
		if err := tx.Where("path = ?", path).First(&api).Error; err != nil {
			return err
		}

		// Delete associated methods and API keys
		if err := tx.Where("api_config_id = ?", api.ID).Delete(&models.APIMethod{}).Error; err != nil {
			return err
		}
		if err := tx.Where("api_config_id = ?", api.ID).Delete(&models.APIKey{}).Error; err != nil {
			return err
		}

		// Delete the API config
		if err := tx.Delete(&api).Error; err != nil {
			return err
		}

		return nil
	})
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

// UpdateAPI updates an existing API configuration
func (s *APIStore) UpdateAPI(config *models.APIConfig) error {
	s.logger.Info("updating API configuration",
		zap.String("path", config.Path),
		zap.String("upstream", config.Upstream),
		zap.String("subscription", config.RequiredSubscription),
		zap.Int("api_keys", len(config.APIKeys)))

	// Begin transaction
	tx := s.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	// Delete existing methods and API keys
	if err := tx.Where("api_config_id = ?", config.ID).Delete(&models.APIMethod{}).Error; err != nil {
		tx.Rollback()
		return err
	}
	if err := tx.Unscoped().
	Where("api_config_id = ?", config.ID).
	Delete(&models.APIKey{}).Error; err != nil {
    tx.Rollback()
    return err
    }

	// Update API config
	if err := tx.Save(config).Error; err != nil {
		tx.Rollback()
		s.logger.Error("failed to update API configuration",
			zap.Error(err),
			zap.String("path", config.Path))
		return err
	}

	// Create new methods
	for i := range config.Methods {
		config.Methods[i].ID = 0
		config.Methods[i].APIConfigID = config.ID
		if err := tx.Create(&config.Methods[i]).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	// Create or update API keys (upsert)
	for i := range config.APIKeys {
		config.APIKeys[i].ID = 0
		config.APIKeys[i].APIConfigID = config.ID
		
		// Use FirstOrCreate to handle existing keys
		var existingKey models.APIKey
		result := tx.Where("key = ?", config.APIKeys[i].Key).First(&existingKey)
		
		if result.Error == nil {
			// Key exists, update it
			existingKey.APIConfigID = config.ID
			existingKey.Name = config.APIKeys[i].Name
			existingKey.IsActive = config.APIKeys[i].IsActive
			existingKey.ExpiresAt = config.APIKeys[i].ExpiresAt
			if err := tx.Save(&existingKey).Error; err != nil {
				tx.Rollback()
				return err
			}
		} else {
			// Key doesn't exist, create it
			if err := tx.Create(&config.APIKeys[i]).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		s.logger.Error("failed to commit transaction",
			zap.Error(err),
			zap.String("path", config.Path))
		return err
	}

	s.logger.Info("API configuration updated successfully",
		zap.String("path", config.Path),
		zap.Uint("id", config.ID))

	return nil
}

func (s *APIStore) DeleteAPIKey(path, key string) error {
	api, err := s.GetAPIByPath(path)
	if err != nil {
		return err
	}
	return s.db.Where("api_config_id = ? AND key = ?", api.ID, key).Delete(&models.APIKey{}).Error
}

// AddAPIKeys adds new API keys to an existing API configuration
func (s *APIStore) AddAPIKeys(path string, newKeys []models.APIKey) error {
	s.logger.Info("adding new API keys",
		zap.String("path", path),
		zap.Int("key_count", len(newKeys)))

	// Begin transaction
	tx := s.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	// Get API config ID
	var apiConfig models.APIConfig
	if err := tx.Where("path = ?", path).First(&apiConfig).Error; err != nil {
		tx.Rollback()
		s.logger.Error("failed to find API configuration",
			zap.Error(err),
			zap.String("path", path))
		return err
	}

	// Get existing keys for duplicate check
	var existingKeys []models.APIKey
	if err := tx.Where("api_config_id = ?", apiConfig.ID).Find(&existingKeys).Error; err != nil {
		tx.Rollback()
		s.logger.Error("failed to fetch existing API keys",
			zap.Error(err),
			zap.String("path", path))
		return err
	}

	// Check for duplicates and prepare new keys
	var keysToAdd []models.APIKey
	for _, newKey := range newKeys {
		isDuplicate := false
		for _, existingKey := range existingKeys {
			if existingKey.Key == newKey.Key {
				isDuplicate = true
				break
			}
		}
		active := true
		if !isDuplicate {
			newKey.APIConfigID = apiConfig.ID
			if newKey.IsActive == nil {
				newKey.IsActive = &active
			}
			keysToAdd = append(keysToAdd, newKey)
		}
	}

	// Add new keys if any
	if len(keysToAdd) > 0 {
		if err := tx.Create(&keysToAdd).Error; err != nil {
			tx.Rollback()
			s.logger.Error("failed to add new API keys",
				zap.Error(err),
				zap.String("path", path))
			return err
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		s.logger.Error("failed to commit transaction",
			zap.Error(err),
			zap.String("path", path))
		return err
	}

	s.logger.Info("successfully added new API keys",
		zap.String("path", path),
		zap.Int("added_keys", len(keysToAdd)))

	return nil
}

// UpdateAPIKeyStatus updates the status of an API key
func (s *APIStore) UpdateAPIKeyStatus(path string, apiKey string, isActive bool) error {
	s.logger.Info("updating API key status",
		zap.String("path", path),
		zap.String("key", apiKey),
		zap.Bool("is_active", isActive))

	// Begin transaction
	tx := s.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	// Get API config ID
	var apiConfig models.APIConfig
	if err := tx.Where("path = ?", path).First(&apiConfig).Error; err != nil {
		tx.Rollback()
		s.logger.Error("failed to find API configuration",
			zap.Error(err),
			zap.String("path", path))
		return err
	}

	// Update key status
	result := tx.Model(&models.APIKey{}).
		Where("api_config_id = ? AND key = ?", apiConfig.ID, apiKey).
		Update("is_active", isActive)

	if result.Error != nil {
		tx.Rollback()
		s.logger.Error("failed to update API key status",
			zap.Error(result.Error),
			zap.String("path", path),
			zap.String("key", apiKey))
		return result.Error
	}

	if result.RowsAffected == 0 {
		tx.Rollback()
		s.logger.Error("API key not found",
			zap.String("path", path),
			zap.String("key", apiKey))
		return fmt.Errorf("API key not found")
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		s.logger.Error("failed to commit transaction",
			zap.Error(err),
			zap.String("path", path))
		return err
	}

	s.logger.Info("successfully updated API key status",
		zap.String("path", path),
		zap.String("key", apiKey),
		zap.Bool("is_active", isActive))

	return nil
}

// GetAPIWithKeys retrieves an API configuration with its keys
func (s *APIStore) GetAPIWithKeys(path string) (*models.APIConfig, error) {
	var apiConfig models.APIConfig
	err := s.db.Preload("APIKeys").
		Where("path = ?", path).
		First(&apiConfig).Error

	if err != nil {
		s.logger.Error("failed to get API with keys",
			zap.Error(err),
			zap.String("path", path))
		return nil, err
	}

	return &apiConfig, nil
}

// GetAPIByID gets an API config by ID
func (s *APIStore) GetAPIByID(id uint) (*models.APIConfig, error) {
	var api models.APIConfig
	result := s.db.Preload("Methods").Preload("APIKeys").First(&api, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &api, nil
}
