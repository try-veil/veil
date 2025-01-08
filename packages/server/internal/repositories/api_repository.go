package repositories

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"server/internal/database"
	"server/internal/models"
	"time"
)

type APIRepository struct {
	db *database.Database
}

func NewAPIRepository(db *database.Database) *APIRepository {
	return &APIRepository{db: db}
}

type SaveAPIParams struct {
	ID           string
	Name         string
	Version      string
	Description  string
	BaseURL      string
	Category     string
	Spec         models.OnboardAPIRequest
	CreatedAt    time.Time
	OwnerName    string
	OwnerEmail   string
	OwnerWebsite string
}

func (r *APIRepository) SaveAPI(params SaveAPIParams) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	specJSON, err := json.Marshal(params.Spec)
	if err != nil {
		return err
	}

	// Insert API
	_, err = tx.Exec(`
		INSERT INTO apis (id, name, version, description, base_url, category, spec, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		params.ID,
		params.Name,
		params.Version,
		params.Description,
		params.BaseURL,
		params.Category,
		specJSON,
		params.CreatedAt,
	)
	if err != nil {
		return err
	}

	// Insert Owner
	_, err = tx.Exec(`
		INSERT INTO api_owners (api_id, name, email, website)
		VALUES (?, ?, ?, ?)`,
		params.ID,
		params.OwnerName,
		params.OwnerEmail,
		params.OwnerWebsite,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *APIRepository) GetAPIByID(id string) (*models.OnboardAPIRequest, error) {
	var specJSON []byte
	err := r.db.QueryRow(`
		SELECT spec FROM apis WHERE id = ?`, id).Scan(&specJSON)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("api not found")
	}
	if err != nil {
		return nil, err
	}

	var spec models.OnboardAPIRequest
	if err := json.Unmarshal(specJSON, &spec); err != nil {
		return nil, err
	}

	return &spec, nil
}
