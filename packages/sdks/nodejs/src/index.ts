/**
 * Veil Node.js SDK
 * 
 * A comprehensive TypeScript/JavaScript SDK for the Veil API Gateway Management Server.
 * Provides full support for API onboarding, management, and key administration.
 */

export { VeilClient } from './client';
export { VeilError } from './types';
export type {
  VeilClientOptions,
  APIOnboardRequest,
  APIKeysRequest,
  APIKeyStatusRequest,
  APIKeyDeleteRequest,
  APIResponse,
  ErrorResponse,
  APIConfig,
  APIKey,
  Parameter,
  HttpMethod,
  ParameterType,
  ResponseStatus
} from './types';

// Default export for convenience
export { VeilClient as default } from './client';