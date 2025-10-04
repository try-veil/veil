package validators

import (
	"fmt"
	"sync"
	"time"

	"github.com/try-veil/veil/packages/caddy/internal/models"
	"gorm.io/gorm"
)

// SubscriptionValidator handles subscription status and quota validation
type SubscriptionValidator struct {
	db    *gorm.DB
	cache *SubscriptionCache
}

// SubscriptionCache provides in-memory caching for subscription data
type SubscriptionCache struct {
	data map[string]*CachedSubscription
	mu   sync.RWMutex
	ttl  time.Duration
}

// CachedSubscription holds cached subscription info
type CachedSubscription struct {
	IsActive      bool
	Status        string
	RequestsUsed  int64
	RequestsLimit int64
	CachedAt      time.Time
}

// NewSubscriptionValidator creates a new subscription validator
func NewSubscriptionValidator(db *gorm.DB) *SubscriptionValidator {
	return &SubscriptionValidator{
		db: db,
		cache: &SubscriptionCache{
			data: make(map[string]*CachedSubscription),
			ttl:  5 * time.Minute, // 5 minute cache TTL
		},
	}
}

// ValidateAPIKey validates the API key and checks subscription status and quota
func (v *SubscriptionValidator) ValidateAPIKey(apiKey string) (*models.APIKey, error) {
	var key models.APIKey

	// Fetch API key with preload
	if err := v.db.Where("key = ?", apiKey).First(&key).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("API key not found")
		}
		return nil, fmt.Errorf("database error: %v", err)
	}

	// Check if key is active
	if key.IsActive == nil || !*key.IsActive {
		return nil, fmt.Errorf("API key is inactive")
	}

	// Check if expired
	if key.ExpiresAt != nil && key.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("API key has expired")
	}

	// Check subscription status
	if err := v.CheckSubscriptionStatus(&key); err != nil {
		return nil, err
	}

	// Check quota
	if err := v.CheckQuota(&key); err != nil {
		return nil, err
	}

	return &key, nil
}

// CheckSubscriptionStatus verifies the subscription is active
func (v *SubscriptionValidator) CheckSubscriptionStatus(key *models.APIKey) error {
	// If no subscription linked, allow (for backward compatibility)
	if key.SubscriptionID == nil {
		return nil
	}

	// Check cache first
	cached := v.cache.Get(key.Key)
	if cached != nil && !cached.IsActive {
		return fmt.Errorf("subscription is %s", cached.Status)
	}

	// Validate subscription status
	status := key.SubscriptionStatus
	if status == "" {
		status = "active" // default
	}

	switch status {
	case "active":
		return nil
	case "suspended":
		return fmt.Errorf("subscription is suspended")
	case "cancelled":
		return fmt.Errorf("subscription is cancelled")
	default:
		return fmt.Errorf("invalid subscription status: %s", status)
	}
}

// CheckQuota validates the request quota
func (v *SubscriptionValidator) CheckQuota(key *models.APIKey) error {
	// If no limit set, allow unlimited (for backward compatibility)
	if key.RequestsLimit == 0 {
		return nil
	}

	// Check if quota exceeded
	if key.RequestsUsed >= key.RequestsLimit {
		return fmt.Errorf("quota exceeded: %d/%d requests used", key.RequestsUsed, key.RequestsLimit)
	}

	// Warn if approaching limit (90% usage)
	usagePercentage := float64(key.RequestsUsed) / float64(key.RequestsLimit) * 100
	if usagePercentage >= 90 {
		// This could trigger a warning event/notification
		fmt.Printf("Warning: API key %s is at %.2f%% quota usage\n", key.Key, usagePercentage)
	}

	return nil
}

// IncrementUsage atomically increments the request counter
func (v *SubscriptionValidator) IncrementUsage(apiKey string) error {
	// Use atomic update to prevent race conditions
	result := v.db.Model(&models.APIKey{}).
		Where("key = ?", apiKey).
		Update("requests_used", gorm.Expr("requests_used + ?", 1))

	if result.Error != nil {
		return fmt.Errorf("failed to increment usage: %v", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("API key not found for usage increment")
	}

	// Invalidate cache for this key
	v.cache.Invalidate(apiKey)

	return nil
}

// UpdateQuota updates the quota limit for an API key
func (v *SubscriptionValidator) UpdateQuota(apiKey string, newLimit int64) error {
	result := v.db.Model(&models.APIKey{}).
		Where("key = ?", apiKey).
		Update("requests_limit", newLimit)

	if result.Error != nil {
		return fmt.Errorf("failed to update quota: %v", result.Error)
	}

	// Invalidate cache
	v.cache.Invalidate(apiKey)

	return nil
}

// ResetUsage resets the usage counter for an API key (for monthly resets)
func (v *SubscriptionValidator) ResetUsage(apiKey string) error {
	result := v.db.Model(&models.APIKey{}).
		Where("key = ?", apiKey).
		Update("requests_used", 0)

	if result.Error != nil {
		return fmt.Errorf("failed to reset usage: %v", result.Error)
	}

	// Invalidate cache
	v.cache.Invalidate(apiKey)

	return nil
}

// UpdateSubscriptionStatus updates the subscription status for an API key
func (v *SubscriptionValidator) UpdateSubscriptionStatus(apiKey string, status string) error {
	// Validate status
	validStatuses := map[string]bool{
		"active":    true,
		"suspended": true,
		"cancelled": true,
	}

	if !validStatuses[status] {
		return fmt.Errorf("invalid status: %s", status)
	}

	result := v.db.Model(&models.APIKey{}).
		Where("key = ?", apiKey).
		Update("subscription_status", status)

	if result.Error != nil {
		return fmt.Errorf("failed to update subscription status: %v", result.Error)
	}

	// Invalidate cache
	v.cache.Invalidate(apiKey)

	return nil
}

// Cache methods

// Get retrieves cached subscription data
func (c *SubscriptionCache) Get(apiKey string) *CachedSubscription {
	c.mu.RLock()
	defer c.mu.RUnlock()

	cached, exists := c.data[apiKey]
	if !exists {
		return nil
	}

	// Check if expired
	if time.Since(cached.CachedAt) > c.ttl {
		delete(c.data, apiKey)
		return nil
	}

	return cached
}

// Set stores subscription data in cache
func (c *SubscriptionCache) Set(apiKey string, sub *CachedSubscription) {
	c.mu.Lock()
	defer c.mu.Unlock()

	sub.CachedAt = time.Now()
	c.data[apiKey] = sub
}

// Invalidate removes a key from cache
func (c *SubscriptionCache) Invalidate(apiKey string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.data, apiKey)
}

// Clear removes all cached data
func (c *SubscriptionCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.data = make(map[string]*CachedSubscription)
}
