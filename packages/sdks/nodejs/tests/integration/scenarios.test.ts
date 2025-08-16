/**
 * Integration tests for VeilClient - Full scenarios and workflows
 */

import MockAdapter from 'axios-mock-adapter';
import { VeilClient } from '../../src';
import {
  sampleAPIOnboardRequest,
  generateAPIConfig,
  generateAPIKey,
  expectValidAPIResponse
} from '../unit/test-helpers';

describe('VeilClient Integration Scenarios', () => {
  let client: VeilClient;
  let mockAxios: MockAdapter;

  beforeEach(() => {
    client = new VeilClient({
      baseUrl: 'http://localhost:2020',
      timeout: 10000
    });
    
    mockAxios = new MockAdapter((client as any).http);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('Complete API Lifecycle', () => {
    it('should handle full API lifecycle: onboard -> add keys -> update status -> delete key -> delete API', async () => {
      const apiPath = '/weather/*';
      const initialAPI = generateAPIConfig({
        path: apiPath,
        api_keys: [generateAPIKey({ key: 'initial-key', name: 'Initial Key' })]
      });

      // 1. Onboard API
      mockAxios.onPost('/veil/api/routes').replyOnce(201, {
        status: 'success',
        message: 'API onboarded successfully',
        api: initialAPI
      });

      const onboardResult = await client.onboardAPI(sampleAPIOnboardRequest);
      expect(onboardResult.status).toBe('success');
      expect(onboardResult.api?.id).toBe(1);

      // 2. Add additional keys
      const updatedAPI = {
        ...initialAPI,
        api_keys: [
          ...initialAPI.api_keys,
          generateAPIKey({ key: 'new-key-1', name: 'New Key 1' }),
          generateAPIKey({ key: 'new-key-2', name: 'New Key 2', is_active: false })
        ]
      };

      mockAxios.onPost('/veil/api/keys').replyOnce(201, {
        status: 'success',
        message: 'API keys added successfully',
        api: updatedAPI
      });

      const addKeysResult = await client.addAPIKeys({
        path: apiPath,
        api_keys: [
          generateAPIKey({ key: 'new-key-1', name: 'New Key 1' }),
          generateAPIKey({ key: 'new-key-2', name: 'New Key 2', is_active: false })
        ]
      });
      expect(addKeysResult.api?.api_keys).toHaveLength(3);

      // 3. Update key status
      const statusUpdatedAPI = {
        ...updatedAPI,
        api_keys: updatedAPI.api_keys.map(key => 
          key.key === 'new-key-2' ? { ...key, is_active: true } : key
        )
      };

      mockAxios.onPut('/veil/api/keys/status').replyOnce(200, {
        status: 'success',
        message: 'API key status updated successfully',
        api: statusUpdatedAPI
      });

      const statusResult = await client.updateAPIKeyStatus({
        path: apiPath,
        api_key: 'new-key-2',
        is_active: true
      });
      expect(statusResult.api?.api_keys?.find(k => k.key === 'new-key-2')?.is_active).toBe(true);

      // 4. Delete a key
      mockAxios.onDelete('/veil/api/keys').replyOnce(200, {
        status: 'success',
        message: 'API key deleted successfully'
      });

      const deleteKeyResult = await client.deleteAPIKey({
        path: apiPath,
        api_key: 'new-key-1'
      });
      expect(deleteKeyResult.status).toBe('success');

      // 5. Delete the entire API
      const encodedPath = encodeURIComponent(apiPath);
      mockAxios.onDelete(`/veil/api/routes/${encodedPath}`).replyOnce(200, {
        status: 'success',
        message: 'API deleted successfully'
      });

      const deleteAPIResult = await client.deleteAPI(apiPath);
      expect(deleteAPIResult.status).toBe('success');

      // Verify all requests were made in correct order
      expect(mockAxios.history.post).toHaveLength(2); // onboard + add keys
      expect(mockAxios.history.put).toHaveLength(1);  // update status
      expect(mockAxios.history.delete).toHaveLength(2); // delete key + delete API
    });
  });

  describe('Multi-API Management', () => {
    it('should handle managing multiple APIs simultaneously', async () => {
      const apis = [
        { path: '/users/*', service: 'user-service' },
        { path: '/products/*', service: 'product-service' },
        { path: '/orders/*', service: 'order-service' }
      ];

      // Mock onboarding responses for all APIs
      apis.forEach((api, index) => {
        mockAxios.onPost('/veil/api/routes').replyOnce(201, {
          status: 'success',
          message: 'API onboarded successfully',
          api: generateAPIConfig({
            id: index + 1,
            path: api.path,
            upstream: `http://localhost:808${index}/${api.service}`,
            api_keys: [generateAPIKey({ key: `${api.service}-key`, name: `${api.service} Key` })]
          })
        });
      });

      // Onboard all APIs
      const onboardPromises = apis.map(api => 
        client.onboardAPI({
          path: api.path,
          upstream: `http://localhost:8080/${api.service}`,
          required_subscription: `${api.service}-subscription`,
          methods: ['GET', 'POST'],
          api_keys: [generateAPIKey({ 
            key: `${api.service}-key`, 
            name: `${api.service} Key` 
          })]
        })
      );

      const results = await Promise.all(onboardPromises);
      
      results.forEach((result, index) => {
        expect(result.status).toBe('success');
        expect(result.api?.path).toBe(apis[index].path);
        expect(result.api?.id).toBe(index + 1);
      });

      expect(mockAxios.history.post).toHaveLength(3);
    });

    it('should handle partial failures in batch operations', async () => {
      const apis = [
        { path: '/api1/*', shouldSucceed: true },
        { path: '/api2/*', shouldSucceed: false },
        { path: '/api3/*', shouldSucceed: true }
      ];

      // Setup mock responses
      mockAxios
        .onPost('/veil/api/routes').replyOnce(201, {
          status: 'success',
          message: 'API onboarded successfully',
          api: generateAPIConfig({ path: '/api1/*' })
        })
        .onPost('/veil/api/routes').replyOnce(409, {
          error: 'API path already exists'
        })
        .onPost('/veil/api/routes').replyOnce(201, {
          status: 'success',
          message: 'API onboarded successfully',
          api: generateAPIConfig({ path: '/api3/*' })
        });

      const onboardPromises = apis.map(api => 
        client.onboardAPI({
          ...sampleAPIOnboardRequest,
          path: api.path
        })
      );

      const results = await Promise.allSettled(onboardPromises);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toBe('API path already exists');
      }
    });
  });

  describe('Key Management Workflows', () => {
    it('should handle key rotation workflow', async () => {
      const apiPath = '/secure-api/*';
      const api = generateAPIConfig({
        path: apiPath,
        api_keys: [generateAPIKey({ key: 'old-key', name: 'Old Key', is_active: true })]
      });

      // 1. Add new key (inactive initially)
      mockAxios.onPost('/veil/api/keys').replyOnce(201, {
        status: 'success',
        message: 'API keys added successfully',
        api: {
          ...api,
          api_keys: [
            ...api.api_keys,
            generateAPIKey({ key: 'new-key', name: 'New Key', is_active: false })
          ]
        }
      });

      await client.addAPIKeys({
        path: apiPath,
        api_keys: [generateAPIKey({ key: 'new-key', name: 'New Key', is_active: false })]
      });

      // 2. Activate new key
      mockAxios.onPut('/veil/api/keys/status').replyOnce(200, {
        status: 'success',
        message: 'API key status updated successfully',
        api: {
          ...api,
          api_keys: [
            generateAPIKey({ key: 'old-key', name: 'Old Key', is_active: true }),
            generateAPIKey({ key: 'new-key', name: 'New Key', is_active: true })
          ]
        }
      });

      await client.updateAPIKeyStatus({
        path: apiPath,
        api_key: 'new-key',
        is_active: true
      });

      // 3. Deactivate old key
      mockAxios.onPut('/veil/api/keys/status').replyOnce(200, {
        status: 'success',
        message: 'API key status updated successfully',
        api: {
          ...api,
          api_keys: [
            generateAPIKey({ key: 'old-key', name: 'Old Key', is_active: false }),
            generateAPIKey({ key: 'new-key', name: 'New Key', is_active: true })
          ]
        }
      });

      await client.updateAPIKeyStatus({
        path: apiPath,
        api_key: 'old-key',
        is_active: false
      });

      // 4. Delete old key after grace period
      mockAxios.onDelete('/veil/api/keys').replyOnce(200, {
        status: 'success',
        message: 'API key deleted successfully'
      });

      const deleteResult = await client.deleteAPIKey({
        path: apiPath,
        api_key: 'old-key'
      });

      expect(deleteResult.status).toBe('success');
      expect(mockAxios.history.post).toHaveLength(1);
      expect(mockAxios.history.put).toHaveLength(2);
      expect(mockAxios.history.delete).toHaveLength(1);
    });
  });

  describe('API Configuration Updates', () => {
    it('should handle complex API configuration updates', async () => {
      const apiPath = '/evolving-api/*';
      const initialConfig = generateAPIConfig({
        path: apiPath,
        upstream: 'http://localhost:8080/v1',
        methods: [{ method: 'GET' }],
        required_headers: ['Authorization']
      });

      // 1. Full update - change upstream and add methods
      const encodedPath = encodeURIComponent(apiPath);
      mockAxios.onPut(`/veil/api/routes/${encodedPath}`).replyOnce(201, {
        status: 'success',
        message: 'API updated successfully',
        api: {
          ...initialConfig,
          upstream: 'http://localhost:8080/v2',
          methods: [
            { method: 'GET' },
            { method: 'POST' },
            { method: 'PUT' }
          ]
        }
      });

      const updateResult = await client.updateAPI(apiPath, {
        path: apiPath,
        upstream: 'http://localhost:8080/v2',
        methods: ['GET', 'POST', 'PUT'],
        required_headers: ['Authorization'],
        required_subscription: 'premium'
      });

      expect(updateResult.api?.upstream).toBe('http://localhost:8080/v2');

      // 2. Partial update - add required headers
      mockAxios.onPatch(`/veil/api/routes/${encodedPath}`).replyOnce(201, {
        status: 'success',
        message: 'API updated successfully',
        api: {
          ...updateResult.api,
          required_headers: ['Authorization', 'X-Request-ID', 'X-Trace-ID']
        }
      });

      const patchResult = await client.patchAPI(apiPath, {
        required_headers: ['Authorization', 'X-Request-ID', 'X-Trace-ID']
      });

      expect(patchResult.api?.required_headers).toContain('X-Request-ID');
      expect(patchResult.api?.required_headers).toContain('X-Trace-ID');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle transient errors and successful retries', async () => {
      const apiPath = '/retry-api/*';
      
      // First attempt fails with server error
      mockAxios.onPost('/veil/api/routes').replyOnce(500, {
        error: 'Internal server error'
      });

      // First attempt should fail
      await expect(client.onboardAPI(sampleAPIOnboardRequest))
        .rejects.toThrow('Internal server error');

      // Second attempt succeeds
      mockAxios.onPost('/veil/api/routes').replyOnce(201, {
        status: 'success',
        message: 'API onboarded successfully',
        api: generateAPIConfig()
      });

      const retryResult = await client.onboardAPI(sampleAPIOnboardRequest);
      expect(retryResult.status).toBe('success');
      expect(mockAxios.history.post).toHaveLength(2);
    });

    it('should handle cascading operations with mixed results', async () => {
      const apiPath = '/cascade-api/*';
      
      // 1. Successful onboarding
      mockAxios.onPost('/veil/api/routes').replyOnce(201, {
        status: 'success',
        message: 'API onboarded successfully',
        api: generateAPIConfig({ path: apiPath })
      });

      await client.onboardAPI({
        ...sampleAPIOnboardRequest,
        path: apiPath
      });

      // 2. Failed key addition (conflicting key)
      mockAxios.onPost('/veil/api/keys').replyOnce(409, {
        error: 'API key already exists'
      });

      await expect(client.addAPIKeys({
        path: apiPath,
        api_keys: [generateAPIKey({ key: 'duplicate-key' })]
      })).rejects.toThrow('API key already exists');

      // 3. Successful key addition with different key
      mockAxios.onPost('/veil/api/keys').replyOnce(201, {
        status: 'success',
        message: 'API keys added successfully',
        api: generateAPIConfig({
          path: apiPath,
          api_keys: [generateAPIKey({ key: 'unique-key' })]
        })
      });

      const successfulKeyResult = await client.addAPIKeys({
        path: apiPath,
        api_keys: [generateAPIKey({ key: 'unique-key' })]
      });

      expect(successfulKeyResult.status).toBe('success');
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle high concurrency operations', async () => {
      const concurrentRequests = 10;
      const promises: Promise<any>[] = [];

      // Setup mock responses for all concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        mockAxios.onPost('/veil/api/routes').replyOnce(201, {
          status: 'success',
          message: 'API onboarded successfully',
          api: generateAPIConfig({ id: i + 1, path: `/api-${i}/*` })
        });
      }

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          client.onboardAPI({
            ...sampleAPIOnboardRequest,
            path: `/api-${i}/*`
          })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Verify all requests succeeded
      results.forEach((result, index) => {
        expect(result.status).toBe('success');
        expect(result.api?.id).toBe(index + 1);
      });

      // Should complete in reasonable time (assuming concurrent execution)
      expect(endTime - startTime).toBeLessThan(5000);
      expect(mockAxios.history.post).toHaveLength(concurrentRequests);
    });
  });
});