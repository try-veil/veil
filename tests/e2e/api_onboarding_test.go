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

type APIOnboardRequest struct {
	Path                 string   `json:"path"`
	Upstream             string   `json:"upstream"`
	RequiredSubscription string   `json:"required_subscription"`
	Methods              []string `json:"methods"`
	RequiredHeaders      []string `json:"required_headers"`
	APIKeys              []APIKey `json:"api_keys"`
}

type APIKey struct {
	Key  string `json:"key"`
	Name string `json:"name"`
}

func TestAPIOnboardingAndValidation(t *testing.T) {
	// Clean up any existing database
	os.Remove("./veil.db")

	// Start the test upstream server
	upstreamCmd := exec.Command("python3", "../upstream/test-weather.py")
	upstreamCmd.Stdout = os.Stdout
	upstreamCmd.Stderr = os.Stderr
	err := upstreamCmd.Start()
	assert.NoError(t, err, "Failed to start upstream server")
	defer upstreamCmd.Process.Kill()

	// Start Caddy server
	caddyCmd := exec.Command("caddy", "run", "--config", "Caddyfile")
	caddyCmd.Stdout = os.Stdout
	caddyCmd.Stderr = os.Stderr
	err = caddyCmd.Start()
	assert.NoError(t, err, "Failed to start Caddy server")
	defer caddyCmd.Process.Kill()

	// Wait for servers to be ready
	time.Sleep(2 * time.Second)

	// Test cases
	t.Run("Complete API Onboarding Flow", func(t *testing.T) {
		// 1. Onboard the API
		onboardReq := APIOnboardRequest{
			Path:                 "/weather/*",
			Upstream:             "http://localhost:8082/weather",
			RequiredSubscription: "weather-subscription",
			Methods:              []string{"GET", "POST"},
			RequiredHeaders:      []string{"X-Test-Header"},
			APIKeys: []APIKey{
				{
					Key:  "valid-test-key",
					Name: "Valid Test Key",
				},
			},
		}

		reqBody, err := json.Marshal(onboardReq)
		assert.NoError(t, err, "Failed to marshal onboard request")

		resp, err := http.Post("http://localhost:2020/veil/api/onboard",
			"application/json",
			bytes.NewBuffer(reqBody))
		assert.NoError(t, err, "Failed to send onboard request")
		assert.Equal(t, http.StatusCreated, resp.StatusCode, "Expected status 201")
		resp.Body.Close()

		// Wait for configuration to be applied
		time.Sleep(1 * time.Second)

		// 2. Test with valid API key and headers
		t.Run("Valid API Key and Headers", func(t *testing.T) {
			req, _ := http.NewRequest("GET", "http://localhost:2020/weather/current", nil)
			req.Header.Set("X-Subscription-Key", "valid-test-key")
			req.Header.Set("X-Test-Header", "test-value")

			resp, err := http.DefaultClient.Do(req)
			assert.NoError(t, err)
			assert.Equal(t, http.StatusOK, resp.StatusCode)
			resp.Body.Close()
		})

		// 3. Test with invalid API key
		t.Run("Invalid API Key", func(t *testing.T) {
			req, _ := http.NewRequest("GET", "http://localhost:2020/weather/current", nil)
			req.Header.Set("X-Subscription-Key", "invalid-key")
			req.Header.Set("X-Test-Header", "test-value")

			resp, err := http.DefaultClient.Do(req)
			assert.NoError(t, err)
			assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
			resp.Body.Close()
		})

		// 4. Test with missing API key
		t.Run("Missing API Key", func(t *testing.T) {
			req, _ := http.NewRequest("GET", "http://localhost:2020/weather/current", nil)
			req.Header.Set("X-Test-Header", "test-value")

			resp, err := http.DefaultClient.Do(req)
			assert.NoError(t, err)
			assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
			resp.Body.Close()
		})

		// 5. Test with valid API key but missing required header
		t.Run("Missing Required Header", func(t *testing.T) {
			req, _ := http.NewRequest("GET", "http://localhost:2020/weather/current", nil)
			req.Header.Set("X-Subscription-Key", "valid-test-key")

			resp, err := http.DefaultClient.Do(req)
			assert.NoError(t, err)
			assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			resp.Body.Close()
		})

		// 6. Test with valid API key but wrong HTTP method
		t.Run("Wrong HTTP Method", func(t *testing.T) {
			req, _ := http.NewRequest("PUT", "http://localhost:2020/weather/current", nil)
			req.Header.Set("X-Subscription-Key", "valid-test-key")
			req.Header.Set("X-Test-Header", "test-value")

			resp, err := http.DefaultClient.Do(req)
			assert.NoError(t, err)
			assert.Equal(t, http.StatusMethodNotAllowed, resp.StatusCode)
			resp.Body.Close()
		})
	})
}
