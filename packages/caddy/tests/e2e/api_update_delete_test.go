package e2e

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestAPIUpdationAndDeletion(t *testing.T) {
	// Clean up old data
	os.Remove("./veil.db")
	os.RemoveAll("./configs")

	// Start upstream service
	upstreamCmd := exec.Command("python3", "../upstream/test-weather.py")
	upstreamCmd.Stdout = os.Stdout
	upstreamCmd.Stderr = os.Stderr
	err := upstreamCmd.Start()
	assert.NoError(t, err, "Failed to start upstream")
	defer upstreamCmd.Process.Kill()

	// Start Caddy
	caddyCmd := exec.Command("./veil", "run", "--config", "Caddyfile")
	caddyCmd.Stdout = os.Stdout
	caddyCmd.Stderr = os.Stderr
	err = caddyCmd.Start()
	assert.NoError(t, err, "Failed to start Caddy")
	defer caddyCmd.Process.Kill()

	time.Sleep(3 * time.Second)

	active := true

	// Onboard first API
	onboardReq1 := APIOnboardRequest{
		Path:                 "/weather/*",
		Upstream:             "http://localhost:8083/weather",
		RequiredSubscription: "weather-subscription",
		Methods:              []string{"GET"},
		RequiredHeaders:      []string{"X-Test-Header"},
		APIKeys: []APIKey{
			{
				Key:      "weather-key",
				Name:     "Weather Key",
				IsActive: &active,
			},
		},
	}
	bodyBytes1, _ := json.Marshal(onboardReq1)
	resp1, err := http.Post("http://localhost:2020/veil/api/routes", "application/json", bytes.NewReader(bodyBytes1))
	assert.NoError(t, err)
	defer resp1.Body.Close()
	assert.Equal(t, http.StatusCreated, resp1.StatusCode)

	// Onboard second API
	onboardReq2 := APIOnboardRequest{
		Path:                 "/climate/*",
		Upstream:             "http://localhost:8083/climate",
		RequiredSubscription: "climate-subscription",
		Methods:              []string{"GET"},
		RequiredHeaders:      []string{"X-Test-Header"},
		APIKeys: []APIKey{
			{
				Key:      "climate-key",
				Name:     "Climate Key",
				IsActive: &active,
			},
		},
	}
	bodyBytes2, _ := json.Marshal(onboardReq2)
	resp2, err := http.Post("http://localhost:2020/veil/api/routes", "application/json", bytes.NewReader(bodyBytes2))
	assert.NoError(t, err)
	defer resp2.Body.Close()
	assert.Equal(t, http.StatusCreated, resp2.StatusCode)

	time.Sleep(1 * time.Second)

	// Update the first API
	updateReq := APIOnboardRequest{
		Path:                 "/weather/*",
		Upstream:             "http://localhost:8083/weather",
		RequiredSubscription: "weather-subscription",
		Methods:              []string{"POST"},
		RequiredHeaders:      []string{"X-Test-Header"},
	}
	updateBody, _ := json.Marshal(updateReq)
	req, err := http.NewRequest(http.MethodPut, "http://localhost:2020/veil/api/routes/weather/*", bytes.NewBuffer(updateBody))
	req.Header.Set("Content-Type", "application/json")
	assert.NoError(t, err)

	resp3, err := http.DefaultClient.Do(req)
	assert.NoError(t, err)
	defer resp3.Body.Close()
	respContent, _ := io.ReadAll(resp3.Body)
	assert.Equal(t, http.StatusCreated, resp3.StatusCode)
	assert.Contains(t, string(respContent), "API updated successfully")

	// Delete the second API
	req, err = http.NewRequest(http.MethodDelete, "http://localhost:2020/veil/api/routes/climate/", nil)
	req.Header.Set("X-Subscription-Key", "climate-key")
	req.Header.Set("X-Test-Header", "test")
	assert.NoError(t, err)

	resp4, err := http.DefaultClient.Do(req)
	assert.NoError(t, err)
	defer resp4.Body.Close()
	body, err := io.ReadAll(resp4.Body)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp4.StatusCode)
	assert.Contains(t, string(body), "API deleted successfully")

	// Access updated weather API
	t.Run("Access Updated Weather API", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "http://localhost:2021/weather/current", nil)
		req.Header.Set("X-Subscription-Key", "weather-key")
		req.Header.Set("X-Test-Header", "test")
		resp5, err := http.DefaultClient.Do(req)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp5.StatusCode)
	})

	// Access deleted climate API
	t.Run("Access Deleted Climate API", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "http://localhost:2021/climate/current", nil)
		req.Header.Set("X-Subscription-Key", "climate-key")
		req.Header.Set("X-Test-Header", "test")
		resp6, err := http.DefaultClient.Do(req)
		assert.NoError(t, err)
		defer resp6.Body.Close()
		assert.Contains(t, []int{http.StatusUnauthorized, http.StatusNotFound}, resp6.StatusCode)
	})
}
