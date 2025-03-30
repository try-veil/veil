package e2e

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestAPIKeyManagement(t *testing.T) {
	// Clean up any existing database and configs
	os.Remove("./veil.db")
	os.RemoveAll("./configs")

	// Start the test upstream server
	upstreamCmd := exec.Command("python3", "../upstream/test-weather.py")
	upstreamCmd.Stdout = os.Stdout
	upstreamCmd.Stderr = os.Stderr
	err := upstreamCmd.Start()
	assert.NoError(t, err, "Failed to start upstream server")
	defer upstreamCmd.Process.Kill()

	// Start Caddy server
	caddyCmd := exec.Command("./veil", "run", "--config", "Caddyfile")
	caddyCmd.Stdout = os.Stdout
	caddyCmd.Stderr = os.Stderr
	err = caddyCmd.Start()
	assert.NoError(t, err, "Failed to start Caddy server")
	defer caddyCmd.Process.Kill()

	// Wait for servers to be ready
	time.Sleep(2 * time.Second)

	// Test cases
	t.Run("Complete API Key Management Flow", func(t *testing.T) {
		// 1. First onboard an API
		weatherOnboardReq := APIOnboardRequest{
			Path:                 "/weather/*",
			Upstream:             "http://localhost:8082/weather",
			RequiredSubscription: "weather-subscription",
			Methods:              []string{"GET"},
			RequiredHeaders:      []string{"X-Test-Header"},
			APIKeys: []APIKey{
				{
					Key:      "initial-key",
					Name:     "Initial Key",
					IsActive: true,
				},
			},
		}

		reqBody, err := json.Marshal(weatherOnboardReq)
		assert.NoError(t, err, "Failed to marshal weather onboard request")

		resp, err := http.Post("http://localhost:2020/veil/api/onboard",
			"application/json",
			bytes.NewBuffer(reqBody))
		assert.NoError(t, err, "Failed to send weather onboard request")
		assert.Equal(t, http.StatusCreated, resp.StatusCode)
		resp.Body.Close()

		// Wait for configuration to be applied
		time.Sleep(1 * time.Second)

		// 2. Test adding new API keys
		t.Run("Add New API Keys", func(t *testing.T) {
			addKeysReq := APIKeyRequest{
				Path: "/weather/*",
				APIKeys: []APIKey{
					{
						Key:  "new-key-1",
						Name: "New Key 1",
					},
					{
						Key:  "new-key-2",
						Name: "New Key 2",
					},
				},
			}

			reqBody, err := json.Marshal(addKeysReq)
			assert.NoError(t, err, "Failed to marshal add keys request")

			resp, err := http.Post("http://localhost:2020/veil/api/api-keys",
				"application/json",
				bytes.NewBuffer(reqBody))
			assert.NoError(t, err, "Failed to send add keys request")
			assert.Equal(t, http.StatusOK, resp.StatusCode)

			var response map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&response)
			assert.NoError(t, err, "Failed to decode response")
			resp.Body.Close()

			assert.Equal(t, "success", response["status"])
			api := response["api"].(map[string]interface{})
			apiKeys := api["api_keys"].([]interface{})
			assert.Equal(t, 3, len(apiKeys), "Expected 3 API keys (1 initial + 2 new)")
		})

		// 3. Test API access with different keys
		t.Run("API Access with Different Keys", func(t *testing.T) {
			// Test with initial key
			t.Run("Initial Key Access", func(t *testing.T) {
				req, _ := http.NewRequest("GET", "http://localhost:2020/weather/current", nil)
				req.Header.Set("X-Subscription-Key", "initial-key")
				req.Header.Set("X-Test-Header", "test")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusOK, resp.StatusCode)
				resp.Body.Close()
			})

			// Test with new key 1
			t.Run("New Key 1 Access", func(t *testing.T) {
				req, _ := http.NewRequest("GET", "http://localhost:2020/weather/current", nil)
				req.Header.Set("X-Subscription-Key", "new-key-1")
				req.Header.Set("X-Test-Header", "test")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusOK, resp.StatusCode)
				resp.Body.Close()
			})

			// Test with invalid key
			t.Run("Invalid Key Access", func(t *testing.T) {
				req, _ := http.NewRequest("GET", "http://localhost:2020/weather/current", nil)
				req.Header.Set("X-Subscription-Key", "invalid-key")
				req.Header.Set("X-Test-Header", "test")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
				resp.Body.Close()
			})
		})

		// 4. Test updating API key status
		t.Run("Update API Key Status", func(t *testing.T) {
			// Deactivate new-key-1
			updateReq := APIKeyStatusRequest{
				Path:     "/weather/*",
				APIKey:   "new-key-1",
				IsActive: false,
			}

			reqBody, err := json.Marshal(updateReq)
			assert.NoError(t, err, "Failed to marshal update status request")

			req, _ := http.NewRequest("PUT", "http://localhost:2020/veil/api/api-keys/status",
				bytes.NewBuffer(reqBody))
			req.Header.Set("Content-Type", "application/json")

			resp, err := http.DefaultClient.Do(req)
			assert.NoError(t, err, "Failed to send update status request")
			assert.Equal(t, http.StatusOK, resp.StatusCode)
			resp.Body.Close()

			// Try to access API with deactivated key
			req, _ = http.NewRequest("GET", "http://localhost:2020/weather/current", nil)
			req.Header.Set("X-Subscription-Key", "new-key-1")
			req.Header.Set("X-Test-Header", "test")

			resp, err = http.DefaultClient.Do(req)
			assert.NoError(t, err)
			assert.Equal(t, http.StatusUnauthorized, resp.StatusCode, "Deactivated key should not work")
			resp.Body.Close()

			// Verify other keys still work
			req, _ = http.NewRequest("GET", "http://localhost:2020/weather/current", nil)
			req.Header.Set("X-Subscription-Key", "new-key-2")
			req.Header.Set("X-Test-Header", "test")

			resp, err = http.DefaultClient.Do(req)
			assert.NoError(t, err)
			assert.Equal(t, http.StatusOK, resp.StatusCode, "Other keys should still work")
			resp.Body.Close()
		})

		// 5. Test edge cases
		t.Run("Edge Cases", func(t *testing.T) {
			// Test adding duplicate key
			t.Run("Add Duplicate Key", func(t *testing.T) {
				addKeysReq := APIKeyRequest{
					Path: "/weather/*",
					APIKeys: []APIKey{
						{
							Key:  "new-key-2", // Already exists
							Name: "Duplicate Key",
						},
					},
				}

				reqBody, err := json.Marshal(addKeysReq)
				assert.NoError(t, err)

				resp, err := http.Post("http://localhost:2020/veil/api/api-keys",
					"application/json",
					bytes.NewBuffer(reqBody))
				assert.NoError(t, err)
				assert.Equal(t, http.StatusOK, resp.StatusCode)

				var response map[string]interface{}
				err = json.NewDecoder(resp.Body).Decode(&response)
				assert.NoError(t, err)
				resp.Body.Close()

				// Verify key count hasn't changed
				api := response["api"].(map[string]interface{})
				apiKeys := api["api_keys"].([]interface{})
				assert.Equal(t, 3, len(apiKeys), "Duplicate key should not be added")
			})

			// Test updating non-existent key
			t.Run("Update Non-existent Key", func(t *testing.T) {
				updateReq := APIKeyStatusRequest{
					Path:     "/weather/*",
					APIKey:   "non-existent-key",
					IsActive: false,
				}

				reqBody, err := json.Marshal(updateReq)
				assert.NoError(t, err)

				req, _ := http.NewRequest("PUT", "http://localhost:2020/veil/api/api-keys/status",
					bytes.NewBuffer(reqBody))
				req.Header.Set("Content-Type", "application/json")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusNotFound, resp.StatusCode)
				resp.Body.Close()
			})

			// Test adding keys to non-existent API
			t.Run("Add Keys to Non-existent API", func(t *testing.T) {
				addKeysReq := APIKeyRequest{
					Path: "/non-existent/*",
					APIKeys: []APIKey{
						{
							Key:  "new-key",
							Name: "New Key",
						},
					},
				}

				reqBody, err := json.Marshal(addKeysReq)
				assert.NoError(t, err)

				resp, err := http.Post("http://localhost:2020/veil/api/api-keys",
					"application/json",
					bytes.NewBuffer(reqBody))
				assert.NoError(t, err)
				assert.Equal(t, http.StatusNotFound, resp.StatusCode)
				resp.Body.Close()
			})
		})
	})

	t.Run("Add API Keys", func(t *testing.T) {
		// First onboard an API
		onboardRequest := APIOnboardRequest{
			Path:                 "/weather/*",
			Upstream:             "http://localhost:8080",
			RequiredSubscription: "weather-subscription",
			Methods:              []string{"GET"},
			RequiredHeaders:      []string{"X-Test-Header"},
			APIKeys: []APIKey{
				{
					Key:  "weather-key-1",
					Name: "Weather Key 1",
				},
			},
		}

		requestBody, err := json.Marshal(onboardRequest)
		assert.NoError(t, err, "Failed to marshal request")

		// Use port 2020 for management API
		resp, err := http.Post("http://localhost:2020/veil/api/onboard",
			"application/json",
			bytes.NewBuffer(requestBody))
		assert.NoError(t, err, "Failed to send onboard request")
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode, "Expected status created")

		// Add new API keys
		addKeysRequest := APIKeyRequest{
			Path: "/weather/*",
			APIKeys: []APIKey{
				{
					Key:  "weather-key-2",
					Name: "Weather Key 2",
				},
			},
		}

		requestBody, err = json.Marshal(addKeysRequest)
		assert.NoError(t, err, "Failed to marshal request")

		// Use port 2020 for management API
		resp, err = http.Post("http://localhost:2020/veil/api/api-keys",
			"application/json",
			bytes.NewBuffer(requestBody))
		assert.NoError(t, err, "Failed to send add keys request")
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode, "Expected status OK")

		// Test access with new API key using port 2021
		t.Run("Test API Access with New Key", func(t *testing.T) {
			client := &http.Client{}
			req, err := http.NewRequest("GET", "http://localhost:2021/weather/current", nil)
			assert.NoError(t, err, "Failed to create request")

			req.Header.Set("X-Subscription-Key", "weather-key-2")
			req.Header.Set("X-Test-Header", "test")

			resp, err := client.Do(req)
			assert.NoError(t, err, "Failed to send request")
			defer resp.Body.Close()

			assert.Equal(t, http.StatusOK, resp.StatusCode, "Expected status OK")
		})
	})
}
