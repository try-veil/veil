package veil

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestVeil(t *testing.T) (*Veil, string, func()) {
	// Create a temporary directory for test files
	tmpDir, err := os.MkdirTemp("", "veil-test-*")
	require.NoError(t, err)

	// Create a temporary Caddyfile
	caddyfilePath := filepath.Join(tmpDir, "Caddyfile")
	err = os.WriteFile(caddyfilePath, []byte(`
{
	order veil_handler before reverse_proxy
}
localhost:2020 {
	@veil_api path /veil/api/* /admin/api/*
	route @veil_api {
		veil_handler
	}
	reverse_proxy
}
`), 0644)
	require.NoError(t, err)

	// Create a temporary SQLite database
	dbPath := filepath.Join(tmpDir, "veil-test.db")

	// Initialize Veil module
	veil := &Veil{
		SubscriptionHeader: "X-Subscription",
		DBPath:             dbPath,
		CaddyfilePath:      caddyfilePath,
	}
	err = veil.initDB()
	require.NoError(t, err)

	// Ensure tables are created
	err = veil.db.AutoMigrate(&APIConfig{}, &APIMethod{}, &APIParameter{})
	require.NoError(t, err)

	cleanup := func() {
		sqlDB, err := veil.db.DB()
		if err == nil {
			sqlDB.Close()
		}
		os.RemoveAll(tmpDir)
	}

	return veil, tmpDir, cleanup
}

func TestAPIOnboarding(t *testing.T) {
	veil, _, cleanup := setupTestVeil(t)
	defer cleanup()

	tests := []struct {
		name           string
		request        APIOnboardRequest
		expectedStatus int
		expectedError  string
	}{
		{
			name: "valid request",
			request: APIOnboardRequest{
				Path:                 "/api/test",
				Upstream:             "http://localhost:8080",
				RequiredSubscription: "basic",
				Methods:              []string{"GET", "POST"},
				Parameters: []APIParameter{
					{
						Name:       "id",
						Type:       "path",
						Required:   true,
						Validation: "^[0-9]+$",
					},
				},
				RequiredHeaders: []string{"X-API-Key"},
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "missing required fields",
			request: APIOnboardRequest{
				Path: "/api/test",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "path, upstream, and required_subscription are required",
		},
		{
			name: "no methods specified",
			request: APIOnboardRequest{
				Path:                 "/api/test",
				Upstream:             "http://localhost:8080",
				RequiredSubscription: "basic",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "at least one HTTP method must be specified",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request body
			body, err := json.Marshal(tt.request)
			require.NoError(t, err)

			// Create test request
			req := httptest.NewRequest(http.MethodPost, "/veil/api/onboard", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			// Mock the updateCaddyfile and reloadCaddy functions for testing
			origUpdateCaddyfile := veil.updateCaddyfile
			origReloadCaddy := veil.reloadCaddy
			defer func() {
				veil.updateCaddyfile = origUpdateCaddyfile
				veil.reloadCaddy = origReloadCaddy
			}()

			veil.updateCaddyfile = func() error { return nil }
			veil.reloadCaddy = func() error { return nil }

			// Handle request
			err = veil.handleAPIOnboard(w, req)

			// Check response
			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.expectedError != "" {
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				assert.NoError(t, err)

				// Verify API was created in database
				if tt.expectedStatus == http.StatusCreated {
					var api APIConfig
					err := veil.db.Where("path = ?", tt.request.Path).First(&api).Error
					assert.NoError(t, err)
					assert.Equal(t, tt.request.Path, api.Path)
					assert.Equal(t, tt.request.Upstream, api.Upstream)
					assert.Equal(t, tt.request.RequiredSubscription, api.RequiredSubscription)

					// Verify methods were created
					var methods []APIMethod
					err = veil.db.Where("api_config_id = ?", api.ID).Find(&methods).Error
					assert.NoError(t, err)
					assert.Len(t, methods, len(tt.request.Methods))

					// Verify parameters were created
					var params []APIParameter
					err = veil.db.Where("api_config_id = ?", api.ID).Find(&params).Error
					assert.NoError(t, err)
					assert.Len(t, params, len(tt.request.Parameters))
				}
			}
		})
	}
}

func TestRequestValidation(t *testing.T) {
	veil, _, cleanup := setupTestVeil(t)
	defer cleanup()

	// Create a test API configuration
	api := &APIConfig{
		Path:                 "/api/test",
		Upstream:             "http://localhost:8080",
		RequiredSubscription: "basic",
		Methods: []APIMethod{
			{Method: "GET"},
			{Method: "POST"},
		},
		Parameters: []APIParameter{
			{
				Name:       "id",
				Type:       "path",
				Required:   true,
				Validation: "^[0-9]+$",
			},
			{
				Name:       "api-version",
				Type:       "header",
				Required:   true,
				Validation: "^v[0-9]+$",
			},
		},
		RequiredHeaders: []string{"X-API-Key"},
	}

	tests := []struct {
		name          string
		method        string
		path          string
		headers       map[string]string
		expectedError string
	}{
		{
			name:   "valid request",
			method: "GET",
			path:   "/api/test/123",
			headers: map[string]string{
				"X-API-Key":   "test-key",
				"api-version": "v1",
			},
		},
		{
			name:          "invalid method",
			method:        "DELETE",
			path:          "/api/test/123",
			expectedError: "method DELETE not allowed",
		},
		{
			name:   "missing required header",
			method: "GET",
			path:   "/api/test/123",
			headers: map[string]string{
				"api-version": "v1",
			},
			expectedError: "missing required header: X-API-Key",
		},
		{
			name:   "invalid path parameter",
			method: "GET",
			path:   "/api/test/abc",
			headers: map[string]string{
				"X-API-Key":   "test-key",
				"api-version": "v1",
			},
			expectedError: "invalid path parameter: id",
		},
		{
			name:   "invalid header parameter",
			method: "GET",
			path:   "/api/test/123",
			headers: map[string]string{
				"X-API-Key":   "test-key",
				"api-version": "invalid",
			},
			expectedError: "invalid header parameter: api-version",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}

			err := veil.validateRequest(req, api)
			if tt.expectedError != "" {
				assert.EqualError(t, err, tt.expectedError)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestAPIList(t *testing.T) {
	veil, _, cleanup := setupTestVeil(t)
	defer cleanup()

	// Add some test APIs
	testAPIs := []APIConfig{
		{
			Path:                 "/api/test1",
			Upstream:             "http://localhost:8081",
			RequiredSubscription: "basic",
			LastAccessed:         time.Now(),
		},
		{
			Path:                 "/api/test2",
			Upstream:             "http://localhost:8082",
			RequiredSubscription: "premium",
			LastAccessed:         time.Now(),
		},
	}

	for _, api := range testAPIs {
		err := veil.db.Create(&api).Error
		require.NoError(t, err)
		veil.APIs = append(veil.APIs, api)
	}

	// Test listing APIs
	req := httptest.NewRequest(http.MethodGet, "/veil/api/list", nil)
	w := httptest.NewRecorder()

	err := veil.handleAPIList(w, req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, w.Code)

	var response []APIConfig
	err = json.NewDecoder(w.Body).Decode(&response)
	require.NoError(t, err)
	assert.Len(t, response, len(testAPIs))

	// Verify API details
	for i, api := range response {
		assert.Equal(t, testAPIs[i].Path, api.Path)
		assert.Equal(t, testAPIs[i].Upstream, api.Upstream)
		assert.Equal(t, testAPIs[i].RequiredSubscription, api.RequiredSubscription)
	}
}
