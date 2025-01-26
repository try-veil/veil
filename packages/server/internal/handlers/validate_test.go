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

func TestValidateHandler_ValidateAPI(t *testing.T) {
	db, cleanup := testutils.CreateTestDB(t)
	defer cleanup()

	repo := repositories.NewAPIRepository(db)
	handler := NewValidateHandler(repo)

	// Create test API
	api := createTestAPI(t, repo)

	tests := []struct {
		name       string
		request    models.ValidationRequest
		wantStatus int
		wantValid  bool
	}{
		{
			name: "Valid request",
			request: models.ValidationRequest{
				APIID: api.ID,
				TestParameters: models.TestParameters{
					Headers: map[string]string{
						"Authorization": "Bearer test_token",
					},
				},
			},
			wantStatus: http.StatusOK,
			wantValid:  true,
		},
		{
			name: "Invalid API ID",
			request: models.ValidationRequest{
				APIID: "invalid-id",
			},
			wantStatus: http.StatusNotFound,
			wantValid:  false,
		},
		{
			name: "Specific endpoint",
			request: models.ValidationRequest{
				APIID:        api.ID,
				EndpointPath: "/test",
			},
			wantStatus: http.StatusOK,
			wantValid:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.request)
			req := httptest.NewRequest(http.MethodPost, "/v1/apis/validate", bytes.NewBuffer(body))
			w := httptest.NewRecorder()

			handler.ValidateAPI(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("ValidateAPI() status = %v, want %v", w.Code, tt.wantStatus)
			}

			if tt.wantStatus == http.StatusOK {
				var resp models.ValidationResponse
				if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}

				if resp.Validation.IsValid != tt.wantValid {
					t.Errorf("ValidateAPI() isValid = %v, want %v", resp.Validation.IsValid, tt.wantValid)
				}

				if tt.wantValid && resp.Gateway == nil {
					t.Error("ValidateAPI() gateway info missing in successful response")
				}
			}
		})
	}
}

func createTestAPI(t *testing.T, repo *repositories.APIRepository) *models.OnboardedAPI {
	// Save API
	params := repositories.SaveAPIParams{
		ID:      "test-id",
		Name:    "test-api",
		Version: "1.0.0",
		BaseURL: "https://api.test.com",
		Spec: models.OnboardAPIRequest{
			API: models.API{
				Name:    "test-api",
				Version: "1.0.0",
				BaseURL: "https://api.test.com",
			},
			APISpec: models.APISpec{
				Endpoints: []models.Endpoint{
					{
						Path:   "/test",
						Method: "GET",
					},
				},
			},
			Owner: models.OwnerSpec{
				Name:  "Test Owner",
				Email: "test@example.com",
			},
		},
	}

	if err := repo.SaveAPI(params); err != nil {
		t.Fatalf("Failed to create test API: %v", err)
	}

	return &models.OnboardedAPI{
		ID:    params.ID,
		API:   params.Spec.APISpec,
		Owner: params.Spec.Owner,
	}
}
