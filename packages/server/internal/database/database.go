package database

import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

type Database struct {
	db *sql.DB
}

func NewDatabase(dbPath string) (*Database, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	database := &Database{db: db}
	if err := database.createTables(); err != nil {
		return nil, err
	}

	return database, nil
}

func (d *Database) createTables() error {
	schema := `
	CREATE TABLE IF NOT EXISTS apis (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		version TEXT NOT NULL,
		description TEXT,
		base_url TEXT NOT NULL,
		category TEXT,
		created_at DATETIME NOT NULL,
		spec JSON NOT NULL
	);

	CREATE TABLE IF NOT EXISTS api_owners (
		api_id TEXT NOT NULL,
		name TEXT NOT NULL,
		email TEXT NOT NULL,
		website TEXT,
		FOREIGN KEY (api_id) REFERENCES apis(id),
		PRIMARY KEY (api_id)
	);

	CREATE INDEX IF NOT EXISTS idx_apis_name ON apis(name);
	CREATE INDEX IF NOT EXISTS idx_api_owners_email ON api_owners(email);
	`

	_, err := d.db.Exec(schema)
	return err
}

func (d *Database) Close() error {
	return d.db.Close()
}

func (d *Database) Begin() (*sql.Tx, error) {
	return d.db.Begin()
}

func (d *Database) QueryRow(query string, args ...interface{}) *sql.Row {
	return d.db.QueryRow(query, args...)
}
