import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/services/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { GatewayService } from '../src/services/onboarding/gateway.service';
import { OnboardingModule } from '../src/services/onboarding/onboarding.module';

describe('JSONPlaceholder API Onboarding Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let configService: ConfigService;
  let gatewayService: GatewayService;
  let testTenant: any;
  let testUser: any;
  let testProject: any;
  let testProjectAcl: any;
  let gatewayUrl: string;
  let providerJwtToken: string;
  let consumerJwtToken: string;
  let consumerApiKey: string;
  let providerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, OnboardingModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    gatewayService = moduleFixture.get<GatewayService>(GatewayService);
    await app.init();

    gatewayUrl =
      configService.get<string>('DEFAULT_GATEWAY_URL') ||
      'http://localhost:2020';
    providerJwtToken = configService.get<string>('E2E_PROVIDER_JWT_TOKEN');
    consumerJwtToken = configService.get<string>('E2E_CONSUMER_JWT_TOKEN');
    consumerApiKey = uuidv4(); // Generate a unique API key for the consumer

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
    await app.close();
  });

  async function setupTestData() {
    const timestamp = Date.now();
    const username = `testuser_${timestamp}_${uuidv4()}`;

    try {
      // Clean up any existing test data first
      await cleanupTestData();

      // Create test tenant with unique domain
      testTenant = await prisma.tenant.create({
        data: {
          id: uuidv4(),
          name: `Test Tenant ${timestamp}`,
          domain: `test-${timestamp}.example.com`,
          slugifiedKey: `test-${timestamp}`,
        },
      });

      // Create test provider user
      const provider = await prisma.user.create({
        data: {
          id: uuidv4(),
          fusionAuthId: uuidv4(),
          name: 'Test Provider',
          username: `provider_${username}`,
          email: `provider_${username}@example.com`,
          slugifiedName: `provider_${username}`,
          type: 'USER',
        },
      });
      providerId = provider.id;

      // Create test consumer user
      testUser = await prisma.user.create({
        data: {
          id: uuidv4(),
          fusionAuthId: uuidv4(),
          name: 'Test User',
          username,
          email: `${username}@example.com`,
          slugifiedName: username,
          type: 'USER',
        },
      });

      // Create test project
      testProject = await prisma.project.create({
        data: {
          name: `test_project_${timestamp}`,
        },
      });

      // Link project to tenant through ProjectAcl
      testProjectAcl = await prisma.projectAcl.create({
        data: {
          userId: testUser.id,
          projectId: testProject.id,
        },
      });
    } catch (error) {
      console.error('Error setting up test data:', error);
      throw error;
    }
  }

  async function cleanupTestData() {
    try {
      // Delete API-related data first
      await prisma.projectAllowedAPI.deleteMany({
        where: { project: { name: { startsWith: 'test_project_' } } },
      });
      await prisma.projectAcl.deleteMany({
        where: { project: { name: { startsWith: 'test_project_' } } },
      });
      await prisma.project.deleteMany({
        where: { name: { startsWith: 'test_project_' } },
      });

      // Delete user-related data in correct order
      await prisma.walletTransaction.deleteMany({
        where: {
          wallet: { customer: { username: { startsWith: 'testuser_' } } },
        },
      });
      await prisma.wallet.deleteMany({
        where: { customer: { username: { startsWith: 'testuser_' } } },
      });

      // Delete metadata attributes first
      await prisma.metadataAttribute.deleteMany({
        where: { user: { username: { startsWith: 'testuser_' } } },
      });

      // Delete user attribute
      await prisma.userAttribute.deleteMany({
        where: { user: { username: { startsWith: 'testuser_' } } },
      });

      // Now safe to delete users
      await prisma.user.deleteMany({
        where: { username: { startsWith: 'testuser_' } },
      });

      // Finally delete tenants
      await prisma.tenant.deleteMany({
        where: { name: { startsWith: 'Test Tenant' } },
      });
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  }

  describe('JSONPlaceholder API Tests', () => {
    const baseApiPath = '/api/v1/jsonplaceholder';
    let postApiId: string;
    let getUserApiId: string;
    let updateUserApiId: string;
    let deleteUserApiId: string;

    it('should onboard GET /posts endpoint', async () => {
      const apiId = uuidv4();
      const response = await request(app.getHttpServer())
        .put('/onboard')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${providerJwtToken}`)
        .send({
          api_id: apiId,
          name: 'Get Posts',
          path: `/${apiId}${baseApiPath}/posts`,
          target_url: 'https://jsonplaceholder.typicode.com/posts',
          method: 'GET',
          version: 'v1',
          description: 'Get all posts from JSONPlaceholder',
          documentation_url: 'https://jsonplaceholder.typicode.com/guide/',
          required_headers: [
            {
              name: 'Authorization',
              value: '',
              is_variable: true,
            },
            {
              name: 'X-Subscription-Key',
              value: '',
              is_variable: true,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.api_id).toBeDefined();
      getUserApiId = response.body.api_id;

      // Register API key for the consumer
      await gatewayService.registerApiKey(
        consumerApiKey,
        testUser.id,
        getUserApiId,
      );

      const apiCallResponse = await request('http://localhost:2021')
        .get(`/${apiId}${baseApiPath}/posts`)
        .set('Authorization', consumerApiKey)
        .set('X-Subscription-Key', consumerApiKey);

      console.log({ apiCallResponse: JSON.stringify(apiCallResponse.body) });

      expect(apiCallResponse.status).toBe(200);
      expect(Array.isArray(apiCallResponse.body)).toBe(true);
      expect(apiCallResponse.body.length).toBeGreaterThan(0);
    });

    // it('should onboard POST /posts endpoint', async () => {
    //   const apiId = uuidv4();
    //   const response = await request(app.getHttpServer())
    //     .put('/onboard')
    //     .set('Content-Type', 'application/json')
    //     .set('Authorization', `Bearer ${providerJwtToken}`)
    //     .send({
    //       api_id: apiId,
    //       name: 'Create Post',
    //       path: `${baseApiPath}/posts`,
    //       target_url: 'https://jsonplaceholder.typicode.com/posts',
    //       method: 'POST',
    //       version: 'v1',
    //       description: 'Create a new post on JSONPlaceholder',
    //       documentation_url: 'https://jsonplaceholder.typicode.com/guide/',
    //       required_headers: [
    //         {
    //           name: 'Authorization',
    //           value: '',
    //           is_variable: true,
    //         },
    //         {
    //           name: 'X-Subscription-Key',
    //           value: '',
    //           is_variable: true,
    //         },
    //       ],
    //     });

    //   expect(response.status).toBe(201);
    //   expect(response.body.api_id).toBeDefined();
    //   postApiId = response.body.api_id;

    //   // Register API key for the consumer
    //   await gatewayService.registerApiKey(
    //     consumerApiKey,
    //     testUser.id,
    //     postApiId,
    //   );
    // });

    // it('should onboard PUT /posts/:id endpoint', async () => {
    //   const apiId = uuidv4();
    //   const response = await request(app.getHttpServer())
    //     .put('/onboard')
    //     .set('Content-Type', 'application/json')
    //     .set('Authorization', `Bearer ${providerJwtToken}`)
    //     .send({
    //       api_id: apiId,
    //       name: 'Update Post',
    //       path: `${baseApiPath}/posts/:id`,
    //       target_url: 'https://jsonplaceholder.typicode.com/posts/:id',
    //       method: 'PUT',
    //       version: 'v1',
    //       description: 'Update an existing post on JSONPlaceholder',
    //       documentation_url: 'https://jsonplaceholder.typicode.com/guide/',
    //       required_headers: [
    //         {
    //           name: 'Authorization',
    //           value: '',
    //           is_variable: true,
    //         },
    //         {
    //           name: 'X-Subscription-Key',
    //           value: '',
    //           is_variable: true,
    //         },
    //       ],
    //     });

    //   expect(response.status).toBe(201);
    //   expect(response.body.api_id).toBeDefined();
    //   updateUserApiId = response.body.api_id;

    //   // Register API key for the consumer
    //   await gatewayService.registerApiKey(
    //     consumerApiKey,
    //     testUser.id,
    //     updateUserApiId,
    //   );
    // });

    // it('should onboard DELETE /posts/:id endpoint', async () => {
    //   const apiId = uuidv4();
    //   const response = await request(app.getHttpServer())
    //     .put('/onboard')
    //     .set('Content-Type', 'application/json')
    //     .set('Authorization', `Bearer ${providerJwtToken}`)
    //     .send({
    //       api_id: apiId,
    //       name: 'Delete Post',
    //       path: `${baseApiPath}/posts/:id`,
    //       target_url: 'https://jsonplaceholder.typicode.com/posts/:id',
    //       method: 'DELETE',
    //       version: 'v1',
    //       description: 'Delete a post from JSONPlaceholder',
    //       documentation_url: 'https://jsonplaceholder.typicode.com/guide/',
    //       required_headers: [
    //         {
    //           name: 'Authorization',
    //           value: '',
    //           is_variable: true,
    //         },
    //         {
    //           name: 'X-Subscription-Key',
    //           value: '',
    //           is_variable: true,
    //         },
    //       ],
    //     });

    //   expect(response.status).toBe(201);
    //   expect(response.body.api_id).toBeDefined();
    //   deleteUserApiId = response.body.api_id;

    //   // Register API key for the consumer
    //   await gatewayService.registerApiKey(
    //     consumerApiKey,
    //     testUser.id,
    //     deleteUserApiId,
    //   );
    // });

    // describe('Consumer API Tests', () => {
    //   it('should successfully GET posts through the gateway', async () => {
    //     const response = await request(gatewayUrl)
    //       .get(`${baseApiPath}/posts`)
    //       .set('Authorization', `Bearer ${consumerJwtToken}`)
    //       .set('X-Subscription-Key', consumerApiKey);

    //     expect(response.status).toBe(200);
    //     expect(Array.isArray(response.body)).toBe(true);
    //   });

    //   it('should successfully POST a new post through the gateway', async () => {
    //     const response = await request(gatewayUrl)
    //       .post(`${baseApiPath}/posts`)
    //       .set('Authorization', `Bearer ${consumerJwtToken}`)
    //       .set('X-Subscription-Key', consumerApiKey)
    //       .send({
    //         title: 'Test Post',
    //         body: 'This is a test post',
    //         userId: 1,
    //       });

    //     expect(response.status).toBe(201);
    //     expect(response.body.title).toBe('Test Post');
    //   });

    //   it('should successfully PUT an existing post through the gateway', async () => {
    //     const response = await request(gatewayUrl)
    //       .put(`${baseApiPath}/posts/1`)
    //       .set('Authorization', `Bearer ${consumerJwtToken}`)
    //       .set('X-Subscription-Key', consumerApiKey)
    //       .send({
    //         title: 'Updated Test Post',
    //         body: 'This is an updated test post',
    //         userId: 1,
    //       });

    //     expect(response.status).toBe(200);
    //     expect(response.body.title).toBe('Updated Test Post');
    //   });

    //   it('should successfully DELETE a post through the gateway', async () => {
    //     const response = await request(gatewayUrl)
    //       .delete(`${baseApiPath}/posts/1`)
    //       .set('Authorization', `Bearer ${consumerJwtToken}`)
    //       .set('X-Subscription-Key', consumerApiKey);

    //     expect(response.status).toBe(200);
    //   });
    // });
  });
});
