/**
 * Unit tests for VeilClient error handling and edge cases
 */

import MockAdapter from 'axios-mock-adapter';
import { VeilClient, VeilError } from '../../src';
import {
  sampleAPIOnboardRequest,
  createAxiosError,
  expectValidErrorResponse
} from './test-helpers';

describe('VeilClient Error Handling', () => {
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

  describe('VeilError Class', () => {
    it('should create VeilError with message only', () => {
      const error = new VeilError('Test error message');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(VeilError);
      expect(error.name).toBe('VeilError');
      expect(error.message).toBe('Test error message');
      expect(error.status).toBeUndefined();
      expect(error.response).toBeUndefined();
    });

    it('should create VeilError with status and response', () => {
      const responseData = { error: 'Bad request' };
      const error = new VeilError('Test error', 400, responseData);
      
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.response).toEqual(responseData);
    });

    it('should have correct error prototype chain', () => {
      const error = new VeilError('Test');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof VeilError).toBe(true);
      expect(error.constructor.name).toBe('VeilError');
    });
  });

  describe('HTTP Status Code Errors', () => {
    const testCases = [
      { status: 400, name: 'Bad Request', error: 'Invalid request data' },
      { status: 401, name: 'Unauthorized', error: 'Authentication required' },
      { status: 403, name: 'Forbidden', error: 'Access denied' },
      { status: 404, name: 'Not Found', error: 'Resource not found' },
      { status: 409, name: 'Conflict', error: 'Resource already exists' },
      { status: 422, name: 'Unprocessable Entity', error: 'Validation failed' },
      { status: 500, name: 'Internal Server Error', error: 'Server error' },
      { status: 502, name: 'Bad Gateway', error: 'Gateway error' },
      { status: 503, name: 'Service Unavailable', error: 'Service down' }
    ];

    testCases.forEach(({ status, name, error: errorMessage }) => {
      it(`should handle ${status} ${name} errors`, async () => {
        mockAxios.onPost('/veil/api/routes').reply(status, { error: errorMessage });

        try {
          await client.onboardAPI(sampleAPIOnboardRequest);
          fail(`Expected VeilError to be thrown for ${status}`);
        } catch (error) {
          expect(error).toBeInstanceOf(VeilError);
          expect(error.message).toBe(errorMessage);
          expect(error.status).toBe(status);
          expect(error.response).toEqual({ error: errorMessage });
        }
      });
    });
  });

  describe('Network Errors', () => {
    it('should handle network timeout errors', async () => {
      mockAxios.onPost('/veil/api/routes').timeout();

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown for timeout');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.message).toContain('timeout');
        expect(error.status).toBeUndefined();
      }
    });

    it('should handle network connection errors', async () => {
      mockAxios.onPost('/veil/api/routes').networkError();

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown for network error');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.message).toContain('Network Error');
        expect(error.status).toBeUndefined();
      }
    });

    it('should handle DNS resolution errors', async () => {
      const dnsClient = new VeilClient({ 
        baseUrl: 'http://non-existent-domain.invalid' 
      });
      const dnsAxios = new MockAdapter((dnsClient as any).http);
      
      dnsAxios.onPost('/veil/api/routes').networkError();

      try {
        await dnsClient.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown for DNS error');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
      } finally {
        dnsAxios.restore();
      }
    });
  });

  describe('Response Format Errors', () => {
    it('should handle responses without error field', async () => {
      mockAxios.onPost('/veil/api/routes').reply(400, { message: 'Something went wrong' });

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.status).toBe(400);
        expect(error.response).toEqual({ message: 'Something went wrong' });
      }
    });

    it('should handle empty response bodies', async () => {
      mockAxios.onPost('/veil/api/routes').reply(500, '');

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.status).toBe(500);
      }
    });

    it('should handle malformed JSON responses', async () => {
      mockAxios.onPost('/veil/api/routes').reply(400, 'invalid json{');

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.status).toBe(400);
      }
    });

    it('should handle null response data', async () => {
      mockAxios.onPost('/veil/api/routes').reply(500, null);

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.status).toBe(500);
      }
    });
  });

  describe('Request Validation Errors', () => {
    it('should handle missing required fields', async () => {
      const invalidRequest = { path: '/test/*' } as any; // Missing upstream and methods
      
      mockAxios.onPost('/veil/api/routes').reply(400, { 
        error: 'Path and upstream are required' 
      });

      try {
        await client.onboardAPI(invalidRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.message).toBe('Path and upstream are required');
        expect(error.status).toBe(400);
      }
    });

    it('should handle invalid path formats', async () => {
      const invalidPathRequest = {
        ...sampleAPIOnboardRequest,
        path: 'invalid-path-without-slash'
      };
      
      mockAxios.onPost('/veil/api/routes').reply(400, { 
        error: 'Path must start with /' 
      });

      try {
        await client.onboardAPI(invalidPathRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.message).toBe('Path must start with /');
      }
    });

    it('should handle invalid upstream URLs', async () => {
      const invalidUpstreamRequest = {
        ...sampleAPIOnboardRequest,
        upstream: 'not-a-valid-url'
      };
      
      mockAxios.onPost('/veil/api/routes').reply(400, { 
        error: 'Invalid upstream URL format' 
      });

      try {
        await client.onboardAPI(invalidUpstreamRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.message).toBe('Invalid upstream URL format');
      }
    });

    it('should handle empty methods array', async () => {
      const emptyMethodsRequest = {
        ...sampleAPIOnboardRequest,
        methods: []
      };
      
      mockAxios.onPost('/veil/api/routes').reply(400, { 
        error: 'At least one HTTP method is required' 
      });

      try {
        await client.onboardAPI(emptyMethodsRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.message).toBe('At least one HTTP method is required');
      }
    });
  });

  describe('Concurrent Request Errors', () => {
    it('should handle multiple simultaneous errors', async () => {
      mockAxios.onPost('/veil/api/routes').reply(400, { error: 'Concurrent error' });

      const promises = [
        client.onboardAPI(sampleAPIOnboardRequest),
        client.onboardAPI(sampleAPIOnboardRequest),
        client.onboardAPI(sampleAPIOnboardRequest)
      ];

      const results = await Promise.allSettled(promises);

      results.forEach(result => {
        expect(result.status).toBe('rejected');
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(VeilError);
          expect(result.reason.message).toBe('Concurrent error');
        }
      });
    });

    it('should handle mixed success and error responses', async () => {
      mockAxios
        .onPost('/veil/api/routes')
        .replyOnce(201, { status: 'success', message: 'First success' })
        .onPost('/veil/api/routes')
        .replyOnce(400, { error: 'Second failed' })
        .onPost('/veil/api/routes')
        .replyOnce(201, { status: 'success', message: 'Third success' });

      const promises = [
        client.onboardAPI({ ...sampleAPIOnboardRequest, path: '/api1/*' }),
        client.onboardAPI({ ...sampleAPIOnboardRequest, path: '/api2/*' }),
        client.onboardAPI({ ...sampleAPIOnboardRequest, path: '/api3/*' })
      ];

      const results = await Promise.allSettled(promises);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Error Recovery and Retry Scenarios', () => {
    it('should not automatically retry failed requests', async () => {
      mockAxios.onPost('/veil/api/routes').reply(500, { error: 'Server error' });

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
      }

      // Verify only one request was made
      expect(mockAxios.history.post).toHaveLength(1);
    });

    it('should handle rapid consecutive errors', async () => {
      mockAxios.onPost('/veil/api/routes').reply(429, { error: 'Rate limit exceeded' });

      const startTime = Date.now();
      
      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.message).toBe('Rate limit exceeded');
        expect(error.status).toBe(429);
      }

      const endTime = Date.now();
      // Should fail quickly without retry delays
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Error Context and Debugging', () => {
    it('should preserve original error context', async () => {
      const originalError = new Error('Original axios error');
      mockAxios.onPost('/veil/api/routes').reply(() => {
        throw originalError;
      });

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.message).toContain('Original axios error');
      }
    });

    it('should include request details in error context', async () => {
      mockAxios.onPost('/veil/api/routes').reply(config => {
        return [400, { 
          error: `Invalid request to ${config.url}`,
          method: config.method?.toUpperCase(),
          data: JSON.parse(config.data)
        }];
      });

      try {
        await client.onboardAPI(sampleAPIOnboardRequest);
        fail('Expected VeilError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VeilError);
        expect(error.response.error).toContain('/veil/api/routes');
        expect(error.response.method).toBe('POST');
        expect(error.response.data).toEqual(sampleAPIOnboardRequest);
      }
    });
  });
});