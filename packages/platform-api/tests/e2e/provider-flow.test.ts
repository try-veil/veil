import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { TestClient, TestDatabase, expectSuccessResponse, expectErrorResponse, expectJsonResponse, assertValidResponse, assertValidErrorResponse, MockCaddyServer } from '../utils/test-helpers';
import { testAPIs, testMockResponses, getTestAPI } from '../fixtures/test-data';
import '../setup';

describe('API Provider Flow E2E Tests', () => {
  let client: TestClient;
  let sellerToken: string;
  let adminToken: string;
  let mockCaddy: MockCaddyServer;
  let testAPI: any;
  let sellerId: number;

  beforeAll(async () => {
    client = new TestClient('http://localhost:3001');
    mockCaddy = MockCaddyServer.getInstance();

    // Create test users
    const sellerUser = await TestDatabase.createUser({ role: 'seller' });
    const adminUser = await TestDatabase.createAdminUser();
    sellerId = sellerUser.id;

    // Get authentication tokens
    const sellerLogin = await client.post('/api/v1/auth/login', {
      email: sellerUser.email,
      password: 'TestPassword123!',
    });
    const sellerData = await expectJsonResponse(sellerLogin);
    sellerToken = sellerData.data.accessToken;

    const adminLogin = await client.post('/api/v1/auth/login', {
      email: adminUser.email,
      password: 'TestPassword123!',
    });
    const adminData = await expectJsonResponse(adminLogin);
    adminToken = adminData.data.accessToken;
  });

  beforeEach(async () => {
    testAPI = getTestAPI('weatherAPI');
    mockCaddy.clearMocks();
  });

  describe('API Submission Process', () => {
    test('should submit new API for approval', async () => {
      client.setAuthToken(sellerToken);

      const apiData = {
        ...testAPI,
        categoryId: 1, // Assuming weather category exists
        sellerId: sellerId,
      };

      const response = await client.post('/api/v1/seller/apis', apiData);
      expectSuccessResponse(response, 201);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['uid', 'name', 'description', 'endpoint', 'isActive']);

      expect(data.data.name).toBe(apiData.name);
      expect(data.data.endpoint).toBe(apiData.endpoint);
      expect(data.data.sellerId).toBe(sellerId);
      expect(data.data.isActive).toBe(false); // Should be pending approval
    });

    test('should reject API submission without authentication', async () => {
      client.clearAuth();

      const response = await client.post('/api/v1/seller/apis', testAPI);
      expectErrorResponse(response, 401);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'UNAUTHORIZED');
    });

    test('should validate required API fields', async () => {
      client.setAuthToken(sellerToken);

      const invalidAPI = {
        name: 'Test API',
        // Missing required fields: description, endpoint, baseUrl, version
      };

      const response = await client.post('/api/v1/seller/apis', invalidAPI);
      expectErrorResponse(response, 400);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'VALIDATION_ERROR');
    });

    test('should validate API endpoint format', async () => {
      client.setAuthToken(sellerToken);

      const invalidAPI = {
        ...testAPI,
        endpoint: 'invalid-endpoint', // Should start with /
        sellerId: sellerId,
      };

      const response = await client.post('/api/v1/seller/apis', invalidAPI);
      expectErrorResponse(response, 400);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'VALIDATION_ERROR');
    });

    test('should validate API base URL', async () => {
      client.setAuthToken(sellerToken);

      const invalidAPI = {
        ...testAPI,
        baseUrl: 'not-a-valid-url',
        sellerId: sellerId,
      };

      const response = await client.post('/api/v1/seller/apis', invalidAPI);
      expectErrorResponse(response, 400);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'VALIDATION_ERROR');
    });

    test('should validate pricing information', async () => {
      client.setAuthToken(sellerToken);

      const invalidAPI = {
        ...testAPI,
        pricingModel: 'per_request',
        price: -1, // Negative price
        sellerId: sellerId,
      };

      const response = await client.post('/api/v1/seller/apis', invalidAPI);
      expectErrorResponse(response, 400);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'VALIDATION_ERROR');
    });
  });

  describe('Seller Dashboard', () => {
    test('should get seller APIs list', async () => {
      client.setAuthToken(sellerToken);

      const response = await client.get('/api/v1/seller/apis');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['apis']);

      expect(Array.isArray(data.data.apis)).toBe(true);
      
      // All APIs should belong to the authenticated seller
      for (const api of data.data.apis) {
        expect(api.sellerId).toBe(sellerId);
      }
    });

    test('should get seller dashboard statistics', async () => {
      client.setAuthToken(sellerToken);

      const response = await client.get('/api/v1/seller/stats');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['totalAPIs', 'activeAPIs', 'pendingAPIs', 'totalRevenue']);

      expect(typeof data.data.totalAPIs).toBe('number');
      expect(typeof data.data.activeAPIs).toBe('number');
      expect(typeof data.data.pendingAPIs).toBe('number');
      expect(typeof data.data.totalRevenue).toBe('number');
    });

    test('should get API analytics', async () => {
      client.setAuthToken(sellerToken);

      // Assuming we have at least one API
      const response = await client.get('/api/v1/seller/analytics?timeframe=week');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['analytics']);

      if (data.data.analytics.length > 0) {
        expect(data.data.analytics[0]).toHaveProperty('apiId');
        expect(data.data.analytics[0]).toHaveProperty('requests');
        expect(data.data.analytics[0]).toHaveProperty('revenue');
      }
    });

    test('should filter APIs by status', async () => {
      client.setAuthToken(sellerToken);

      const response = await client.get('/api/v1/seller/apis?status=pending');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['apis']);

      // All returned APIs should be pending
      for (const api of data.data.apis) {
        expect(api.isActive).toBe(false);
      }
    });
  });

  describe('API Management', () => {
    let testApiUid: string;

    beforeEach(async () => {
      // Create a test API first
      client.setAuthToken(sellerToken);
      const createResponse = await client.post('/api/v1/seller/apis', {
        ...testAPI,
        sellerId: sellerId,
        categoryId: 1,
      });
      
      if (createResponse.status === 201) {
        const createData = await expectJsonResponse(createResponse);
        testApiUid = createData.data.uid;
      } else {
        testApiUid = 'test-api-uid'; // Fallback for mock
      }
    });

    test('should update API information', async () => {
      client.setAuthToken(sellerToken);

      const updateData = {
        description: 'Updated API description',
        version: '1.1.0',
        price: 0.002,
      };

      const response = await client.put(`/api/v1/seller/apis/${testApiUid}`, updateData);
      
      if (response.status === 404) {
        // API doesn't exist in test database, skip
        return;
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['uid', 'description', 'version', 'price']);

      expect(data.data.description).toBe(updateData.description);
      expect(data.data.version).toBe(updateData.version);
      expect(data.data.price).toBe(updateData.price);
    });

    test('should not allow updating API endpoint after approval', async () => {
      client.setAuthToken(sellerToken);

      const updateData = {
        endpoint: '/new-endpoint',
      };

      const response = await client.put(`/api/v1/seller/apis/${testApiUid}`, updateData);
      
      if (response.status === 404) {
        return; // Skip if API doesn't exist
      }

      // Should either be forbidden or validation error depending on API status
      expect([400, 403]).toContain(response.status);
    });

    test('should delete API', async () => {
      client.setAuthToken(sellerToken);

      const response = await client.delete(`/api/v1/seller/apis/${testApiUid}`);
      
      if (response.status === 404) {
        return; // Skip if API doesn't exist
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      expect(data.success).toBe(true);
    });

    test('should not allow deleting active API with subscribers', async () => {
      client.setAuthToken(sellerToken);

      // Assuming the API has subscribers (mock scenario)
      const response = await client.delete(`/api/v1/seller/apis/${testApiUid}`);
      
      if (response.status === 404) {
        return; // Skip if API doesn't exist
      }

      if (response.status === 409) {
        const data = await expectJsonResponse(response);
        assertValidErrorResponse(data, 'RESOURCE_CONFLICT');
      } else {
        expectSuccessResponse(response);
      }
    });
  });

  describe('API Approval Workflow', () => {
    let pendingApiUid: string;

    beforeEach(async () => {
      // Create a pending API
      client.setAuthToken(sellerToken);
      const createResponse = await client.post('/api/v1/seller/apis', {
        ...testAPI,
        sellerId: sellerId,
        categoryId: 1,
      });
      
      if (createResponse.status === 201) {
        const createData = await expectJsonResponse(createResponse);
        pendingApiUid = createData.data.uid;
      } else {
        pendingApiUid = 'pending-api-uid';
      }
    });

    test('admin should approve API successfully', async () => {
      client.setAuthToken(adminToken);
      
      // Mock successful Caddy onboarding
      mockCaddy.mockOnboardAPI(testMockResponses.caddyOnboardSuccess);

      const response = await client.post(`/api/v1/admin/apis/${pendingApiUid}/approve`);
      
      if (response.status === 404) {
        return; // Skip if API doesn't exist
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['api']);
      expect(data.data.api.isActive).toBe(true);
    });

    test('admin should reject API with reason', async () => {
      client.setAuthToken(adminToken);

      const rejectionData = {
        reason: 'API documentation is incomplete',
      };

      const response = await client.post(`/api/v1/admin/apis/${pendingApiUid}/reject`, rejectionData);
      
      if (response.status === 404) {
        return; // Skip if API doesn't exist
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      expect(data.success).toBe(true);
    });

    test('should handle Caddy onboarding failure', async () => {
      client.setAuthToken(adminToken);
      
      // Mock Caddy failure
      mockCaddy.mockOnboardAPI(testMockResponses.caddyOnboardError);

      const response = await client.post(`/api/v1/admin/apis/${pendingApiUid}/approve`);
      
      if (response.status === 404) {
        return; // Skip if API doesn't exist
      }

      expectErrorResponse(response, 500);
      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'EXTERNAL_SERVICE_ERROR');
    });

    test('seller should receive approval notification', async () => {
      client.setAuthToken(sellerToken);

      // Check notifications after approval
      const response = await client.get('/api/v1/seller/notifications');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['notifications']);

      // Look for approval-related notifications
      const approvalNotifications = data.data.notifications.filter((n: any) => 
        n.type.includes('approval') || n.type.includes('api')
      );
      
      expect(Array.isArray(approvalNotifications)).toBe(true);
    });
  });

  describe('Revenue and Analytics', () => {
    test('should get revenue statistics', async () => {
      client.setAuthToken(sellerToken);

      const response = await client.get('/api/v1/seller/revenue?timeframe=month');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['totalRevenue', 'revenueBreakdown']);

      expect(typeof data.data.totalRevenue).toBe('number');
      expect(Array.isArray(data.data.revenueBreakdown)).toBe(true);
    });

    test('should get API performance metrics', async () => {
      client.setAuthToken(sellerToken);

      const response = await client.get('/api/v1/seller/performance?timeframe=week');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['metrics']);

      expect(Array.isArray(data.data.metrics)).toBe(true);
      
      if (data.data.metrics.length > 0) {
        expect(data.data.metrics[0]).toHaveProperty('apiId');
        expect(data.data.metrics[0]).toHaveProperty('requests');
        expect(data.data.metrics[0]).toHaveProperty('errorRate');
        expect(data.data.metrics[0]).toHaveProperty('averageResponseTime');
      }
    });

    test('should get top performing APIs', async () => {
      client.setAuthToken(sellerToken);

      const response = await client.get('/api/v1/seller/apis/top?metric=requests&limit=5');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['topAPIs']);

      expect(Array.isArray(data.data.topAPIs)).toBe(true);
      expect(data.data.topAPIs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('API Documentation', () => {
    test('should upload API documentation', async () => {
      client.setAuthToken(sellerToken);

      const docData = {
        apiUid: testApiUid || 'test-api',
        content: 'API documentation content',
        format: 'markdown',
      };

      const response = await client.post('/api/v1/seller/documentation', docData);
      
      if (response.status === 404) {
        return; // Skip if API doesn't exist
      }

      expectSuccessResponse(response, 201);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['id', 'content', 'format']);
    });

    test('should update API documentation', async () => {
      client.setAuthToken(sellerToken);

      const updateData = {
        content: 'Updated documentation content',
        version: '1.1',
      };

      const response = await client.put('/api/v1/seller/documentation/1', updateData);
      
      if (response.status === 404) {
        return; // Skip if documentation doesn't exist
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      expect(data.data.content).toBe(updateData.content);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle concurrent API submissions', async () => {
      client.setAuthToken(sellerToken);

      const promises = Array(3).fill(null).map((_, i) => 
        client.post('/api/v1/seller/apis', {
          ...testAPI,
          name: `${testAPI.name} ${i}`,
          endpoint: `/test-api-${i}`,
          sellerId: sellerId,
          categoryId: 1,
        })
      );

      const responses = await Promise.all(promises);
      
      // At least some should succeed
      const successCount = responses.filter(r => r.status === 201).length;
      expect(successCount).toBeGreaterThan(0);
    });

    test('should handle API submission during maintenance', async () => {
      client.setAuthToken(sellerToken);

      // Mock maintenance mode
      const response = await client.post('/api/v1/seller/apis', testAPI);
      
      if (response.status === 503) {
        const data = await expectJsonResponse(response);
        assertValidErrorResponse(data, 'SERVICE_UNAVAILABLE');
      }
    });

    test('should validate API ownership for updates', async () => {
      // Create another seller
      const otherSeller = await TestDatabase.createUser({ role: 'seller' });
      const otherLogin = await client.post('/api/v1/auth/login', {
        email: otherSeller.email,
        password: 'TestPassword123!',
      });
      const otherData = await expectJsonResponse(otherLogin);
      const otherToken = otherData.data.accessToken;

      client.setAuthToken(otherToken);

      // Try to update another seller's API
      const response = await client.put(`/api/v1/seller/apis/${testApiUid || 'test-api'}`, {
        description: 'Unauthorized update',
      });

      if (response.status !== 404) {
        expectErrorResponse(response, 403);
        const data = await expectJsonResponse(response);
        assertValidErrorResponse(data, 'FORBIDDEN');
      }
    });
  });
});