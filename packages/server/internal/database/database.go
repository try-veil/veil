package database

import (
	"fmt"
	"server/internal/models"
	applogger "server/utils"

	"gorm.io/gorm"
)

// Migration function to automatically migrate the schemas using struct definitions
func MigrateDB(db *gorm.DB) error {
	// Auto migrations basis struct
	err := db.Transaction(func(tx *gorm.DB) error {
		err := tx.AutoMigrate(&models.API{})
		if err != nil {
			applogger.Error(fmt.Sprintf("[InitDB] error running migrations on models.API db schema | err %v", err.Error()))
			return err
		}
		err = tx.AutoMigrate(&models.APIOwner{})
		if err != nil {
			applogger.Error(fmt.Sprintf("[InitDB] error while running migrations on models.APIOwner db schema | err %v", err.Error()))
			return err
		}
		err = tx.AutoMigrate(&models.OnboardAPIRequest{})
		if err != nil {
			applogger.Error(fmt.Sprintf("[InitDB] error while running migrations on models.OnboardAPIRequest db schema | err %v", err.Error()))
		}

		return nil
	})

	if err != nil {
		applogger.Error(fmt.Sprintf("[InitDB] Error migrating schemas to DB | err : %v", err.Error()))
	}
	return nil
}
