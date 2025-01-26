package testutils

import (
	"os"
	"path/filepath"
	"server/internal/database"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// CreateTestDB creates a temporary SQLite database for testing
func CreateTestDB(t *testing.T) (*gorm.DB, func()) {
	t.Helper()

	// Create temp directory
	tmpDir, err := os.MkdirTemp("", "apitest-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	path, _ := filepath.Abs(".")
	dbPath := filepath.Join(path, "test.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		os.RemoveAll(tmpDir)
		t.Fatalf("Failed to create test database: %v", err)
	}
	// run migrations
	database.MigrateDB(db)

	// Return cleanup function
	cleanup := func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
		os.RemoveAll(tmpDir)
	}

	return db, cleanup
}
