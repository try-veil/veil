import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/services/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

describe('API Onboarding Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let configService: ConfigService;
  let testTenant: any;
  let testUser: any;
  let testProject: any;
  let testProjectAcl: any;
  let gatewayUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    await app.init();

    gatewayUrl =
      configService.get<string>('GATEWAY_URL') || 'http://localhost:2020';

    // Create test tenant and user
    const username = `testuser_${Date.now()}_${uuidv4()}`;

    try {
      // Clean up any existing test data
      await prisma.projectAllowedAPI.deleteMany({
        where: { project: { name: { startsWith: 'test_project_' } } },
      });
      await prisma.projectAcl.deleteMany({
        where: { project: { name: { startsWith: 'test_project_' } } },
      });
      await prisma.project.deleteMany({
        where: { name: { startsWith: 'test_project_' } },
      });

      // Delete wallets first due to foreign key constraints
      await prisma.walletTransaction.deleteMany({
        where: {
          wallet: { customer: { username: { startsWith: 'testuser_' } } },
        },
      });
      await prisma.wallet.deleteMany({
        where: { customer: { username: { startsWith: 'testuser_' } } },
      });

      // Now safe to delete users
      await prisma.user.deleteMany({
        where: { username: { startsWith: 'testuser_' } },
      });
      await prisma.tenant.deleteMany({
        where: { name: { startsWith: 'Test Tenant' } },
      });

      // Create test tenant
      testTenant = await prisma.tenant.create({
        data: {
          id: uuidv4(),
          name: 'Test Tenant',
          domain: 'test.example.com',
          slugifiedKey: 'test',
        },
      });

      // Create test user
      testUser = await prisma.user.create({
        data: {
          id: uuidv4(),
          fusionAuthId: uuidv4(),
          name: 'Test User',
          username,
          email: `${username}@example.com`,
          slugifiedName: username,
        },
      });

      // Create test project
      testProject = await prisma.project.create({
        data: {
          name: `test_project_${Date.now()}`,
        },
      });

      // Link project to tenant through ProjectAcl
      testProjectAcl = await prisma.projectAcl.create({
        data: {
          userId: testUser.id,
          projectId: testProject.id,
        },
      });

      console.log('Test setup complete:', {
        tenantId: testTenant.id,
        userId: testUser.id,
        projectId: testProject.id,
        projectAclId: testProjectAcl.id,
      });
    } catch (error) {
      console.error('Error setting up test data:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up test data in correct order
      await prisma.projectAllowedAPI.deleteMany({
        where: { projectId: testProject?.id },
      });
      await prisma.projectAcl.deleteMany({
        where: { projectId: testProject?.id },
      });
      await prisma.project
        .delete({
          where: { id: testProject?.id },
        })
        .catch(() => {}); // Ignore if already deleted

      // Delete wallets first
      await prisma.walletTransaction.deleteMany({
        where: { wallet: { customerId: testUser?.id } },
      });
      await prisma.wallet.deleteMany({
        where: { customerId: testUser?.id },
      });

      // Now safe to delete user and tenant
      if (testUser?.id) {
        await prisma.user
          .delete({
            where: { id: testUser.id },
          })
          .catch(() => {}); // Ignore if already deleted
      }
      if (testTenant?.id) {
        await prisma.tenant
          .delete({
            where: { id: testTenant.id },
          })
          .catch(() => {}); // Ignore if already deleted
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }

    await prisma.$disconnect();
    await app.close();
  });

  describe('API Onboarding', () => {
    let apiPath: string;
    let apiKey: string;

    beforeEach(() => {
      apiPath = `/api/v1/test-${Date.now()}/*`;
      apiKey = `test-key-${Date.now()}`;
    });

    it('should onboard a new API successfully', async () => {
      const response = await request(gatewayUrl)
        .post('/veil/api/onboard')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('X-API-Key', apiKey)
        .send({
          path: apiPath,
          upstream: 'http://localhost:8081',
          required_subscription: 'premium',
          methods: ['GET', 'POST'],
          required_headers: ['X-API-Key', 'X-Request-ID'],
          parameters: [
            {
              name: 'category',
              type: 'query',
              required: true,
            },
          ],
          api_keys: [
            {
              key: apiKey,
              name: 'Test API Key',
              is_active: true,
            },
          ],
        });

      console.log('Onboarding response:', response.body);
      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.path).toBeDefined();
      expect(response.body.path).toBe(apiPath);
      expect(response.body.upstream).toBe('http://localhost:8081');
    });

    it('should fail to onboard API with missing required fields', async () => {
      const response = await request(gatewayUrl)
        .post('/veil/api/onboard')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('X-API-Key', apiKey)
        .send({
          path: apiPath,
          // Missing upstream
          methods: ['GET'],
        });

      console.log('Missing fields response:', response.body);
      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should fail to onboard duplicate API path', async () => {
      // First onboarding
      const firstResponse = await request(gatewayUrl)
        .post('/veil/api/onboard')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('X-API-Key', apiKey)
        .send({
          path: apiPath,
          upstream: 'http://localhost:8081',
          methods: ['GET'],
          api_keys: [{ key: apiKey, name: 'Test Key', is_active: true }],
        });

      expect(firstResponse.status).toBe(201);

      // Duplicate onboarding
      const response = await request(gatewayUrl)
        .post('/veil/api/onboard')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('X-API-Key', apiKey)
        .send({
          path: apiPath,
          upstream: 'http://localhost:8082',
          methods: ['GET'],
          api_keys: [
            { key: `${apiKey}-2`, name: 'Test Key 2', is_active: true },
          ],
        });

      console.log('Duplicate API response:', response.body);
      expect(response.status).toBe(409); // Changed to 409 Conflict
      expect(response.body).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(response.body.message.toLowerCase()).toMatch(
        /exists|duplicate|already/i,
      );
    });
  });

  describe('API Key Management', () => {
    let apiPath: string;
    let apiKey: string;

    beforeEach(() => {
      apiPath = `/api/v1/test-${Date.now()}/*`;
      apiKey = `test-key-${Date.now()}`;
    });

    it('should add new API keys to existing API', async () => {
      // First, onboard an API
      await request(gatewayUrl)
        .post('/veil/api/onboard')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('X-API-Key', apiKey)
        .send({
          path: apiPath,
          upstream: 'http://localhost:8081',
          methods: ['GET'],
          api_keys: [{ key: apiKey, name: 'Test Key', is_active: true }],
        });

      // Then add new API keys
      const response = await request(gatewayUrl)
        .post('/veil/api/keys')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('X-API-Key', apiKey)
        .send({
          path: apiPath,
          api_keys: [
            {
              key: `${apiKey}-new`,
              name: 'New Test Key',
              is_active: true,
            },
          ],
        });

      console.log('Add API key response:', response.body);
      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.path).toBe(apiPath);
      expect(response.body.api_keys).toBeDefined();
      expect(Array.isArray(response.body.api_keys)).toBe(true);
      expect(response.body.api_keys).toContainEqual(
        expect.objectContaining({
          key: `${apiKey}-new`,
          name: 'New Test Key',
          is_active: true,
        }),
      );
    });

    it('should fail to add duplicate API key', async () => {
      // First, onboard an API with an initial key
      await request(gatewayUrl)
        .post('/veil/api/onboard')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('X-API-Key', apiKey)
        .send({
          path: apiPath,
          upstream: 'http://localhost:8081',
          methods: ['GET'],
          api_keys: [{ key: apiKey, name: 'Test Key', is_active: true }],
        });

      // Try to add the same key again
      const response = await request(gatewayUrl)
        .post('/veil/api/keys')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('X-API-Key', apiKey)
        .send({
          path: apiPath,
          api_keys: [{ key: apiKey, name: 'Duplicate Key', is_active: true }],
        });

      console.log('Duplicate key response:', response.body);
      expect(response.status).toBe(409); // Conflict
      expect(response.body).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(response.body.message.toLowerCase()).toMatch(
        /exists|duplicate|already/i,
      );
    });
  });

  describe('API Access Validation', () => {
    let apiPath: string;
    let apiKey: string;

    beforeEach(async () => {
      apiPath = `/api/v1/test-${Date.now()}`;
      apiKey = `test-key-${Date.now()}`;

      // Onboard an API with required headers
      await request(gatewayUrl)
        .post('/veil/api/onboard')
        .send({
          path: `${apiPath}/*`,
          upstream: 'http://localhost:8081',
          required_subscription: 'premium',
          methods: ['GET'],
          required_headers: ['X-API-Key', 'X-Request-ID'],
          api_keys: [
            {
              key: apiKey,
              name: 'Test Key',
              is_active: true,
            },
          ],
        });

      // Wait for configuration to be applied
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should allow access with valid API key and headers', async () => {
      const response = await request(gatewayUrl)
        .get(`${apiPath}/test`)
        .set('X-Subscription-Key', apiKey)
        .set('X-API-Key', 'test-api-key')
        .set('X-Request-ID', 'test-request-id');

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(400);
    });

    it('should deny access with invalid API key', async () => {
      const response = await request(gatewayUrl)
        .get(`${apiPath}/test`)
        .set('X-Subscription-Key', 'invalid-key')
        .set('X-API-Key', 'test-api-key')
        .set('X-Request-ID', 'test-request-id');

      expect(response.status).toBe(401);
    });

    it('should deny access with missing required headers', async () => {
      const response = await request(gatewayUrl)
        .get(`${apiPath}/test`)
        .set('X-Subscription-Key', apiKey);

      expect(response.status).toBe(400);
    });
  });
});
