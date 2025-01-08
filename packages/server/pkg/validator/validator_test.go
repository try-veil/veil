package validator

import (
	"testing"
)

func TestAPIValidator_ValidateEndpoint(t *testing.T) {
	validator := New()

	tests := []struct {
		name        string
		path        string
		method      string
		upstreamURL string
		wantErr     bool
	}{
		{
			name:        "Valid endpoint",
			path:        "/api/v1/test",
			method:      "GET",
			upstreamURL: "https://api.example.com/test",
			wantErr:     false,
		},
		{
			name:        "Invalid path",
			path:        "invalid\\path",
			method:      "GET",
			upstreamURL: "https://api.example.com/test",
			wantErr:     true,
		},
		{
			name:        "Invalid method",
			path:        "/api/v1/test",
			method:      "INVALID",
			upstreamURL: "https://api.example.com/test",
			wantErr:     true,
		},
		{
			name:        "Invalid upstream URL",
			path:        "/api/v1/test",
			method:      "GET",
			upstreamURL: "not-a-url",
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateEndpoint(tt.path, tt.method, tt.upstreamURL)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateEndpoint() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.wantErr {
				t.Logf("Got expected error: %v", err)
			}
		})
	}
}

func TestAPIValidator_ValidateRouteMatch(t *testing.T) {
	validator := New()

	tests := []struct {
		name    string
		pattern string
		wantErr bool
	}{
		{
			name:    "Valid simple pattern",
			pattern: "/api/*",
			wantErr: false,
		},
		{
			name:    "Valid complex pattern",
			pattern: "/api/{version}/{path*}",
			wantErr: false,
		},
		{
			name:    "Invalid pattern",
			pattern: "/api/[invalid",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateRouteMatch(tt.pattern)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateRouteMatch() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
