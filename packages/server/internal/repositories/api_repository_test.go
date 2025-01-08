package repositories

import (
	"testing"
	"time"

	"server/internal/models"
	"server/internal/testutils"
)

func TestAPIRepository_SaveAPI(t *testing.T) {
	db, cleanup := testutils.CreateTestDB(t)
	defer cleanup()

	repo := NewAPIRepository(db)

	// Test data
	testAPI := models.APISpec{
		Name:        "Test API",
		Version:     "1.0.0",
		Description: "Test Description",
		BaseURL:     "https://api.test.com",
		Category:    "Test",
		Auth: models.AuthSpec{
			StaticToken:   "test-token",
			TokenLocation: "header",
			TokenName:     "X-API-Key",
		},
		Endpoints: []models.Endpoint{
			{
				Path:        "/test",
				Method:      "GET",
				Name:        "Test Endpoint",
				Description: "Test endpoint description",
			},
		},
	}

	testOwner := models.OwnerSpec{
		Name:    "Test Owner",
		Email:   "test@example.com",
		Website: "https://test.com",
	}

	// Test saving
	params := SaveAPIParams{
		ID:           "test-id",
		Name:         testAPI.Name,
		Version:      testAPI.Version,
		Description:  testAPI.Description,
		BaseURL:      testAPI.BaseURL,
		Category:     testAPI.Category,
		CreatedAt:    time.Now().UTC(),
		Spec:         models.OnboardAPIRequest{API: testAPI, Owner: testOwner},
		OwnerName:    testOwner.Name,
		OwnerEmail:   testOwner.Email,
		OwnerWebsite: testOwner.Website,
	}

	if err := repo.SaveAPI(params); err != nil {
		t.Fatalf("Failed to save API: %v", err)
	}

	// Test retrieval
	saved, err := repo.GetAPIByID("test-id")
	if err != nil {
		t.Fatalf("Failed to get API: %v", err)
	}

	if saved == nil {
		t.Fatal("Expected saved API, got nil")
	}

	if saved.API.Name != testAPI.Name {
		t.Errorf("Expected API name %s, got %s", testAPI.Name, saved.API.Name)
	}

	if saved.Owner.Email != testOwner.Email {
		t.Errorf("Expected owner email %s, got %s", testOwner.Email, saved.Owner.Email)
	}
}
