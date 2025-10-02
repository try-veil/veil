/**
 * TypeScript types and interfaces for Veil API Gateway Management Server
 * Generated from OpenAPI 3.0.3 specification
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export type ParameterType = 'query' | 'path' | 'header' | 'body';

export type ResponseStatus = 'success' | 'error';

/**
 * API parameter definition for validation and documentation
 */
export interface Parameter {
  /** Parameter name */
  name: string;
  /** Parameter location type */
  type: ParameterType;
  /** Whether this parameter is required */
  required?: boolean;
}

/**
 * API key configuration
 */
export interface APIKey {
  /** The actual API key value used for authentication. Should be unique across all APIs. */
  key: string;
  /** Human-readable name for the API key. Used for identification and management. */
  name: string;
  /** Whether this API key is active and can be used for authentication. Inactive keys will be rejected. */
  is_active?: boolean;
  /** Optional expiration date for the API key. If set, the key will be invalid after this date. */
  expires_at?: string;
}

/**
 * API onboarding request payload
 */
export interface APIOnboardRequest {
  /** The API path pattern. Should include wildcards (*) for sub-path matching. */
  path: string;
  /** The upstream service URL where requests should be proxied. Can be HTTP or HTTPS. */
  upstream: string;
  /** The subscription type required to access this API. Used for billing and access control. */
  required_subscription?: string;
  /** HTTP methods allowed for this API. Only listed methods will be accepted. */
  methods: HttpMethod[];
  /** List of header names that must be present in requests. Requests missing these headers will be rejected with 400. */
  required_headers?: string[];
  /** API parameter definitions for validation and documentation. */
  parameters?: Parameter[];
  /** Initial set of API keys for this API. Additional keys can be added later via the keys endpoint. */
  api_keys?: APIKey[];
}

/**
 * Request to add API keys to an existing API
 */
export interface APIKeysRequest {
  /** The API path to add keys to */
  path: string;
  /** Array of API keys to add */
  api_keys: APIKey[];
}

/**
 * Request to update API key status
 */
export interface APIKeyStatusRequest {
  /** The API path containing the key */
  path: string;
  /** The API key to update */
  api_key: string;
  /** New active status for the key */
  is_active?: boolean;
}

/**
 * Request to delete an API key
 */
export interface APIKeyDeleteRequest {
  /** The API path containing the key to delete */
  path: string;
  /** The API key to delete */
  api_key: string;
}

/**
 * Standard API response format
 */
export interface APIResponse<T = any> {
  /** Response status indicator */
  status: ResponseStatus;
  /** Human-readable response message */
  message: string;
  /** API configuration object (structure varies by endpoint) */
  api?: T;
}

/**
 * Error response format
 */
export interface ErrorResponse {
  /** Error message describing what went wrong */
  error: string;
}

/**
 * Complete API configuration object
 */
export interface APIConfig {
  /** Unique API configuration ID */
  id: number;
  /** API path pattern */
  path: string;
  /** Upstream service URL */
  upstream: string;
  /** Required subscription type */
  required_subscription?: string;
  /** Last time this API was accessed */
  last_accessed?: string;
  /** Total number of requests made to this API */
  request_count?: number;
  /** HTTP methods configuration */
  methods?: Array<{ method: string }>;
  /** API parameter definitions */
  parameters?: Parameter[];
  /** Required headers */
  required_headers?: string[];
  /** Associated API keys */
  api_keys?: Array<APIKey & { api_config_id?: number }>;
}

/**
 * Veil client configuration options
 */
export interface VeilClientOptions {
  /** Base URL for the management API server (default: http://localhost:2020) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Additional headers to include with all requests */
  headers?: Record<string, string>;
}

/**
 * Veil client error with additional context
 */
export class VeilError extends Error {
  public readonly status?: number;
  public readonly response?: any;

  constructor(message: string, status?: number, response?: any) {
    super(message);
    this.name = 'VeilError';
    this.status = status;
    this.response = response;
  }
}