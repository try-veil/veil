package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)
func TestAPIOnboardingAndValidation(t *testing.T) {
	// Clean up any existing database and configs
	os.Remove("./veil.db")
	os.RemoveAll("./configs")

	// Start the test upstream server
	// upstreamCmd := exec.Command("python3", "../upstream/test-weather.py")
	// upstreamCmd.Stdout = os.Stdout
	// upstreamCmd.Stderr = os.Stderr
	// err := upstreamCmd.Start()
	// assert.NoError(t, err, "Failed to start upstream server")
	// defer upstreamCmd.Process.Kill()

	// Start the test upstream server
	// upstreamCmd1 := exec.Command("python3", "../upstream/test-orders.py")
	// upstreamCmd1.Stdout = os.Stdout
	// upstreamCmd1.Stderr = os.Stderr
	// err = upstreamCmd1.Start()
	// assert.NoError(t, err, "Failed to start upstream server")
	// defer upstreamCmd1.Process.Kill()

	// Start Caddy server
	caddyCmd := exec.Command("./veil", "run", "--config", "Caddyfile")
	caddyCmd.Stdout = os.Stdout
	caddyCmd.Stderr = os.Stderr
	err := caddyCmd.Start()
	assert.NoError(t, err, "Failed to start Caddy server")
	defer caddyCmd.Process.Kill()

	// Wait for servers to be ready
	time.Sleep(2 * time.Second)

	active := true
	// Test cases
	t.Run("Complete API Onboarding Flow", func(t *testing.T) {
		// 1. Onboard the Weather API
		weatherOnboardReq := APIOnboardRequest{
			Path:                 "/weather/*",
			Upstream:             "http://localhost:8083/weather",
			RequiredSubscription: "weather-subscription",
			Methods:              []string{"GET"},
			RequiredHeaders:      []string{"X-Test-Header"},
			APIKeys: []APIKey{
				{
					Key:      "weather-test-key-2",
					Name:     "Weather Test Key 2",
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

		body, err := io.ReadAll(resp.Body)
		assert.NoError(t, err, "Failed to read response body")
		resp.Body.Close()

		var onboardResp APIOnboardResponse
		err = json.Unmarshal(body, &onboardResp)
		assert.NoError(t, err, "Failed to unmarshal response")

		assert.Equal(t, http.StatusCreated, resp.StatusCode, "Expected status 201, got %d. Response: %s", resp.StatusCode, string(body))
		assert.Equal(t, "success", onboardResp.Status, "Expected status 'success', got %s", onboardResp.Status)

		// Wait for configuration to be applied
		time.Sleep(1 * time.Second)

		// 2. Onboard the Order API
		orderOnboardReq := APIOnboardRequest{
			Path:                 "/order/*",
			Upstream:             "http://localhost:8082/order",
			RequiredSubscription: "order-subscription",
			Methods:              []string{"GET"},
			RequiredHeaders:      []string{"X-Test-Header"},
			APIKeys: []APIKey{
				{
					Key:      "order-test-key-2",
					Name:     "Order Test Key 2",
					IsActive: &active,
				},
			},
		}

		reqBody, err = json.Marshal(orderOnboardReq)
		assert.NoError(t, err, "Failed to marshal order onboard request")

		resp, err = http.Post("http://localhost:2020/veil/api/routes",
			"application/json",
			bytes.NewBuffer(reqBody))
		assert.NoError(t, err, "Failed to send order onboard request")

		body, err = io.ReadAll(resp.Body)
		assert.NoError(t, err, "Failed to read response body")
		resp.Body.Close()

		err = json.Unmarshal(body, &onboardResp)
		assert.NoError(t, err, "Failed to unmarshal response")

		assert.Equal(t, http.StatusCreated, resp.StatusCode, "Expected status 201, got %d. Response: %s", resp.StatusCode, string(body))
		assert.Equal(t, "success", onboardResp.Status, "Expected status 'success', got %s", onboardResp.Status)

		// Wait for configuration to be applied
		time.Sleep(1 * time.Second)

		// Test Weather API Access
		t.Run("Weather API Access", func(t *testing.T) {
			// Test with valid API key and headers
			t.Run("Valid API Key and Headers", func(t *testing.T) {
				req, _ := http.NewRequest("GET", "http://localhost:2021/weather/current", nil)
				req.Header.Set("X-Subscription-Key", "weather-test-key-2")
				req.Header.Set("X-Test-Header", "test")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusOK, resp.StatusCode)

				body, err := io.ReadAll(resp.Body)
				assert.NoError(t, err)
				resp.Body.Close()

				fmt.Printf("Weather API Response: %s\n", string(body))
			})

			// Test with invalid API key
			t.Run("Invalid API Key", func(t *testing.T) {
				req, _ := http.NewRequest("GET", "http://localhost:2021/weather/current", nil)
				req.Header.Set("X-Subscription-Key", "invalid-key")
				req.Header.Set("X-Test-Header", "test")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
				resp.Body.Close()
			})

			// Test with missing required header
			t.Run("Missing Required Header", func(t *testing.T) {
				req, _ := http.NewRequest("GET", "http://localhost:2021/weather/current", nil)
				req.Header.Set("X-Subscription-Key", "weather-test-key-2")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				resp.Body.Close()
			})
		})

		// Wait for configuration to be applied
		time.Sleep(1 * time.Second)

		// Test Order API Access
		t.Run("Order API Access", func(t *testing.T) {
			// Test with valid API key and headers
			t.Run("Valid API Key and Headers", func(t *testing.T) {
				req, _ := http.NewRequest("GET", "http://localhost:2021/order/current", nil)
				req.Header.Set("X-Subscription-Key", "order-test-key-2")
				req.Header.Set("X-Test-Header", "test")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusOK, resp.StatusCode)

				body, err := io.ReadAll(resp.Body)
				assert.NoError(t, err)
				resp.Body.Close()

				fmt.Printf("Order API Response: %s\n", string(body))
			})

			// Test with invalid API key
			t.Run("Invalid API Key", func(t *testing.T) {
				req, _ := http.NewRequest("GET", "http://localhost:2021/order/current", nil)
				req.Header.Set("X-Subscription-Key", "invalid-key")
				req.Header.Set("X-Test-Header", "test")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
				resp.Body.Close()
			})

			// Test with missing required header
			t.Run("Missing Required Header", func(t *testing.T) {
				req, _ := http.NewRequest("GET", "http://localhost:2021/order/current", nil)
				req.Header.Set("X-Subscription-Key", "order-test-key-2")

				resp, err := http.DefaultClient.Do(req)
				assert.NoError(t, err)
				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				resp.Body.Close()
			})
		})

		// Verify Caddy Configuration
		t.Run("Verify Caddy Configuration", func(t *testing.T) {
			resp, err := http.Get("http://localhost:2019/config/")
			assert.NoError(t, err, "Failed to get Caddy config")

			body, err := io.ReadAll(resp.Body)
			assert.NoError(t, err, "Failed to read config response")
			resp.Body.Close()

			var config map[string]interface{}
			err = json.Unmarshal(body, &config)
			assert.NoError(t, err, "Failed to unmarshal config")

			// Verify that both API routes exist in the configuration
			apps, ok := config["apps"].(map[string]interface{})
			assert.True(t, ok, "Apps section not found in config")

			httpApp, ok := apps["http"].(map[string]interface{})
			assert.True(t, ok, "HTTP app not found in config")

			servers, ok := httpApp["servers"].(map[string]interface{})
			assert.True(t, ok, "Servers section not found in config")

			srv1, ok := servers["srv1"].(map[string]interface{})
			assert.True(t, ok, "srv1 not found in config")

			routes, ok := srv1["routes"].([]interface{})
			assert.True(t, ok, "Routes not found in config")

			// Verify that we have at least 3 routes (management API, weather API, and order API)
			assert.GreaterOrEqual(t, len(routes), 2, "Expected at least 2 routes in config")
		})
	})
}
