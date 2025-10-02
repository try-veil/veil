/**
 * Unit tests for VeilClient class
 */

import MockAdapter from 'axios-mock-adapter';
import { VeilClient, VeilError } from '../../src';
import {
  sampleAPIOnboardRequest,
  sampleSuccessResponse,
  sampleErrorResponse,
  createMockSuccessResponse,
  createAxiosError,
  expectValidAPIResponse,
  expectValidErrorResponse,
  generateAPIConfig
} from './test-helpers';

describe('VeilClient', () => {
  let client: VeilClient;
  let mockAxios: MockAdapter;

  beforeEach(() => {
    client = new VeilClient({
      baseUrl: 'http://localhost:2020',
      timeout: 5000
    });
    
    // Create mock adapter for the axios instance
    mockAxios = new MockAdapter((client as any).http);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('Constructor and Configuration', () => {
    it('should create client with default options', () => {
      const defaultClient = new VeilClient();
      expect(defaultClient.managementUrl).toBe('http://localhost:2020');
      expect(defaultClient.proxiedUrl).toBe('http://localhost:2021');
    });

    it('should create client with custom options', () => {
      const customClient = new VeilClient({
        baseUrl: 'https://api.example.com:3000',
        timeout: 10000,
        headers: { 'X-Custom': 'test' }
      });
      
      expect(customClient.managementUrl).toBe('https://api.example.com:3000');
      expect(customClient.proxiedUrl).toBe('https://api.example.com:2021');
    });

    it('should generate correct proxied URL for different base URLs', () => {
      const httpsClient = new VeilClient({
        baseUrl: 'https://secure.example.com:8080'
      });
      
      expect(httpsClient.proxiedUrl).toBe('https://secure.example.com:2021');
    });
  });

  describe('API Management Methods', () => {
    describe('onboardAPI', () => {
      it('should successfully onboard an API', async () => {
        const expectedResponse = sampleSuccessResponse;
        mockAxios.onPost('/veil/api/routes').reply(201, expectedResponse);

        const result = await client.onboardAPI(sampleAPIOnboardRequest);

        expect(result).toEqual(expectedResponse);
        expectValidAPIResponse(result);
        expect(result.status).toBe('success');
        expect(result.api).toBeDefined();
      });

      it('should handle onboarding errors', async () => {
        mockAxios.onPost('/veil/api/routes').reply(400, sampleErrorResponse);

        await expect(client.onboardAPI(sampleAPIOnboardRequest))
          .rejects.toBeVeilError();
      });

      it('should handle network errors', async () => {
        mockAxios.onPost('/veil/api/routes').networkError();

        await expect(client.onboardAPI(sampleAPIOnboardRequest))
          .rejects.toThrow('Network Error');
      });

      it('should include all required fields in request', async () => {
        mockAxios.onPost('/veil/api/routes').reply(config => {
          const requestData = JSON.parse(config.data);
          expect(requestData).toMatchObject({
            path: sampleAPIOnboardRequest.path,
            upstream: sampleAPIOnboardRequest.upstream,
            methods: sampleAPIOnboardRequest.methods
          });
          return [201, sampleSuccessResponse];
        });

        await client.onboardAPI(sampleAPIOnboardRequest);
      });
    });

    describe('updateAPI', () => {
      it('should successfully update an API', async () => {
        const apiPath = '/weather/*';
        const encodedPath = encodeURIComponent(apiPath);
        const expectedResponse = { ...sampleSuccessResponse, message: 'API updated successfully' };
        
        mockAxios.onPut(`/veil/api/routes/${encodedPath}`).reply(201, expectedResponse);

        const result = await client.updateAPI(apiPath, sampleAPIOnboardRequest);

        expect(result).toEqual(expectedResponse);
        expectValidAPIResponse(result);
      });

      it('should URL encode the API path', async () => {
        const apiPath = '/weather with spaces/*';
        const encodedPath = encodeURIComponent(apiPath);
        
        mockAxios.onPut(`/veil/api/routes/${encodedPath}`).reply(201, sampleSuccessResponse);

        await client.updateAPI(apiPath, sampleAPIOnboardRequest);

        expect(mockAxios.history.put[0].url).toBe(`/veil/api/routes/${encodedPath}`);
      });

      it('should handle API not found error', async () => {
        const apiPath = '/non-existent/*';
        const encodedPath = encodeURIComponent(apiPath);
        
        mockAxios.onPut(`/veil/api/routes/${encodedPath}`).reply(404, { error: 'API not found' });

        await expect(client.updateAPI(apiPath, sampleAPIOnboardRequest))
          .rejects.toBeVeilError();
      });
    });

    describe('patchAPI', () => {
      it('should successfully patch an API', async () => {
        const apiPath = '/weather/*';
        const encodedPath = encodeURIComponent(apiPath);
        const partialUpdate = { upstream: 'http://localhost:8084/weather' };
        const expectedResponse = { ...sampleSuccessResponse, message: 'API updated successfully' };
        
        mockAxios.onPatch(`/veil/api/routes/${encodedPath}`).reply(201, expectedResponse);

        const result = await client.patchAPI(apiPath, partialUpdate);

        expect(result).toEqual(expectedResponse);
        expectValidAPIResponse(result);
      });

      it('should send only provided fields in patch request', async () => {
        const apiPath = '/weather/*';
        const partialUpdate = { upstream: 'http://localhost:8084/weather' };
        
        mockAxios.onPatch().reply(config => {
          const requestData = JSON.parse(config.data);
          expect(requestData).toEqual(partialUpdate);
          expect(requestData).not.toHaveProperty('path');
          expect(requestData).not.toHaveProperty('methods');
          return [201, sampleSuccessResponse];
        });

        await client.patchAPI(apiPath, partialUpdate);
      });
    });

    describe('deleteAPI', () => {
      it('should successfully delete an API', async () => {
        const apiPath = '/weather/*';
        const encodedPath = encodeURIComponent(apiPath);
        const expectedResponse = { status: 'success', message: 'API deleted successfully' };
        
        mockAxios.onDelete(`/veil/api/routes/${encodedPath}`).reply(200, expectedResponse);

        const result = await client.deleteAPI(apiPath);

        expect(result).toEqual(expectedResponse);
        expectValidAPIResponse(result);
        expect(result.status).toBe('success');
      });

      it('should handle deletion of non-existent API', async () => {
        const apiPath = '/non-existent/*';
        const encodedPath = encodeURIComponent(apiPath);
        
        mockAxios.onDelete(`/veil/api/routes/${encodedPath}`).reply(404, { error: 'API not found' });

        await expect(client.deleteAPI(apiPath))
          .rejects.toBeVeilError();
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw VeilError with status and response for HTTP errors', async () => {
      const errorData = { error: 'Invalid request' };
      mockAxios.onPost('/veil/api/routes').reply(400, errorData);

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.message).toBe('Invalid request');
        expect(error.status).toBe(400);
        expect(error.response).toEqual(errorData);
      }
    });

    it('should throw VeilError for network errors', async () => {
      mockAxios.onPost('/veil/api/routes').networkError();

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.message).toContain('Network Error');
        expect(error.status).toBeUndefined();
      }
    });

    it('should throw VeilError for timeout errors', async () => {
      mockAxios.onPost('/veil/api/routes').timeout();

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.message).toContain('timeout');
      }
    });

    it('should handle errors without response data', async () => {
      mockAxios.onPost('/veil/api/routes').reply(500);

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.status).toBe(500);
      }
    });
  });

  describe('HTTP Client Configuration', () => {
    it('should set correct headers', async () => {
      mockAxios.onPost('/veil/api/routes').reply(config => {
        expect(config.headers['Content-Type']).toBe('application/json');
        return [201, sampleSuccessResponse];
      });

      await client.onboardAPI(sampleAPIOnboardRequest);
    });

    it('should respect timeout configuration', () => {
      const timeoutClient = new VeilClient({ timeout: 15000 });
      // Access the private http property for testing
      const httpInstance = (timeoutClient as any).http;
      expect(httpInstance.defaults.timeout).toBe(15000);
    });

    it('should include custom headers', () => {
      const customClient = new VeilClient({
        headers: { 'X-Custom-Header': 'test-value' }
      });
      
      const httpInstance = (customClient as any).http;
      expect(httpInstance.defaults.headers['X-Custom-Header']).toBe('test-value');
    });
  });
});