package store

import (
	"errors"
	"time"

	"github.com/techsavvyash/veil/packages/caddy/internal/models"
	"gorm.io/gorm"
)

// APIStore handles database operations for API configurations
type APIStore struct {
	db *gorm.DB
}

// NewAPIStore creates a new APIStore instance
func NewAPIStore(db *gorm.DB) *APIStore {
	return &APIStore{db: db}
}

// CreateAPI creates a new API configuration in the database
func (s *APIStore) CreateAPI(config *models.APIConfig) error {
	return s.db.Create(config).Error
}

// GetAPIByPath retrieves an API configuration by its path
func (s *APIStore) GetAPIByPath(path string) (*models.APIConfig, error) {
	var config models.APIConfig
	err := s.db.Preload("Methods").Preload("Parameters").First(&config, "path = ?", path).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &config, nil
}

// UpdateAPIStats updates the last accessed time and request count for an API
func (s *APIStore) UpdateAPIStats(path string) error {
	return s.db.Model(&models.APIConfig{}).
		Where("path = ?", path).
		Updates(map[string]interface{}{
			"last_accessed": time.Now(),
			"request_count": gorm.Expr("request_count + ?", 1),
		}).Error
}

// ListAPIs retrieves all API configurations
func (s *APIStore) ListAPIs() ([]models.APIConfig, error) {
	var configs []models.APIConfig
	err := s.db.Preload("Methods").Preload("Parameters").Find(&configs).Error
	return configs, err
}

// DeleteAPI removes an API configuration by its path
func (s *APIStore) DeleteAPI(path string) error {
	return s.db.Where("path = ?", path).Delete(&models.APIConfig{}).Error
}

// AutoMigrate performs database migrations for API-related models
func (s *APIStore) AutoMigrate() error {
	return s.db.AutoMigrate(
		&models.APIConfig{},
		&models.APIMethod{},
		&models.APIParameter{},
	)
}
