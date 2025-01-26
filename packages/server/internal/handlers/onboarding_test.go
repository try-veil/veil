package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"server/internal/models"
	"server/internal/repositories"
	"server/internal/testutils"
)

func TestOnboardingHandler_OnboardAPI(t *testing.T) {
	db, cleanup := testutils.CreateTestDB(t)
	defer cleanup()

	repo := repositories.NewAPIRepository(db)
	handler := NewOnboardingHandler(repo, "") // TODO: Fix this with actual `configDir`

	// Test request
	reqBody := models.OnboardAPIRequest{
		API: models.API{
			Name:        "Test API",
			Version:     "1.0.0",
			Description: "Test Description",
			BaseURL:     "https://api.test.com",
			Category:    "Test",
		},
		APISpec: models.APISpec{

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
		},
		Owner: models.OwnerSpec{
			Name:    "Test Owner",
			Email:   "test@example.com",
			Website: "https://test.com",
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		t.Fatalf("Failed to marshal request body: %v", err)
	}

	// Create test request
	req := httptest.NewRequest(http.MethodPost, "/v1/apis/onboard", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// Create response recorder
	w := httptest.NewRecorder()

	// Handle request
	handler.OnboardAPI(w, req)

	// Check response
	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var resp models.OnboardAPIResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if resp.Status != "success" {
		t.Errorf("Expected status 'success', got '%s'", resp.Status)
	}

	// Verify API was saved
	saved, err := repo.GetAPIByID(resp.APIID)
	if err != nil {
		t.Fatalf("Failed to get saved API: %v", err)
	}

	if saved == nil {
		t.Fatal("Expected saved API, got nil")
	}

	if saved.API.Name != reqBody.API.Name {
		t.Errorf("Expected API name %s, got %s", reqBody.API.Name, saved.API.Name)
	}
}

func TestOnboardingHandler_InvalidMethod(t *testing.T) {
	handler := NewOnboardingHandler(nil, "") // Repository not needed for this test

	req := httptest.NewRequest(http.MethodGet, "/v1/apis/onboard", nil)
	w := httptest.NewRecorder()

	handler.OnboardAPI(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected status code %d, got %d", http.StatusMethodNotAllowed, w.Code)
	}
}

func TestOnboardingHandler_InvalidJSON(t *testing.T) {
	handler := NewOnboardingHandler(nil, "") // Repository not needed for this test

	req := httptest.NewRequest(http.MethodPost, "/v1/apis/onboard", bytes.NewBufferString("invalid json"))
	w := httptest.NewRecorder()

	handler.OnboardAPI(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, w.Code)
	}
}
