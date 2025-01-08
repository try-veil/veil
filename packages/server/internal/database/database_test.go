package database

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewDatabase(t *testing.T) {
	// Create temp directory
	tmpDir, err := os.MkdirTemp("", "dbtest-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")

	// Test database creation
	db, err := NewDatabase(dbPath)
	if err != nil {
		t.Fatalf("Failed to create database: %v", err)
	}
	defer db.Close()

	// Verify tables were created
	var count int
	err = db.QueryRow("SELECT count(*) FROM sqlite_master WHERE type='table'").Scan(&count)
	if err != nil {
		t.Fatalf("Failed to query tables: %v", err)
	}

	expectedTables := 2 // apis and api_owners
	if count != expectedTables {
		t.Errorf("Expected %d tables, got %d", expectedTables, count)
	}
}

func TestDatabase_Transaction(t *testing.T) {
	// Create temp directory
	tmpDir, err := os.MkdirTemp("", "dbtest-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := NewDatabase(dbPath)
	if err != nil {
		t.Fatalf("Failed to create database: %v", err)
	}
	defer db.Close()

	// Test transaction
	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	// Test rollback
	if err := tx.Rollback(); err != nil {
		t.Errorf("Failed to rollback transaction: %v", err)
	}

	// Test commit
	tx, err = db.Begin()
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	if err := tx.Commit(); err != nil {
		t.Errorf("Failed to commit transaction: %v", err)
	}
}
