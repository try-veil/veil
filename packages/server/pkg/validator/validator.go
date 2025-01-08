package validator

import (
	"fmt"
	"net/http"
	"net/url"
	"regexp"
)

var (
	// validPathRegex validates URL paths
	// Valid paths:
	// - /api/v1/users                  // Simple path
	// - /api/v1/users/123              // Path with ID
	// ... (keep existing path examples)
	validPathRegex = regexp.MustCompile(`^/[a-zA-Z0-9\-._~!$&'()*+,;=:@%/]*$`)

	// Regex for route patterns with variables and wildcards
	// Valid patterns:
	// - /api/v1/users                    // Simple path
	// - /api/{version}/users             // Path with variable
	// ... (keep existing pattern examples)
	validPatternRegex = regexp.MustCompile(`^/(?:[a-zA-Z0-9\-._~/]*|\{[a-zA-Z0-9_]+\*?\}|\*)+$`)
)

// APIValidator validates API configurations
type APIValidator struct{}

// New creates a new API validator
func New() *APIValidator {
	return &APIValidator{}
}

// ValidateEndpoint validates an API endpoint configuration
func (v *APIValidator) ValidateEndpoint(path, method, upstreamURL string) error {
	// Validate path format
	if !validPathRegex.MatchString(path) {
		return fmt.Errorf("invalid path format: %s", path)
	}

	// Validate method
	if !isValidMethod(method) {
		return fmt.Errorf("invalid HTTP method: %s", method)
	}

	// Validate upstream URL with stricter requirements
	parsedURL, err := url.Parse(upstreamURL)
	if err != nil || !parsedURL.IsAbs() || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return fmt.Errorf("invalid upstream URL: must be absolute URL with scheme and host")
	}

	return nil
}

// ValidateRouteMatch validates if a route pattern is valid
func (v *APIValidator) ValidateRouteMatch(pattern string) error {
	if !validPatternRegex.MatchString(pattern) {
		return fmt.Errorf("invalid route pattern format: %s", pattern)
	}
	return nil
}

func isValidMethod(method string) bool {
	switch method {
	case http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch, http.MethodHead, http.MethodOptions:
		return true
	default:
		return false
	}
}
