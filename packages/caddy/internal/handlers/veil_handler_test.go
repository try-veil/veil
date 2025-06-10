package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/bytedance/mockey"
	"github.com/caddyserver/caddy/v2"
	"github.com/stretchr/testify/assert"
	"github.com/try-veil/veil/packages/caddy/internal/models"
	"go.uber.org/zap"
)

func TestVeilHandler_Provision(t *testing.T) {
	// Setup
	tmpDB := "test_veil.db"
	defer os.Remove(tmpDB)

	handler := &VeilHandler{
		DBPath:          tmpDB,
		SubscriptionKey: "X-Subscription-Key",
	}

	ctx := caddy.Context{
		Context: nil,
	}

	// Test
	err := handler.Provision(ctx)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, handler.Config)
	assert.NotNil(t, handler.store)
	assert.NotNil(t, handler.logger)
}

func TestVeilHandler_Validate(t *testing.T) {
	tests := []struct {
		name        string
		handler     *VeilHandler
		expectError bool
	}{
		{
			name: "Valid Configuration",
			handler: &VeilHandler{
				DBPath:          "test.db",
				SubscriptionKey: "X-Subscription-Key",
			},
			expectError: false,
		},
		{
			name: "Missing DBPath",
			handler: &VeilHandler{
				SubscriptionKey: "X-Subscription-Key",
			},
			expectError: true,
		},
		{
			name: "Missing SubscriptionKey",
			handler: &VeilHandler{
				DBPath: "test.db",
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.handler.Validate()
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// mockHandler implements caddyhttp.Handler for testing
type mockHandler struct {
	fn func(http.ResponseWriter, *http.Request)
}

func (h *mockHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) error {
	h.fn(w, r)
	return nil
}

func TestVeilHandler_ServeHTTP(t *testing.T) {
	// Setup
	tmpDB := "test_veil.db"
	defer os.Remove(tmpDB)

	handler := &VeilHandler{
		DBPath:          tmpDB,
		SubscriptionKey: "X-Subscription-Key",
		logger:          zap.NewNop(),
	}

	ctx := caddy.Context{
		Context: nil,
	}
	err := handler.Provision(ctx)

	assert.NoError(t, err)

	// Mock the admin API call for config updates
	mockConfig := &caddy.Config{
		AppsRaw: map[string]json.RawMessage{
			"http": json.RawMessage(`{
				"servers": {
					"srv0": {
						"listen": [":2020"],
						"routes": []
					},
					"srv1": {
						"listen": [":2021"],
						"routes": []
					}
				}
			}`),
		},
	}

	// Mock getCurrentConfig and caddy.Load
	configMocker := mockey.Mock((*VeilHandler).getCurrentConfig).Return(mockConfig, nil).Build()
	loadMocker := mockey.Mock(caddy.Load).Return(nil).Build()
	defer configMocker.Release()
	defer loadMocker.Release()

	active := true
	inactive := false

	// Create test API configuration
	api := CreateAPI(t, "/test/endpoint", "http://localhost:8082", "test-subscription", []string{"GET"}, []string{"X-Test-Header"}, []models.APIKey{
		{
			Key:      "test-key",
			Name:     "Test Key",
			IsActive: &active,
		},
		{
			Key:      "inactive-key",
			Name:     "Inactive Key",
			IsActive: &inactive,
		},
	})
	existing, _ := handler.store.GetAPIByPath("/test/endpoint")
	if existing == nil {
		err = handler.store.CreateAPI(api)
		assert.NoError(t, err)
	}

	// Verify the inactive key is properly set
	savedAPI, err := handler.store.GetAPIByPath("/test/endpoint")
	assert.NoError(t, err)
	assert.NotNil(t, savedAPI)

	// var foundInactiveKey bool
	// for _, key := range savedAPI.APIKeys {
	// 	if key.Key == "inactive-key" {
	// 		assert.False(t, key.IsActive, "inactive-key should be inactive")
	// 		foundInactiveKey = true
	// 		break
	// 	}
	// }
	// assert.True(t, foundInactiveKey, "inactive-key should exist in the database")

	tests := []struct {
		name         string
		path         string
		method       string
		headers      map[string]string
		expectedCode int
		nextHandler  func(http.ResponseWriter, *http.Request)
		isManagement bool
	}{
		{
			name:   "Valid Request",
			path:   "/test/endpoint",
			method: "GET",
			headers: map[string]string{
				"X-Subscription-Key": "test-key",
				"X-Test-Header":      "test",
			},
			expectedCode: http.StatusOK,
			nextHandler: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			},
			isManagement: false,
		},
		{
			name:   "Invalid API Key",
			path:   "/test/endpoint",
			method: "GET",
			headers: map[string]string{
				"X-Subscription-Key": "invalid-key",
				"X-Test-Header":      "test",
			},
			expectedCode: http.StatusUnauthorized,
			nextHandler: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			},
			isManagement: false,
		},
		{
			name:   "Missing Required Header",
			path:   "/test/endpoint",
			method: "GET",
			headers: map[string]string{
				"X-Subscription-Key": "test-key",
			},
			expectedCode: http.StatusBadRequest,
			nextHandler: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			},
			isManagement: false,
		},
		// {
		// 	name:   "Management API Request",
		// 	path:   "/veil/api/routes",
		// 	method: http.MethodPost,
		// 	headers: map[string]string{
		// 		"Content-Type": "application/json",
		// 	},
		// 	expectedCode: http.StatusCreated,
		// 	nextHandler: func(w http.ResponseWriter, r *http.Request) {
		// 		w.WriteHeader(http.StatusOK)
		// 	},
		// 	isManagement: true,
		// },
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request
			req := httptest.NewRequest(tt.method, tt.path, nil)
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}

			if tt.isManagement {
				// Add a test API config to the request body
				testAPI := models.APIOnboardRequest{
					Path:                 "/new-test/*",
					Upstream:             "http://localhost:8084",
					RequiredSubscription: "new-test-subscription",
					Methods:              []string{"GET"},
					RequiredHeaders:      []string{"X-New-Test-Header"},
					APIKeys: []models.APIKey{
						{
							Key:  "new-test-key",
							Name: "New Test Key",
						},
					},
				}
				body, err := json.Marshal(testAPI)
				assert.NoError(t, err)
				req = httptest.NewRequest(tt.method, tt.path, bytes.NewBuffer(body))
				req.Header.Set("Content-Type", "application/json")
			}

			// Create response recorder
			w := httptest.NewRecorder()

			// Create next handler
			next := &mockHandler{fn: tt.nextHandler}

			// Serve request
			err = handler.ServeHTTP(w, req, next)
			assert.NoError(t, err)

			// Check response
			assert.Equal(t, tt.expectedCode, w.Code)
		})
	}
}

