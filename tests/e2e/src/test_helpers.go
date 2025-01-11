package e2e

import (
	"fmt"
	"net/http"
	"time"
)

// waitForServer attempts to connect to the server until it's available
func waitForServer(baseURL string, maxAttempts int) error {
	for i := 0; i < maxAttempts; i++ {
		_, err := http.Get(baseURL + "/health")
		if err == nil {
			return nil
		}
		time.Sleep(time.Second)
	}
	return fmt.Errorf("server did not become available after %d attempts", maxAttempts)
}
