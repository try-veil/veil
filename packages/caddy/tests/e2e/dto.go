package e2e

type APIKeyRequest struct {
	Path    string   `json:"path"`
	APIKeys []APIKey `json:"api_keys"`
}

type APIKeyStatusRequest struct {
	Path     string `json:"path"`
	APIKey   string `json:"api_key"`
	IsActive *bool  `json:"is_active,omitempty"`
}

type APIOnboardRequest struct {
	Path                 string   `json:"path"`
	Upstream             string   `json:"upstream"`
	RequiredSubscription string   `json:"required_subscription"`
	Methods              []string `json:"methods"`
	RequiredHeaders      []string `json:"required_headers"`
	APIKeys              []APIKey `json:"api_keys"`
}

type APIKey struct {
	Key      string `json:"key"`
	Name     string `json:"name"`
	IsActive *bool  `json:"is_active"`
}

type APIOnboardResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message"`
	API     interface{} `json:"api"`
}
