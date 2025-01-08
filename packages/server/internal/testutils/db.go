package testutils

import (
	"os"
	"path/filepath"
	"testing"

	"server/internal/database"
)

// CreateTestDB creates a temporary SQLite database for testing
func CreateTestDB(t *testing.T) (*database.Database, func()) {
	t.Helper()

	// Create temp directory
	tmpDir, err := os.MkdirTemp("", "apitest-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}

	dbPath := filepath.Join(tmpDir, "test.db")
	db, err := database.NewDatabase(dbPath)
	if err != nil {
		os.RemoveAll(tmpDir)
		t.Fatalf("Failed to create test database: %v", err)
	}

	// Return cleanup function
	cleanup := func() {
		db.Close()
		os.RemoveAll(tmpDir)
	}

	return db, cleanup
}
