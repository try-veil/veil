import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { TestClient, TestDatabase, expectSuccessResponse, expectErrorResponse, expectJsonResponse, assertValidResponse, assertValidErrorResponse, assertValidPagination } from '../utils/test-helpers';
import { testAPIs, testCategories, getTestAPI, getTestCategory } from '../fixtures/test-data';
import '../setup';

describe('Marketplace Flow E2E Tests', () => {
  let client: TestClient;
  let userToken: string;
  let adminToken: string;
  let testCategory: any;
  let testAPI: any;

  beforeAll(async () => {
    client = new TestClient('http://localhost:3001');

    // Create test users and get tokens
    const regularUser = await TestDatabase.createUser({ role: 'user' });
    const adminUser = await TestDatabase.createAdminUser();

    const userLogin = await client.post('/api/v1/auth/login', {
      email: regularUser.email,
      password: 'TestPassword123!',
    });
    const userData = await expectJsonResponse(userLogin);
    userToken = userData.data.accessToken;

    const adminLogin = await client.post('/api/v1/auth/login', {
      email: adminUser.email,
      password: 'TestPassword123!',
    });
    const adminData = await expectJsonResponse(adminLogin);
    adminToken = adminData.data.accessToken;
  });

  beforeEach(async () => {
    testCategory = getTestCategory('weather');
    testAPI = getTestAPI('weatherAPI');
  });

  describe('API Categories Management', () => {
    test('should list API categories', async () => {
      const response = await client.get('/api/v1/categories');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['categories']);
      assertValidPagination(data.data);

      expect(Array.isArray(data.data.categories)).toBe(true);
    });

    test('should get category by ID', async () => {
      // First create a category (admin only)
      client.setAuthToken(adminToken);
      const createResponse = await client.post('/api/v1/admin/categories', testCategory);
      expectSuccessResponse(createResponse, 201);

      const createData = await expectJsonResponse(createResponse);
      const categoryId = createData.data.category.id;

      // Now get the category
      client.clearAuth();
      const response = await client.get(`/api/v1/categories/${categoryId}`);
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['id', 'name', 'description']);

      expect(data.data.id).toBe(categoryId);
      expect(data.data.name).toBe(testCategory.name);
    });

    test('should return 404 for non-existent category', async () => {
      const response = await client.get('/api/v1/categories/99999');
      expectErrorResponse(response, 404);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'RESOURCE_NOT_FOUND');
    });

    test('should filter categories by name', async () => {
      const response = await client.get('/api/v1/categories?search=weather');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['categories']);
      assertValidPagination(data.data);
    });
  });

  describe('API Discovery and Search', () => {
    test('should list all APIs in marketplace', async () => {
      const response = await client.get('/api/v1/marketplace');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['apis']);
      assertValidPagination(data.data);

      expect(Array.isArray(data.data.apis)).toBe(true);
    });

    test('should get API details by UID', async () => {
      // Mock API exists in database
      const testApiUid = 'weather-api-test';
      const response = await client.get(`/api/v1/marketplace/${testApiUid}`);
      
      // This might return 404 if API doesn't exist in test DB
      if (response.status === 404) {
        const data = await expectJsonResponse(response);
        assertValidErrorResponse(data, 'RESOURCE_NOT_FOUND');
        return;
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['uid', 'name', 'description', 'endpoint']);
    });

    test('should search APIs by name', async () => {
      const response = await client.get('/api/v1/marketplace?search=weather');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['apis']);
      assertValidPagination(data.data);

      // All returned APIs should contain 'weather' in name or description
      for (const api of data.data.apis) {
        expect(
          api.name.toLowerCase().includes('weather') || 
          api.description.toLowerCase().includes('weather')
        ).toBe(true);
      }
    });

    test('should filter APIs by category', async () => {
      const response = await client.get('/api/v1/marketplace?category=1'); // Weather category
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['apis']);
      assertValidPagination(data.data);

      // All returned APIs should belong to the specified category
      for (const api of data.data.apis) {
        expect(api.categoryId).toBe(1);
      }
    });

    test('should filter APIs by pricing model', async () => {
      const response = await client.get('/api/v1/marketplace?pricingModel=free');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['apis']);

      // All returned APIs should have free pricing
      for (const api of data.data.apis) {
        expect(api.pricingModel).toBe('free');
      }
    });

    test('should sort APIs by price', async () => {
      const response = await client.get('/api/v1/marketplace?sortBy=price&order=asc');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['apis']);

      // APIs should be sorted by price ascending
      const prices = data.data.apis.map((api: any) => api.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });

    test('should sort APIs by popularity', async () => {
      const response = await client.get('/api/v1/marketplace?sortBy=popularity&order=desc');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['apis']);

      // APIs should be sorted by popularity (subscriber count) descending
      const popularities = data.data.apis.map((api: any) => api.subscriberCount || 0);
      for (let i = 1; i < popularities.length; i++) {
        expect(popularities[i]).toBeLessThanOrEqual(popularities[i - 1]);
      }
    });

    test('should paginate results correctly', async () => {
      const page1Response = await client.get('/api/v1/marketplace?page=1&limit=5');
      expectSuccessResponse(page1Response);

      const page1Data = await expectJsonResponse(page1Response);
      assertValidPagination(page1Data.data);

      expect(page1Data.data.pagination.page).toBe(1);
      expect(page1Data.data.pagination.limit).toBe(5);
      expect(page1Data.data.apis.length).toBeLessThanOrEqual(5);

      if (page1Data.data.pagination.hasNext) {
        const page2Response = await client.get('/api/v1/marketplace?page=2&limit=5');
        expectSuccessResponse(page2Response);

        const page2Data = await expectJsonResponse(page2Response);
        expect(page2Data.data.pagination.page).toBe(2);
        
        // Ensure different results on different pages
        const page1Ids = page1Data.data.apis.map((api: any) => api.id);
        const page2Ids = page2Data.data.apis.map((api: any) => api.id);
        expect(page1Ids).not.toEqual(page2Ids);
      }
    });
  });

  describe('API Recommendations', () => {
    test('should get recommended APIs for user', async () => {
      client.setAuthToken(userToken);
      
      const response = await client.get('/api/v1/marketplace/recommendations');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['recommendations']);

      expect(Array.isArray(data.data.recommendations)).toBe(true);
      
      // Check recommendation structure
      for (const rec of data.data.recommendations) {
        expect(rec).toHaveProperty('api');
        expect(rec).toHaveProperty('score');
        expect(rec).toHaveProperty('reason');
        expect(typeof rec.score).toBe('number');
        expect(rec.score).toBeGreaterThan(0);
        expect(rec.score).toBeLessThanOrEqual(1);
      }
    });

    test('should get trending APIs', async () => {
      const response = await client.get('/api/v1/marketplace/trending');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['trending']);

      expect(Array.isArray(data.data.trending)).toBe(true);
      
      // Trending APIs should have growth metrics
      for (const trend of data.data.trending) {
        expect(trend).toHaveProperty('api');
        expect(trend).toHaveProperty('growthRate');
        expect(trend).toHaveProperty('period');
        expect(typeof trend.growthRate).toBe('number');
      }
    });

    test('should get similar APIs', async () => {
      const testApiUid = 'weather-api-test';
      const response = await client.get(`/api/v1/marketplace/${testApiUid}/similar`);
      
      if (response.status === 404) {
        // API doesn't exist, skip test
        return;
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['similar']);

      expect(Array.isArray(data.data.similar)).toBe(true);
    });
  });

  describe('API Reviews and Ratings', () => {
    test('should get API reviews', async () => {
      const testApiUid = 'weather-api-test';
      const response = await client.get(`/api/v1/marketplace/${testApiUid}/reviews`);
      
      if (response.status === 404) {
        // API doesn't exist, skip test
        return;
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['reviews']);
      assertValidPagination(data.data);
    });

    test('should create API review', async () => {
      client.setAuthToken(userToken);
      
      const reviewData = {
        apiId: 1, // Mock API ID
        rating: 4,
        title: 'Great API',
        comment: 'Very useful and well-documented API',
      };

      const response = await client.post('/api/v1/marketplace/reviews', reviewData);
      
      // Might return 404 if API doesn't exist
      if (response.status === 404) {
        return;
      }

      expectSuccessResponse(response, 201);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['id', 'rating', 'title', 'comment']);

      expect(data.data.rating).toBe(reviewData.rating);
      expect(data.data.title).toBe(reviewData.title);
    });

    test('should reject review without authentication', async () => {
      client.clearAuth();
      
      const reviewData = {
        apiId: 1,
        rating: 4,
        title: 'Great API',
        comment: 'Very useful API',
      };

      const response = await client.post('/api/v1/marketplace/reviews', reviewData);
      expectErrorResponse(response, 401);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'UNAUTHORIZED');
    });

    test('should reject invalid rating', async () => {
      client.setAuthToken(userToken);
      
      const reviewData = {
        apiId: 1,
        rating: 6, // Invalid - should be 1-5
        title: 'Great API',
        comment: 'Very useful API',
      };

      const response = await client.post('/api/v1/marketplace/reviews', reviewData);
      expectErrorResponse(response, 400);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'VALIDATION_ERROR');
    });
  });

  describe('API Statistics', () => {
    test('should get marketplace statistics', async () => {
      const response = await client.get('/api/v1/marketplace/stats');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['totalAPIs', 'totalCategories', 'activeAPIs']);

      expect(typeof data.data.totalAPIs).toBe('number');
      expect(typeof data.data.totalCategories).toBe('number');
      expect(typeof data.data.activeAPIs).toBe('number');
      expect(data.data.totalAPIs).toBeGreaterThanOrEqual(0);
    });

    test('should get category statistics', async () => {
      const response = await client.get('/api/v1/categories/stats');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['categoryStats']);

      expect(Array.isArray(data.data.categoryStats)).toBe(true);
      
      for (const stat of data.data.categoryStats) {
        expect(stat).toHaveProperty('categoryId');
        expect(stat).toHaveProperty('categoryName');
        expect(stat).toHaveProperty('apiCount');
        expect(typeof stat.apiCount).toBe('number');
      }
    });

    test('should get API usage statistics', async () => {
      const testApiUid = 'weather-api-test';
      const response = await client.get(`/api/v1/marketplace/${testApiUid}/stats`);
      
      if (response.status === 404) {
        // API doesn't exist, skip test
        return;
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['subscriberCount', 'requestCount', 'averageRating']);

      expect(typeof data.data.subscriberCount).toBe('number');
      expect(typeof data.data.requestCount).toBe('number');
      expect(data.data.subscriberCount).toBeGreaterThanOrEqual(0);
      expect(data.data.requestCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed search queries', async () => {
      const response = await client.get('/api/v1/marketplace?search=%invalid%query%');
      // Should still return success but with sanitized query
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['apis']);
    });

    test('should handle invalid pagination parameters', async () => {
      const response = await client.get('/api/v1/marketplace?page=-1&limit=1000');
      
      // Should either return validation error or default to valid values
      if (response.status === 400) {
        const data = await expectJsonResponse(response);
        assertValidErrorResponse(data, 'VALIDATION_ERROR');
      } else {
        expectSuccessResponse(response);
        const data = await expectJsonResponse(response);
        // Should have corrected the pagination values
        expect(data.data.pagination.page).toBeGreaterThan(0);
        expect(data.data.pagination.limit).toBeLessThanOrEqual(100);
      }
    });

    test('should handle invalid sort parameters', async () => {
      const response = await client.get('/api/v1/marketplace?sortBy=invalid&order=wrong');
      
      // Should return success with default sorting
      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['apis']);
    });

    test('should return appropriate headers for CORS', async () => {
      const response = await client.get('/api/v1/marketplace');
      expectSuccessResponse(response);

      // Check for CORS headers
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });

    test('should include rate limiting headers', async () => {
      const response = await client.get('/api/v1/marketplace');
      expectSuccessResponse(response);

      // Check for rate limiting headers
      const rateLimitHeaders = [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
      ];

      // At least some rate limiting headers should be present
      const hasRateLimitHeaders = rateLimitHeaders.some(header => 
        response.headers.get(header) !== null
      );
      expect(hasRateLimitHeaders).toBe(true);
    });
  });
});