func TestVeilHandler_handleOnboard(t *testing.T) {
	// Setup
	tmpDB := "test_veil.db"
	defer os.Remove(tmpDB)

	handler := &VeilHandler{
		DBPath:          tmpDB,
		SubscriptionKey: "X-Subscription-Key",
		logger:          zap.NewNop(),
	}

	ctx := caddy.Context{
		Context: nil,
	}
	err := handler.Provision(ctx)
	assert.NoError(t, err)
	assert.NotNil(t, handler.store)
	assert.NotNil(t, handler.logger)

	// Mock the admin API call for config updates
	mockConfig := &caddy.Config{
		AppsRaw: map[string]json.RawMessage{
			"http": json.RawMessage(`{
				"servers": {
					"srv0": {
						"listen": [":2020"],
						"routes": []
					},
					"srv1": {
						"listen": [":2021"],
						"routes": []
					}
				}
			}`),
		},
	}

	// Mock getCurrentConfig and caddy.Load
	configMocker := mockey.Mock((*VeilHandler).getCurrentConfig).Return(mockConfig, nil).Build()
	loadMocker := mockey.Mock(caddy.Load).Return(nil).Build()
	defer configMocker.Release()
	defer loadMocker.Release()

	tests := []struct {
		name         string
		request      models.APIOnboardRequest
		expectedCode int
	}{
		// {
		// 	name: "Valid Onboard Request",
		// 	request: models.APIOnboardRequest{
		// 		Path:                 "/test/*",
		// 		Upstream:             "http://localhost:8082",
		// 		RequiredSubscription: "test-subscription",
		// 		Methods:              []string{"GET"},
		// 		RequiredHeaders:      []string{"X-Test-Header"},
		// 		APIKeys: []models.APIKey{
		// 			{
		// 				Key:  "test-key-1",
		// 				Name: "Test Key-1",
		// 			},
		// 		},
		// 	},
		// 	expectedCode: http.StatusCreated,
		// },
		{
			name: "Invalid Request - Missing Path",
			request: models.APIOnboardRequest{
				Upstream:             "http://localhost:8082",
				RequiredSubscription: "test-subscription",
				Methods:              []string{"GET"},
			},
			expectedCode: http.StatusBadRequest,
		},
		{
			name: "Invalid Request - Missing Upstream",
			request: models.APIOnboardRequest{
				Path:                 "/test/*",
				RequiredSubscription: "test-subscription",
				Methods:              []string{"GET"},
			},
			expectedCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request body
			body, err := json.Marshal(tt.request)
			assert.NoError(t, err)

			// Create request
			req := httptest.NewRequest("POST", "/veil/api/routes", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			// Create response recorder
			w := httptest.NewRecorder()

			// Handle request
			err = handler.handleOnboard(w, req)
			assert.NoError(t, err)

			// Check response
			assert.Equal(t, tt.expectedCode, w.Code)

			if tt.expectedCode == http.StatusCreated {
				var response map[string]interface{}
				err = json.NewDecoder(w.Body).Decode(&response)
				assert.NoError(t, err)
				assert.Equal(t, "success", response["status"])
			}
		})
	}
}

