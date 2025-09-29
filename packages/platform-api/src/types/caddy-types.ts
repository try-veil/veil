// Types for Caddy Gateway integration

export interface CaddyAPIConfig {
  path: string;
  upstream: string;
  required_subscription: string;
  methods: string[];
  required_headers?: string[];
  parameters?: CaddyParameter[];
  api_keys?: CaddyAPIKey[];
}

export interface CaddyParameter {
  name: string;
  type: 'query' | 'path' | 'header' | 'body';
  required?: boolean;
}

export interface CaddyAPIKey {
  key: string;
  name: string;
  is_active?: boolean;
  expires_at?: string;
}

export interface CaddyAPIResponse {
  status: 'success' | 'error';
  message: string;
  api?: any;
}

export interface CaddyAPIKeysRequest {
  path: string;
  api_keys: CaddyAPIKey[];
}

export interface CaddyAPIKeyStatusRequest {
  path: string;
  api_key: string;
  is_active: boolean;
}

export interface CaddyAPIKeyDeleteRequest {
  path: string;
  api_key: string;
}

export interface CaddyErrorResponse {
  error: string;
}

export class CaddyAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public caddyResponse?: any
  ) {
    super(message);
    this.name = 'CaddyAPIError';
  }
}