/**
 * Unit tests for TypeScript types and interfaces
 */

import {
  VeilError,
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
  ResponseStatus,
  VeilClientOptions
} from '../src/types';

describe('TypeScript Types and Interfaces', () => {
  describe('VeilError', () => {
    it('should create VeilError with all properties', () => {
      const error = new VeilError('Test message', 400, { error: 'Bad request' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(VeilError);
      expect(error.name).toBe('VeilError');
      expect(error.message).toBe('Test message');
      expect(error.status).toBe(400);
      expect(error.response).toEqual({ error: 'Bad request' });
    });

    it('should create VeilError with only message', () => {
      const error = new VeilError('Simple error');
      
      expect(error.message).toBe('Simple error');
      expect(error.status).toBeUndefined();
      expect(error.response).toBeUndefined();
    });
  });

  describe('Type Constraints', () => {
    it('should enforce HttpMethod enum values', () => {
      const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
      
      expect(validMethods).toHaveLength(7);
      expect(validMethods).toContain('GET');
      expect(validMethods).toContain('POST');
      expect(validMethods).toContain('PUT');
      expect(validMethods).toContain('DELETE');
      expect(validMethods).toContain('PATCH');
      expect(validMethods).toContain('OPTIONS');
      expect(validMethods).toContain('HEAD');
    });

    it('should enforce ParameterType enum values', () => {
      const validTypes: ParameterType[] = ['query', 'path', 'header', 'body'];
      
      expect(validTypes).toHaveLength(4);
      expect(validTypes).toContain('query');
      expect(validTypes).toContain('path');
      expect(validTypes).toContain('header');
      expect(validTypes).toContain('body');
    });

    it('should enforce ResponseStatus enum values', () => {
      const validStatuses: ResponseStatus[] = ['success', 'error'];
      
      expect(validStatuses).toHaveLength(2);
      expect(validStatuses).toContain('success');
      expect(validStatuses).toContain('error');
    });
  });

  describe('Interface Validation', () => {
    it('should validate Parameter interface', () => {
      const validParameter: Parameter = {
        name: 'user_id',
        type: 'query',
        required: true
      };

      expect(validParameter.name).toBe('user_id');
      expect(validParameter.type).toBe('query');
      expect(validParameter.required).toBe(true);

      // Test optional required field
      const paramWithoutRequired: Parameter = {
        name: 'optional_param',
        type: 'header'
      };

      expect(paramWithoutRequired.required).toBeUndefined();
    });

    it('should validate APIKey interface', () => {
      const validAPIKey: APIKey = {
        key: 'test-api-key-123',
        name: 'Test API Key',
        is_active: true,
        expires_at: '2024-12-31T23:59:59Z'
      };

      expect(validAPIKey.key).toBe('test-api-key-123');
      expect(validAPIKey.name).toBe('Test API Key');
      expect(validAPIKey.is_active).toBe(true);
      expect(validAPIKey.expires_at).toBe('2024-12-31T23:59:59Z');

      // Test with minimal required fields
      const minimalAPIKey: APIKey = {
        key: 'minimal-key',
        name: 'Minimal Key'
      };

      expect(minimalAPIKey.is_active).toBeUndefined();
      expect(minimalAPIKey.expires_at).toBeUndefined();
    });

    it('should validate APIOnboardRequest interface', () => {
      const validRequest: APIOnboardRequest = {
        path: '/weather/*',
        upstream: 'http://localhost:8083/weather',
        required_subscription: 'weather-subscription',
        methods: ['GET', 'POST'],
        required_headers: ['X-Test-Header'],
        parameters: [{
          name: 'location',
          type: 'query',
          required: true
        }],
        api_keys: [{
          key: 'weather-key',
          name: 'Weather Key',
          is_active: true
        }]
      };

      expect(validRequest.path).toBe('/weather/*');
      expect(validRequest.upstream).toBe('http://localhost:8083/weather');
      expect(validRequest.methods).toEqual(['GET', 'POST']);
      expect(validRequest.required_headers).toEqual(['X-Test-Header']);
      expect(validRequest.parameters).toHaveLength(1);
      expect(validRequest.api_keys).toHaveLength(1);

      // Test with minimal required fields
      const minimalRequest: APIOnboardRequest = {
        path: '/minimal/*',
        upstream: 'http://localhost:8080/minimal',
        methods: ['GET']
      };

      expect(minimalRequest.required_subscription).toBeUndefined();
      expect(minimalRequest.required_headers).toBeUndefined();
      expect(minimalRequest.parameters).toBeUndefined();
      expect(minimalRequest.api_keys).toBeUndefined();
    });

    it('should validate APIKeysRequest interface', () => {
      const validRequest: APIKeysRequest = {
        path: '/weather/*',
        api_keys: [
          {
            key: 'key1',
            name: 'Key 1',
            is_active: true
          },
          {
            key: 'key2',
            name: 'Key 2',
            is_active: false
          }
        ]
      };

      expect(validRequest.path).toBe('/weather/*');
      expect(validRequest.api_keys).toHaveLength(2);
      expect(validRequest.api_keys[0].is_active).toBe(true);
      expect(validRequest.api_keys[1].is_active).toBe(false);
    });

    it('should validate APIKeyStatusRequest interface', () => {
      const validRequest: APIKeyStatusRequest = {
        path: '/weather/*',
        api_key: 'test-key',
        is_active: false
      };

      expect(validRequest.path).toBe('/weather/*');
      expect(validRequest.api_key).toBe('test-key');
      expect(validRequest.is_active).toBe(false);

      // Test without optional is_active field
      const requestWithoutStatus: APIKeyStatusRequest = {
        path: '/weather/*',
        api_key: 'test-key'
      };

      expect(requestWithoutStatus.is_active).toBeUndefined();
    });

    it('should validate APIKeyDeleteRequest interface', () => {
      const validRequest: APIKeyDeleteRequest = {
        path: '/weather/*',
        api_key: 'key-to-delete'
      };

      expect(validRequest.path).toBe('/weather/*');
      expect(validRequest.api_key).toBe('key-to-delete');
    });

    it('should validate APIResponse interface', () => {
      const validResponse: APIResponse<APIConfig> = {
        status: 'success',
        message: 'Operation completed successfully',
        api: {
          id: 1,
          path: '/weather/*',
          upstream: 'http://localhost:8083/weather',
          required_subscription: 'weather-subscription',
          last_accessed: '2024-01-01T00:00:00Z',
          request_count: 100,
          methods: [{ method: 'GET' }],
          parameters: [],
          required_headers: ['X-Test-Header'],
          api_keys: []
        }
      };

      expect(validResponse.status).toBe('success');
      expect(validResponse.message).toBe('Operation completed successfully');
      expect(validResponse.api?.id).toBe(1);
      expect(validResponse.api?.path).toBe('/weather/*');

      // Test without api field
      const responseWithoutAPI: APIResponse = {
        status: 'success',
        message: 'Simple operation'
      };

      expect(responseWithoutAPI.api).toBeUndefined();
    });

    it('should validate ErrorResponse interface', () => {
      const validError: ErrorResponse = {
        error: 'Something went wrong'
      };

      expect(validError.error).toBe('Something went wrong');
    });

    it('should validate VeilClientOptions interface', () => {
      const validOptions: VeilClientOptions = {
        baseUrl: 'https://api.example.com:3000',
        timeout: 30000,
        headers: {
          'X-Custom-Header': 'custom-value',
          'Authorization': 'Bearer token'
        }
      };

      expect(validOptions.baseUrl).toBe('https://api.example.com:3000');
      expect(validOptions.timeout).toBe(30000);
      expect(validOptions.headers).toEqual({
        'X-Custom-Header': 'custom-value',
        'Authorization': 'Bearer token'
      });

      // Test with empty options
      const emptyOptions: VeilClientOptions = {};

      expect(emptyOptions.baseUrl).toBeUndefined();
      expect(emptyOptions.timeout).toBeUndefined();
      expect(emptyOptions.headers).toBeUndefined();
    });

    it('should validate APIConfig interface', () => {
      const validConfig: APIConfig = {
        id: 1,
        path: '/weather/*',
        upstream: 'http://localhost:8083/weather',
        required_subscription: 'weather-subscription',
        last_accessed: '2024-01-01T00:00:00Z',
        request_count: 1250,
        methods: [
          { method: 'GET' },
          { method: 'POST' }
        ],
        parameters: [
          {
            name: 'location',
            type: 'query',
            required: true
          }
        ],
        required_headers: ['X-Test-Header', 'Authorization'],
        api_keys: [
          {
            key: 'weather-key',
            name: 'Weather Key',
            is_active: true,
            api_config_id: 1
          }
        ]
      };

      expect(validConfig.id).toBe(1);
      expect(validConfig.path).toBe('/weather/*');
      expect(validConfig.upstream).toBe('http://localhost:8083/weather');
      expect(validConfig.request_count).toBe(1250);
      expect(validConfig.methods).toHaveLength(2);
      expect(validConfig.parameters).toHaveLength(1);
      expect(validConfig.required_headers).toHaveLength(2);
      expect(validConfig.api_keys).toHaveLength(1);
      expect(validConfig.api_keys?.[0]?.api_config_id).toBe(1);
    });
  });

  describe('Type Composition and Inheritance', () => {
    it('should handle APIKey with additional properties in APIConfig', () => {
      const extendedAPIKey = {
        key: 'test-key',
        name: 'Test Key',
        is_active: true,
        api_config_id: 1,
        created_at: '2024-01-01T00:00:00Z' // Additional property
      };

      // Should be compatible with APIConfig api_keys array
      const config: APIConfig = {
        id: 1,
        path: '/test/*',
        upstream: 'http://localhost:8080/test',
        api_keys: [extendedAPIKey]
      };

      expect(config.api_keys?.[0]?.api_config_id).toBe(1);
    });

    it('should handle generic APIResponse types', () => {
      // Test with specific type
      const typedResponse: APIResponse<APIConfig> = {
        status: 'success',
        message: 'API configuration retrieved',
        api: {
          id: 1,
          path: '/test/*',
          upstream: 'http://localhost:8080/test'
        }
      };

      expect(typedResponse.api?.id).toBe(1);

      // Test with any type
      const genericResponse: APIResponse = {
        status: 'success',
        message: 'Generic operation',
        api: { customField: 'custom value' }
      };

      expect(genericResponse.api).toEqual({ customField: 'custom value' });
    });
  });

  describe('Optional and Required Fields', () => {
    it('should correctly handle optional fields in APIOnboardRequest', () => {
      // All optional fields omitted
      const minimalRequest: APIOnboardRequest = {
        path: '/minimal/*',
        upstream: 'http://localhost:8080',
        methods: ['GET']
      };

      // TypeScript should not require these fields
      expect(minimalRequest.required_subscription).toBeUndefined();
      expect(minimalRequest.required_headers).toBeUndefined();
      expect(minimalRequest.parameters).toBeUndefined();
      expect(minimalRequest.api_keys).toBeUndefined();

      // All optional fields included
      const fullRequest: APIOnboardRequest = {
        path: '/full/*',
        upstream: 'http://localhost:8080',
        methods: ['GET', 'POST'],
        required_subscription: 'premium',
        required_headers: ['Authorization'],
        parameters: [{ name: 'id', type: 'path', required: true }],
        api_keys: [{ key: 'test', name: 'Test Key' }]
      };

      expect(fullRequest.required_subscription).toBe('premium');
      expect(fullRequest.required_headers).toEqual(['Authorization']);
      expect(fullRequest.parameters).toHaveLength(1);
      expect(fullRequest.api_keys).toHaveLength(1);
    });
  });
});