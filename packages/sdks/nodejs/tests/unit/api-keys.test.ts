/**
 * Unit tests for VeilClient API Key Management methods
 */

import MockAdapter from 'axios-mock-adapter';
import { VeilClient, VeilError } from '../../src';
import {
  sampleAPIKeysRequest,
  sampleAPIKeyStatusRequest,
  sampleAPIKeyDeleteRequest,
  sampleSuccessResponse,
  sampleErrorResponse,
  expectValidAPIResponse,
  generateAPIConfig,
  generateAPIKey
} from './test-helpers';

describe('VeilClient API Key Management', () => {
  let client: VeilClient;
  let mockAxios: MockAdapter;

  beforeEach(() => {
    client = new VeilClient({
      baseUrl: 'http://localhost:2020',
      timeout: 5000
    });
    
    mockAxios = new MockAdapter((client as any).http);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('addAPIKeys', () => {
    it('should successfully add API keys via POST', async () => {
      const expectedResponse = {
        ...sampleSuccessResponse,
        message: 'API keys added successfully',
        api: generateAPIConfig({
          api_keys: [
            generateAPIKey({ key: 'existing-key', name: 'Existing Key' }),
            generateAPIKey({ key: 'new-weather-key-1', name: 'New Weather Key 1' }),
            generateAPIKey({ key: 'new-weather-key-2', name: 'New Weather Key 2', is_active: false })
          ]
        })
      };

      mockAxios.onPost('/veil/api/keys').reply(201, expectedResponse);

      const result = await client.addAPIKeys(sampleAPIKeysRequest);

      expect(result).toEqual(expectedResponse);
      expectValidAPIResponse(result);
      expect(result.api?.api_keys).toHaveLength(3);
    });

    it('should include correct request data', async () => {
      mockAxios.onPost('/veil/api/keys').reply(config => {
        const requestData = JSON.parse(config.data);
        expect(requestData).toEqual(sampleAPIKeysRequest);
        expect(requestData.path).toBe('/weather/*');
        expect(requestData.api_keys).toHaveLength(2);
        return [201, sampleSuccessResponse];
      });

      await client.addAPIKeys(sampleAPIKeysRequest);
    });

    it('should handle API not found error', async () => {
      mockAxios.onPost('/veil/api/keys').reply(404, { error: 'API not found' });

      await expect(client.addAPIKeys(sampleAPIKeysRequest))
        .rejects.toBeVeilError();
    });

    it('should handle bad request errors', async () => {
      const invalidRequest = { ...sampleAPIKeysRequest, api_keys: [] };
      mockAxios.onPost('/veil/api/keys').reply(400, { 
        error: 'Path and at least one API key are required' 
      });

      await expect(client.addAPIKeys(invalidRequest))
        .rejects.toBeVeilError();
    });

    it('should validate required fields', async () => {
      mockAxios.onPost('/veil/api/keys').reply(config => {
        const requestData = JSON.parse(config.data);
        expect(requestData).toHaveProperty('path');
        expect(requestData).toHaveProperty('api_keys');
        expect(Array.isArray(requestData.api_keys)).toBe(true);
        expect(requestData.api_keys.length).toBeGreaterThan(0);
        return [201, sampleSuccessResponse];
      });

      await client.addAPIKeys(sampleAPIKeysRequest);
    });
  });

  describe('addAPIKeysPut', () => {
    it('should successfully add API keys via PUT', async () => {
      const expectedResponse = {
        ...sampleSuccessResponse,
        message: 'API keys added successfully'
      };

      mockAxios.onPut('/veil/api/keys').reply(201, expectedResponse);

      const result = await client.addAPIKeysPut(sampleAPIKeysRequest);

      expect(result).toEqual(expectedResponse);
      expectValidAPIResponse(result);
    });

    it('should use PUT method instead of POST', async () => {
      mockAxios.onPut('/veil/api/keys').reply(201, sampleSuccessResponse);

      await client.addAPIKeysPut(sampleAPIKeysRequest);

      expect(mockAxios.history.put).toHaveLength(1);
      expect(mockAxios.history.post).toHaveLength(0);
    });
  });

  describe('deleteAPIKey', () => {
    it('should successfully delete an API key', async () => {
      const expectedResponse = {
        status: 'success',
        message: 'API key deleted successfully'
      };

      mockAxios.onDelete('/veil/api/keys').reply(200, expectedResponse);

      const result = await client.deleteAPIKey(sampleAPIKeyDeleteRequest);

      expect(result).toEqual(expectedResponse);
      expectValidAPIResponse(result);
      expect(result.status).toBe('success');
    });

    it('should send correct request data in DELETE body', async () => {
      mockAxios.onDelete('/veil/api/keys').reply(config => {
        const requestData = JSON.parse(config.data);
        expect(requestData).toEqual(sampleAPIKeyDeleteRequest);
        expect(requestData.path).toBe('/weather/*');
        expect(requestData.api_key).toBe('weather-key-to-delete');
        return [200, { status: 'success', message: 'API key deleted successfully' }];
      });

      await client.deleteAPIKey(sampleAPIKeyDeleteRequest);
    });

    it('should handle API key not found error', async () => {
      mockAxios.onDelete('/veil/api/keys').reply(404, { 
        error: 'API or API key not found' 
      });

      await expect(client.deleteAPIKey(sampleAPIKeyDeleteRequest))
        .rejects.toBeVeilError();
    });

    it('should handle missing required fields', async () => {
      const invalidRequest = { path: '/weather/*' } as any;
      mockAxios.onDelete('/veil/api/keys').reply(400, { 
        error: 'Path and API key are required' 
      });

      await expect(client.deleteAPIKey(invalidRequest))
        .rejects.toBeVeilError();
    });
  });

  describe('updateAPIKeyStatus', () => {
    it('should successfully update API key status via PUT', async () => {
      const expectedResponse = {
        ...sampleSuccessResponse,
        message: 'API key status updated successfully',
        api: generateAPIConfig({
          api_keys: [
            generateAPIKey({ 
              key: 'weather-test-key-1', 
              name: 'Weather Test Key', 
              is_active: false 
            })
          ]
        })
      };

      mockAxios.onPut('/veil/api/keys/status').reply(200, expectedResponse);

      const result = await client.updateAPIKeyStatus(sampleAPIKeyStatusRequest);

      expect(result).toEqual(expectedResponse);
      expectValidAPIResponse(result);
      expect(result.api?.api_keys?.[0]?.is_active).toBe(false);
    });

    it('should send correct status update data', async () => {
      mockAxios.onPut('/veil/api/keys/status').reply(config => {
        const requestData = JSON.parse(config.data);
        expect(requestData).toEqual(sampleAPIKeyStatusRequest);
        expect(requestData.path).toBe('/weather/*');
        expect(requestData.api_key).toBe('weather-test-key-1');
        expect(requestData.is_active).toBe(false);
        return [200, sampleSuccessResponse];
      });

      await client.updateAPIKeyStatus(sampleAPIKeyStatusRequest);
    });

    it('should handle API key not found error', async () => {
      mockAxios.onPut('/veil/api/keys/status').reply(404, { 
        error: 'API not found or API key not found' 
      });

      await expect(client.updateAPIKeyStatus(sampleAPIKeyStatusRequest))
        .rejects.toBeVeilError();
    });

    it('should handle activation of inactive key', async () => {
      const activationRequest = {
        ...sampleAPIKeyStatusRequest,
        is_active: true
      };

      const expectedResponse = {
        ...sampleSuccessResponse,
        message: 'API key status updated successfully',
        api: generateAPIConfig({
          api_keys: [
            generateAPIKey({ 
              key: 'weather-test-key-1', 
              name: 'Weather Test Key', 
              is_active: true 
            })
          ]
        })
      };

      mockAxios.onPut('/veil/api/keys/status').reply(200, expectedResponse);

      const result = await client.updateAPIKeyStatus(activationRequest);

      expect(result.api?.api_keys?.[0]?.is_active).toBe(true);
    });

    it('should handle optional is_active field', async () => {
      const requestWithoutStatus = {
        path: '/weather/*',
        api_key: 'weather-test-key-1'
      };

      mockAxios.onPut('/veil/api/keys/status').reply(config => {
        const requestData = JSON.parse(config.data);
        expect(requestData).toEqual(requestWithoutStatus);
        expect(requestData).not.toHaveProperty('is_active');
        return [200, sampleSuccessResponse];
      });

      await client.updateAPIKeyStatus(requestWithoutStatus);
    });
  });

  describe('updateAPIKeyStatusPatch', () => {
    it('should successfully update API key status via PATCH', async () => {
      const expectedResponse = {
        ...sampleSuccessResponse,
        message: 'API key status updated successfully'
      };

      mockAxios.onPatch('/veil/api/keys/status').reply(200, expectedResponse);

      const result = await client.updateAPIKeyStatusPatch(sampleAPIKeyStatusRequest);

      expect(result).toEqual(expectedResponse);
      expectValidAPIResponse(result);
    });

    it('should use PATCH method instead of PUT', async () => {
      mockAxios.onPatch('/veil/api/keys/status').reply(200, sampleSuccessResponse);

      await client.updateAPIKeyStatusPatch(sampleAPIKeyStatusRequest);

      expect(mockAxios.history.patch).toHaveLength(1);
      expect(mockAxios.history.put).toHaveLength(0);
    });
  });

  describe('API Key Validation', () => {
    it('should handle duplicate key errors', async () => {
      const duplicateKeyRequest = {
        path: '/weather/*',
        api_keys: [
          generateAPIKey({ key: 'existing-key', name: 'Duplicate Key' })
        ]
      };

      mockAxios.onPost('/veil/api/keys').reply(409, { 
        error: 'API key already exists' 
      });

      await expect(client.addAPIKeys(duplicateKeyRequest))
        .rejects.toBeVeilError();
    });

    it('should handle empty API keys array', async () => {
      const emptyKeysRequest = {
        path: '/weather/*',
        api_keys: []
      };

      mockAxios.onPost('/veil/api/keys').reply(400, { 
        error: 'At least one API key is required' 
      });

      await expect(client.addAPIKeys(emptyKeysRequest))
        .rejects.toBeVeilError();
    });

    it('should handle invalid API key format', async () => {
      const invalidKeyRequest = {
        path: '/weather/*',
        api_keys: [
          { key: '', name: 'Invalid Key' } // Empty key
        ]
      };

      mockAxios.onPost('/veil/api/keys').reply(400, { 
        error: 'API key cannot be empty' 
      });

      await expect(client.addAPIKeys(invalidKeyRequest as any))
        .rejects.toBeVeilError();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in API paths', async () => {
      const specialPathRequest = {
        ...sampleAPIKeysRequest,
        path: '/api/v1/special-chars/*'
      };

      mockAxios.onPost('/veil/api/keys').reply(config => {
        const requestData = JSON.parse(config.data);
        expect(requestData.path).toBe('/api/v1/special-chars/*');
        return [201, sampleSuccessResponse];
      });

      await client.addAPIKeys(specialPathRequest);
    });

    it('should handle very long API key names', async () => {
      const longNameKey = {
        path: '/weather/*',
        api_keys: [
          generateAPIKey({ 
            name: 'Very Long API Key Name That Exceeds Normal Length Expectations For Testing Purposes' 
          })
        ]
      };

      mockAxios.onPost('/veil/api/keys').reply(201, sampleSuccessResponse);

      await expect(client.addAPIKeys(longNameKey)).resolves.toBeDefined();
    });

    it('should handle multiple API keys with mixed active states', async () => {
      const mixedStateRequest = {
        path: '/weather/*',
        api_keys: [
          generateAPIKey({ key: 'active-key', is_active: true }),
          generateAPIKey({ key: 'inactive-key', is_active: false }),
          generateAPIKey({ key: 'default-key' }) // No is_active field
        ]
      };

      mockAxios.onPost('/veil/api/keys').reply(config => {
        const requestData = JSON.parse(config.data);
        expect(requestData.api_keys).toHaveLength(3);
        expect(requestData.api_keys[0].is_active).toBe(true);
        expect(requestData.api_keys[1].is_active).toBe(false);
        expect(requestData.api_keys[2]).not.toHaveProperty('is_active');
        return [201, sampleSuccessResponse];
      });

      await client.addAPIKeys(mixedStateRequest);
    });
  });
});