package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"testing"
	"time"

	"database/sql"

	_ "github.com/mattn/go-sqlite3"
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

	// Start the test upstream server
	upstreamCmd1 := exec.Command("python3", "../upstream/test-orders.py")
	upstreamCmd1.Stdout = os.Stdout
	upstreamCmd1.Stderr = os.Stderr
	err = upstreamCmd1.Start()
	assert.NoError(t, err, "Failed to start upstream server")
	defer upstreamCmd1.Process.Kill()

	// Start Caddy server
	caddyCmd := exec.Command("./veil", "run", "--config", "Caddyfile")
	caddyCmd.Stdout = os.Stdout
	caddyCmd.Stderr = os.Stderr
	err = caddyCmd.Start()
	assert.NoError(t, err, "Failed to start Caddy server")
	defer caddyCmd.Process.Kill()

	// Wait for servers to be ready
	time.Sleep(2 * time.Second)

	active := true

	// Test cases
	t.Run("Complete API Key Management Flow", func(t *testing.T) {
		// 1. First onboard an API
		weatherOnboardReq := APIOnboardRequest{
			Path:                 "/weather/*",
			Upstream:             "http://localhost:8083/weather",
			RequiredSubscription: "weather-subscription",
			Methods:              []string{"GET"},
			RequiredHeaders:      []string{"X-Test-Header"},
			APIKeys: []APIKey{
				{
					Key:      "initial-key",
					Name:     "Initial Key",
					IsActive: &active,
				},
			},
		}

		reqBody, err := json.Marshal(weatherOnboardReq)
		assert.NoError(t, err, "Failed to marshal weather onboard request")

		resp, err := http.Post("http://localhost:2020/veil/api/routes",
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
						Key:      "new-key-1",
						Name:     "New Key 1",
						IsActive: &active,
					},
					{
						Key:  "new-key-2",
						Name: "New Key 2",
					},
				},
			}

			reqBody, err := json.Marshal(addKeysReq)
			assert.NoError(t, err, "Failed to marshal add keys request")

			resp, err := http.Post("http://localhost:2020/veil/api/keys",
				"application/json",
				bytes.NewBuffer(reqBody))
			assert.NoError(t, err, "Failed to send add keys request")
			assert.Equal(t, http.StatusCreated, resp.StatusCode)

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
				req, _ := http.NewRequest("GET", "http://localhost:2021/weather/current", nil)
				req.Header.Set("X-Subscription-Key", "initial-key")
				req.Header.Set("X-Test-Header", "test")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusOK, resp.StatusCode)
				resp.Body.Close()
			})

			// Test with new key 1
			t.Run("New Key 1 Access", func(t *testing.T) {
				req, _ := http.NewRequest("GET", "http://localhost:2021/weather/current", nil)
				req.Header.Set("X-Subscription-Key", "new-key-1")
				req.Header.Set("X-Test-Header", "test")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusOK, resp.StatusCode)
				resp.Body.Close()
			})

			// Test with invalid key
			t.Run("Invalid Key Access", func(t *testing.T) {
				req, _ := http.NewRequest("GET", "http://localhost:2021/weather/current", nil)
				req.Header.Set("X-Subscription-Key", "invalid-key")
				req.Header.Set("X-Test-Header", "test")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
				resp.Body.Close()
			})
		})

		inactive := false

		// 4. Test updating API key status
		t.Run("Update API Key Status", func(t *testing.T) {
			// Deactivate new-key-1
			updateReq := APIKeyStatusRequest{
				Path:     "/weather/*",
				APIKey:   "new-key-1",
				IsActive: &inactive,
			}

			reqBody, err := json.Marshal(updateReq)
			assert.NoError(t, err, "Failed to marshal update status request")

			req, _ := http.NewRequest("PUT", "http://localhost:2020/veil/api/keys/status",
				bytes.NewBuffer(reqBody))
			req.Header.Set("Content-Type", "application/json")

			resp, err := http.DefaultClient.Do(req)
			assert.NoError(t, err, "Failed to send update status request")
			assert.Equal(t, http.StatusOK, resp.StatusCode)
			resp.Body.Close()

			// Try to access API with deactivated key
			req, _ = http.NewRequest("GET", "http://localhost:2021/weather/current", nil)
			req.Header.Set("X-Subscription-Key", "new-key-1")
			req.Header.Set("X-Test-Header", "test")

			resp, err = http.DefaultClient.Do(req)
			assert.NoError(t, err)
			assert.Equal(t, http.StatusUnauthorized, resp.StatusCode, "Deactivated key should not work")
			resp.Body.Close()

			// Verify other keys still work
			req, _ = http.NewRequest("GET", "http://localhost:2021/weather/current", nil)
			req.Header.Set("X-Subscription-Key", "new-key-2")
			req.Header.Set("X-Test-Header", "test")

			resp, err = http.DefaultClient.Do(req)
			assert.NoError(t, err)
			assert.Equal(t, http.StatusOK, resp.StatusCode, "Other keys should still work")
			resp.Body.Close()
		})

		// 5. Test deleting an API key
		t.Run("Delete API Key", func(t *testing.T) {
			// Prepare the request to delete an existing key
			deleteReq := APIKeyDeleteRequest{
				Path:   "/weather/*",
				APIKey: "new-key-2", // Key to delete
			}

			reqBody, err := json.Marshal(deleteReq)
			assert.NoError(t, err, "Failed to marshal delete key request")

			// Send DELETE request to management API
			req, err := http.NewRequest("DELETE", "http://localhost:2020/veil/api/keys",
				bytes.NewBuffer(reqBody))
			assert.NoError(t, err, "Failed to create delete request")
			req.Header.Set("Content-Type", "application/json")

			resp, err := http.DefaultClient.Do(req)
			assert.NoError(t, err, "Failed to send delete key request")
			assert.Equal(t, http.StatusOK, resp.StatusCode, "Expected status OK for deletion")
			resp.Body.Close()

			// Try to access the resource using deleted key
			t.Run("Access With Deleted Key", func(t *testing.T) {
				req, _ := http.NewRequest("GET", "http://localhost:2021/weather/current", nil)
				req.Header.Set("X-Subscription-Key", "new-key-2")
				req.Header.Set("X-Test-Header", "test")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err, "Failed to make request with deleted key")
				assert.Equal(t, http.StatusUnauthorized, resp.StatusCode, "Deleted key should be unauthorized")
				resp.Body.Close()
			})
		})

		// 6. Test edge cases

		t.Run("Edge Cases", func(t *testing.T) {
			t.Run("Add Duplicate Key", func(t *testing.T) {
				// DB Query Before
				db, err := sql.Open("sqlite3", "./veil.db")
				assert.NoError(t, err, "Failed to open database")
				defer db.Close()

				getKeyRows := func() []string {
					rows, err := db.Query(`
						SELECT key, name, is_active, deleted_at
						FROM api_keys
						WHERE api_config_id = (SELECT id FROM api_configs WHERE path = '/weather/*')
					`)
					assert.NoError(t, err, "Failed to query key rows")

					defer rows.Close()
					var keys []string
					for rows.Next() {
						var key, name string
						var isActive sql.NullBool
						var deletedAt sql.NullString
						err := rows.Scan(&key, &name, &isActive, &deletedAt)
						assert.NoError(t, err)

						keys = append(keys, fmt.Sprintf("%s|%s|%v|%s", key, name, isActive.Bool, deletedAt.String))
					}
					return keys
				}

				before := getKeyRows()

				// Add duplicate key
				addKeysReq := APIKeyRequest{
					Path: "/weather/*",
					APIKeys: []APIKey{
						{
							Key:  "initial-key", // Already exists
							Name: "Duplicate Key",
						},
					},
				}

				reqBody, err := json.Marshal(addKeysReq)
				assert.NoError(t, err)

				resp, err := http.Post("http://localhost:2020/veil/api/keys",
					"application/json",
					bytes.NewBuffer(reqBody))
				assert.NoError(t, err)
				assert.Equal(t, http.StatusCreated, resp.StatusCode)

				var response map[string]interface{}
				err = json.NewDecoder(resp.Body).Decode(&response)
				assert.NoError(t, err)
				resp.Body.Close()

				// DB Query After
				after := getKeyRows()

				// Final Assertion
				assert.Equal(t, before, after, "Database state should remain unchanged when adding duplicate key")

				// Verify key count hasn't changed
				api := response["api"].(map[string]interface{})
				apiKeys := api["api_keys"].([]interface{})
				assert.Equal(t, 2, len(apiKeys), "Duplicate key should not be added")
			})

			// Test updating non-existent key
			t.Run("Update Non-existent Key", func(t *testing.T) {
				updateReq := APIKeyStatusRequest{
					Path:     "/weather/*",
					APIKey:   "non-existent-key",
					IsActive: &inactive,
				}

				reqBody, err := json.Marshal(updateReq)
				assert.NoError(t, err)

				req, _ := http.NewRequest("PUT", "http://localhost:2020/veil/api/keys/status",
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

				resp, err := http.Post("http://localhost:2020/veil/api/keys",
					"application/json",
					bytes.NewBuffer(reqBody))
				assert.NoError(t, err)
				assert.Equal(t, http.StatusNotFound, resp.StatusCode)
				resp.Body.Close()
			})
		})
	})

}
