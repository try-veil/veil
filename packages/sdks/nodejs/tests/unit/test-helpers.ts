/**
 * Test helpers and utilities for Veil SDK tests
 */

import { APIOnboardRequest, APIKeysRequest, APIKeyStatusRequest, APIKeyDeleteRequest, APIResponse, ErrorResponse } from '../../src/types';

// Sample test data
export const sampleAPIOnboardRequest: APIOnboardRequest = {
  path: '/weather/*',
  upstream: 'http://localhost:8083/weather',
  required_subscription: 'weather-subscription',
  methods: ['GET'],
  required_headers: ['X-Test-Header'],
  api_keys: [{
    key: 'weather-test-key-1',
    name: 'Weather Test Key',
    is_active: true
  }]
};

export const sampleAPIKeysRequest: APIKeysRequest = {
  path: '/weather/*',
  api_keys: [{
    key: 'new-weather-key-1',
    name: 'New Weather Key 1',
    is_active: true
  }, {
    key: 'new-weather-key-2',
    name: 'New Weather Key 2',
    is_active: false
  }]
};

export const sampleAPIKeyStatusRequest: APIKeyStatusRequest = {
  path: '/weather/*',
  api_key: 'weather-test-key-1',
  is_active: false
};

export const sampleAPIKeyDeleteRequest: APIKeyDeleteRequest = {
  path: '/weather/*',
  api_key: 'weather-key-to-delete'
};

// Sample responses
export const sampleSuccessResponse: APIResponse = {
  status: 'success',
  message: 'API onboarded successfully',
  api: {
    id: 1,
    path: '/weather/*',
    upstream: 'http://localhost:8083/weather',
    required_subscription: 'weather-subscription',
    methods: [{ method: 'GET' }],
    api_keys: [{
      key: 'weather-test-key-1',
      name: 'Weather Test Key',
      is_active: true
    }]
  }
};

export const sampleErrorResponse: ErrorResponse = {
  error: 'Path and upstream are required'
};

// Mock response creators
export const createMockSuccessResponse = (data: any, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {}
});

export const createMockErrorResponse = (error: string, status = 400) => ({
  response: {
    data: { error },
    status,
    statusText: status === 400 ? 'Bad Request' : 'Error',
    headers: {},
    config: {}
  },
  isAxiosError: true,
  message: error
});

// Helper to create axios error
export const createAxiosError = (message: string, status?: number, data?: any) => {
  const error = new Error(message) as any;
  error.isAxiosError = true;
  
  if (status && data) {
    error.response = {
      status,
      data,
      statusText: status === 400 ? 'Bad Request' : 'Error',
      headers: {},
      config: {}
    };
  }
  
  return error;
};

// Test data generators
export const generateAPIConfig = (overrides: Partial<any> = {}) => ({
  id: 1,
  path: '/test-api/*',
  upstream: 'http://localhost:8080/test',
  required_subscription: 'test-subscription',
  methods: [{ method: 'GET' }],
  api_keys: [],
  ...overrides
});

export const generateAPIKey = (overrides: Partial<any> = {}) => ({
  key: 'test-api-key',
  name: 'Test API Key',
  is_active: true,
  ...overrides
});

// Validation helpers
export const expectValidAPIResponse = (response: any) => {
  expect(response).toHaveProperty('status');
  expect(response).toHaveProperty('message');
  expect(['success', 'error']).toContain(response.status);
  expect(typeof response.message).toBe('string');
};

export const expectValidErrorResponse = (error: any) => {
  expect(error).toHaveProperty('name', 'VeilError');
  expect(error).toHaveProperty('message');
  expect(typeof error.message).toBe('string');
};