func TestVeilHandler_validateAPIKey(t *testing.T) {
	// Setup
	tmpDB := "test_veil.db"
	defer os.Remove(tmpDB)

	handler := &VeilHandler{
		DBPath:          tmpDB,
		SubscriptionKey: "X-Subscription-Key",
		logger:          zap.NewNop(),
	}

	ctx := caddy.Context{
		Context: nil,
	}
	err := handler.Provision(ctx)
	assert.NoError(t, err)

	active := true
	inactive := false

	// Create test API configuration
	api := CreateAPI(t, "/test/endpoint", "http://localhost:8082", "test-subscription", []string{"GET"}, []string{"X-Test-Header"}, []models.APIKey{
		{
			Key:      "test-key",
			Name:     "Test Key",
			IsActive: &active,
		},
		// TODO: Fix this
		{
			Key:      "inactive-key",
			Name:     "Inactive Key",
			IsActive: &inactive,
		},
	})
	existing, _ := handler.store.GetAPIByPath("/test/endpoint")
	if existing == nil {
		err = handler.store.CreateAPI(api)
		assert.NoError(t, err)
	}

	// Verify the inactive key is properly set
	savedAPI, err := handler.store.GetAPIByPath("/test/endpoint")
	assert.NoError(t, err)
	assert.NotNil(t, savedAPI)

	var foundInactiveKey bool
	for _, key := range savedAPI.APIKeys {
		if key.Key == "inactive-key" {
			assert.False(t, *key.IsActive, "inactive-key should be inactive")
			foundInactiveKey = true
			break
		}
	}
	assert.True(t, foundInactiveKey, "inactive-key should exist in the database")

	tests := []struct {
		name       string
		path       string
		apiKey     string
		wantErr    bool
		wantConfig *models.APIConfig
	}{
		{
			name:       "Valid API Key",
			path:       "/test/endpoint",
			apiKey:     "test-key",
			wantErr:    false,
			wantConfig: api,
		},
		{
			name:       "Invalid API Key",
			path:       "/test/endpoint",
			apiKey:     "invalid-key",
			wantErr:    true,
			wantConfig: nil,
		},
		// TODO: Fix this
		{
			name:       "Inactive API Key",
			path:       "/test/endpoint",
			apiKey:     "inactive-key",
			wantErr:    true,
			wantConfig: nil,
		},
		{
			name:       "Empty API Key",
			path:       "/test/endpoint",
			apiKey:     "",
			wantErr:    true,
			wantConfig: nil,
		},
		{
			name:       "Non-existent Path",
			path:       "/nonexistent/endpoint",
			apiKey:     "test-key",
			wantErr:    true,
			wantConfig: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			api, err := handler.validateAPIKey(tt.path, tt.apiKey)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, api)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, api)
				assert.Equal(t, tt.wantConfig.Path, api.Path)
			}
		})
	}
}

// CreateAPI is a helper function to create a test API configuration
func CreateAPI(t *testing.T, path, upstream, subscription string, methods, headers []string, keys []models.APIKey) *models.APIConfig {
	apiConfig := &models.APIConfig{
		Path:                 path,
		Upstream:             upstream,
		RequiredSubscription: subscription,
		RequiredHeaders:      headers,
		Methods:              make([]models.APIMethod, 0, len(methods)),
		APIKeys:              keys,
	}
	for _, method := range methods {
		apiConfig.Methods = append(apiConfig.Methods, models.APIMethod{Method: method})
	}
	return apiConfig
}

func TestVeilHandler_getUpstreamDialAddress(t *testing.T) {
	handler := &VeilHandler{}

	tests := []struct {
		name     string
		upstream string
		want     string
	}{
		{
			name:     "HTTPS URL without port",
			upstream: "https://httpbin.org",
			want:     "httpbin.org:443",
		},
		{
			name:     "HTTPS URL with port",
			upstream: "https://httpbin.org:8443",
			want:     "httpbin.org:8443",
		},
		{
			name:     "HTTP URL without port",
			upstream: "http://localhost",
			want:     "localhost:80",
		},
		{
			name:     "HTTP URL with port",
			upstream: "http://localhost:8080",
			want:     "localhost:8080",
		},
		{
			name:     "Invalid URL",
			upstream: "://invalid",
			want:     "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := handler.getUpstreamDialAddress(tt.upstream)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestVeilHandler_getUpstreamHost(t *testing.T) {
	handler := &VeilHandler{}

	tests := []struct {
		name     string
		upstream string
		want     string
	}{
		{
			name:     "HTTPS URL without port",
			upstream: "https://httpbin.org",
			want:     "httpbin.org",
		},
		{
			name:     "HTTPS URL with port",
			upstream: "https://httpbin.org:8443",
			want:     "httpbin.org",
		},
		{
			name:     "HTTP URL without port",
			upstream: "http://localhost",
			want:     "localhost",
		},
		{
			name:     "HTTP URL with port",
			upstream: "http://localhost:8080",
			want:     "localhost:8080",
		},
		{
			name:     "Invalid URL",
			upstream: "://invalid",
			want:     "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := handler.getUpstreamHost(tt.upstream)
			assert.Equal(t, tt.want, got)
		})
	}
}
