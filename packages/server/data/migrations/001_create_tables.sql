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