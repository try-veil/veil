package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"server/internal/config"
	"server/internal/database"
	"server/internal/handlers"
	"server/internal/middleware"
	"server/internal/repositories"
	"server/internal/server"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

const (
	defaultPort = "8080"
	dbPath      = "./data/apis.db"
	configPath  = "../../config/gateway"
)

func main() {

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Ensure data directory exists
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	// Initialize database
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to read the sql connection of gorm.DB")
	}
	defer sqlDB.Close()

	// Run seed scripts
	database.MigrateDB(db)

	// Initialize repositories
	apiRepo := repositories.NewAPIRepository(db)

	port := strconv.Itoa(cfg.Port)
	srv := server.NewServer(cfg)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler()
	onboardingHandler := handlers.NewOnboardingHandler(apiRepo, configPath)
	validateHandler := handlers.NewValidateHandler(apiRepo)

	// Register routes
	srv.Handle("/health", middleware.Logging(http.HandlerFunc(healthHandler.Health)))
	srv.Handle("/v1/apis/onboard", middleware.Logging(http.HandlerFunc(onboardingHandler.OnboardAPI)))
	srv.Handle("/v1/apis/validate", middleware.Logging(http.HandlerFunc(validateHandler.ValidateAPI)))

	// Start server
	log.Printf("Server starting on port %s", port)
	if err := srv.Start(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
