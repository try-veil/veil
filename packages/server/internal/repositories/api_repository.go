package repositories

import (
	"server/internal/models"
	applogger "server/utils"
	"time"

	"gorm.io/gorm"
)

type APIRepository struct {
	db *gorm.DB
}

func NewAPIRepository(db *gorm.DB) *APIRepository {
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
	// err := r.db.Transaction(func(tx *gorm.DB) error {
	// tx.Create(&models.API{
	// 	ID:          params.ID,
	// 	Name:        params.Name,
	// 	Version:     params.Version,
	// 	Description: params.Description,
	// 	BaseURL:     params.BaseURL,
	// 	Category:    params.Category,
	// 	// TODO: Figure out what is this `spec`
	// })

	// 	var obj models.API
	// 	tx.Model(&models.API{}).First(&obj)
	// 	fmt.Printf("val :%v", obj)

	// 	tx.Create(&models.APIOwner{
	// 		Name:    params.OwnerName,
	// 		Email:   params.OwnerEmail,
	// 		Website: params.OwnerWebsite,
	// 	})

	// 	return nil
	// })
	tx := r.db.Create(&models.API{
		ID:          params.ID,
		Name:        params.Name,
		Version:     params.Version,
		Description: params.Description,
		BaseURL:     params.BaseURL,
		Category:    params.Category,
		// TODO: Figure out what is this `spec`
	})
	tx.Commit()
	// if err != nil {
	// 	applogger.Error("[SaveAPI] err: " + err.Error())
	// }

	applogger.Info("[SaveAPI] successfully served request.")
	return nil
}

func (r *APIRepository) GetAPIByID(id string) (*models.API, error) {
	var spec models.API
	r.db.First(&spec, "id = ?", id)

	return &spec, nil
}
