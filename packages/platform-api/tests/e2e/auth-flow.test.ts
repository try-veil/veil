import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { TestClient, TestDatabase, expectSuccessResponse, expectErrorResponse, expectJsonResponse, assertValidResponse, assertValidErrorResponse, generateTestEmail } from '../utils/test-helpers';
import { testUsers, getTestUser } from '../fixtures/test-data';
import '../setup';

describe('Authentication Flow E2E Tests', () => {
  let client: TestClient;
  let testUser: any;

  beforeAll(async () => {
    client = new TestClient('http://localhost:3001');
  });

  beforeEach(async () => {
    testUser = await TestDatabase.createUser({
      email: generateTestEmail(),
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
    });
  });

  describe('User Registration', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: generateTestEmail(),
        firstName: 'John',
        lastName: 'Doe',
        password: 'SecurePassword123!',
      };

      const response = await client.post('/api/v1/auth/register', userData);
      expectSuccessResponse(response, 201);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['user', 'accessToken', 'refreshToken']);

      expect(data.data.user.email).toBe(userData.email);
      expect(data.data.user.firstName).toBe(userData.firstName);
      expect(data.data.user.lastName).toBe(userData.lastName);
      expect(data.data.user.role).toBe('user');
      expect(data.data.user.password).toBeUndefined(); // Password should not be returned
    });

    test('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        password: 'SecurePassword123!',
      };

      const response = await client.post('/api/v1/auth/register', userData);
      expectErrorResponse(response, 400);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'VALIDATION_ERROR');
    });

    test('should reject registration with weak password', async () => {
      const userData = {
        email: generateTestEmail(),
        firstName: 'John',
        lastName: 'Doe',
        password: 'weak',
      };

      const response = await client.post('/api/v1/auth/register', userData);
      expectErrorResponse(response, 400);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'VALIDATION_ERROR');
    });

    test('should reject registration with duplicate email', async () => {
      const userData = {
        email: testUser.email, // Use existing user's email
        firstName: 'John',
        lastName: 'Doe',
        password: 'SecurePassword123!',
      };

      const response = await client.post('/api/v1/auth/register', userData);
      expectErrorResponse(response, 409);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'RESOURCE_ALREADY_EXISTS');
    });
  });

  describe('User Login', () => {
    test('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!', // Mock password
      };

      const response = await client.post('/api/v1/auth/login', loginData);
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['user', 'accessToken', 'refreshToken']);

      expect(data.data.user.email).toBe(testUser.email);
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
    });

    test('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      };

      const response = await client.post('/api/v1/auth/login', loginData);
      expectErrorResponse(response, 401);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'UNAUTHORIZED');
    });

    test('should reject login with invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'WrongPassword123!',
      };

      const response = await client.post('/api/v1/auth/login', loginData);
      expectErrorResponse(response, 401);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'UNAUTHORIZED');
    });
  });

  describe('Token Management', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Mock login to get tokens
      const loginResponse = await client.post('/api/v1/auth/login', {
        email: testUser.email,
        password: 'TestPassword123!',
      });
      
      const loginData = await expectJsonResponse(loginResponse);
      accessToken = loginData.data.accessToken;
      refreshToken = loginData.data.refreshToken;
    });

    test('should refresh access token successfully', async () => {
      const response = await client.post('/api/v1/auth/refresh', {
        refreshToken,
      });
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['accessToken', 'refreshToken']);

      expect(data.data.accessToken).toBeDefined();
      expect(data.data.accessToken).not.toBe(accessToken); // Should be a new token
    });

    test('should reject refresh with invalid token', async () => {
      const response = await client.post('/api/v1/auth/refresh', {
        refreshToken: 'invalid-refresh-token',
      });
      expectErrorResponse(response, 401);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'INVALID_TOKEN');
    });

    test('should logout successfully', async () => {
      client.setAuthToken(accessToken);
      
      const response = await client.post('/api/v1/auth/logout', {
        refreshToken,
      });
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      expect(data.success).toBe(true);
    });

    test('should access protected route with valid token', async () => {
      client.setAuthToken(accessToken);
      
      const response = await client.get('/api/v1/profile');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['id', 'email', 'firstName', 'lastName']);
    });

    test('should reject protected route with invalid token', async () => {
      client.setAuthToken('invalid-token');
      
      const response = await client.get('/api/v1/profile');
      expectErrorResponse(response, 401);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'INVALID_TOKEN');
    });

    test('should reject protected route without token', async () => {
      client.clearAuth();
      
      const response = await client.get('/api/v1/profile');
      expectErrorResponse(response, 401);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'UNAUTHORIZED');
    });
  });

  describe('Password Management', () => {
    let accessToken: string;

    beforeEach(async () => {
      const loginResponse = await client.post('/api/v1/auth/login', {
        email: testUser.email,
        password: 'TestPassword123!',
      });
      
      const loginData = await expectJsonResponse(loginResponse);
      accessToken = loginData.data.accessToken;
      client.setAuthToken(accessToken);
    });

    test('should request password reset', async () => {
      const response = await client.post('/api/v1/auth/forgot-password', {
        email: testUser.email,
      });
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.message).toContain('reset');
    });

    test('should change password with valid current password', async () => {
      const response = await client.post('/api/v1/auth/change-password', {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewSecurePassword123!',
      });
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      expect(data.success).toBe(true);
    });

    test('should reject password change with invalid current password', async () => {
      const response = await client.post('/api/v1/auth/change-password', {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewSecurePassword123!',
      });
      expectErrorResponse(response, 400);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'VALIDATION_ERROR');
    });
  });

  describe('Role-Based Access Control', () => {
    let regularUserToken: string;
    let adminUserToken: string;

    beforeEach(async () => {
      // Create regular user and admin user
      const regularUser = await TestDatabase.createUser({ role: 'user' });
      const adminUser = await TestDatabase.createAdminUser();

      // Get tokens for both users
      const regularLogin = await client.post('/api/v1/auth/login', {
        email: regularUser.email,
        password: 'TestPassword123!',
      });
      const regularData = await expectJsonResponse(regularLogin);
      regularUserToken = regularData.data.accessToken;

      const adminLogin = await client.post('/api/v1/auth/login', {
        email: adminUser.email,
        password: 'TestPassword123!',
      });
      const adminData = await expectJsonResponse(adminLogin);
      adminUserToken = adminData.data.accessToken;
    });

    test('should allow admin access to admin routes', async () => {
      client.setAuthToken(adminUserToken);
      
      const response = await client.get('/api/v1/admin/stats');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['totalUsers', 'totalApis']);
    });

    test('should deny regular user access to admin routes', async () => {
      client.setAuthToken(regularUserToken);
      
      const response = await client.get('/api/v1/admin/stats');
      expectErrorResponse(response, 403);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'FORBIDDEN');
    });

    test('should allow both users access to general routes', async () => {
      // Test with regular user
      client.setAuthToken(regularUserToken);
      let response = await client.get('/api/v1/marketplace');
      expectSuccessResponse(response);

      // Test with admin user
      client.setAuthToken(adminUserToken);
      response = await client.get('/api/v1/marketplace');
      expectSuccessResponse(response);
    });
  });
});