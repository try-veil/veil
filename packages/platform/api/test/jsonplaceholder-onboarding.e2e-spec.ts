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
  let testUser: any;
  let testProject: any;
  let providerJwtToken: string;
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

    providerJwtToken = configService.get<string>('E2E_PROVIDER_JWT_TOKEN');
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

      // Create test tenant using the API endpoint
      const tenantDomain = `test-${timestamp}.example.com`;
      const tenantName = `Test Tenant ${timestamp}`;
      const createTenantResponse = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${providerJwtToken}`)
        .send({
          name: tenantName,
          domain: tenantDomain,
        });

      if (createTenantResponse.status !== 201) {
        console.error(
          'Failed to create tenant via API:',
          createTenantResponse.body,
        );
        throw new Error('Tenant creation failed in test setup');
      }

      // Create test provider user
      // We need the provider user ID for ProjectAcl later
      const providerUsername = `provider_${username}`;
      const provider = await prisma.user.create({
        data: {
          id: uuidv4(),
          fusionAuthId: uuidv4(),
          name: 'Test Provider',
          username: providerUsername,
          email: `${providerUsername}@example.com`,
          slugifiedName: providerUsername,
          type: 'USER',
        },
      });
      providerId = provider.id; // Assign providerId here

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

      // Create test project using the API endpoint
      const createProjectResponse = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${providerJwtToken}`)
        .send({
          name: `test_project_${timestamp}`,
          // Add other required fields if necessary, based on Project DTO
        });

      if (createProjectResponse.status !== 201) {
        console.error(
          'Failed to create project via API:',
          createProjectResponse.body,
        );
        throw new Error('Project creation failed in test setup');
      }
      testProject = createProjectResponse.body; // Store the response body

      // Link project to provider through ProjectAcl
      await prisma.projectAcl.create({
        data: {
          userId: providerId,
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

      // Finally delete tenants - this should still work with the name prefix
      await prisma.tenant.deleteMany({
        where: { name: { startsWith: 'Test Tenant' } },
      });
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  }

  describe('JSONPlaceholder API Tests', () => {
    const baseApiPath = '/api/v1/jsonplaceholder';
    let getUserApiId: string;

    it('should onboard GET /posts endpoint', async () => {
      const apiId = uuidv4();
      const response = await request(app.getHttpServer())
        .put('/onboard')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${providerJwtToken}`)
        .send({
          api_id: apiId,
          project_id: testProject.id,
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

      // Verify the link was created automatically
      const projectLink = await prisma.projectAllowedAPI.findFirst({
        where: {
          projectId: testProject.id,
          apiId: getUserApiId,
        },
      });
      expect(projectLink).toBeDefined();
      expect(projectLink.status).toBe('ACTIVE');

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
    //       path: `/${apiId}${baseApiPath}/posts`,
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

    //   // Link the API to the project via ProjectAllowedAPI
    //   await prisma.projectAllowedAPI.create({
    //     data: {
    //       projectId: testProject.id,
    //       apiId: postApiId,
    //       apiVersionId: 'v1',
    //       status: 'ACTIVE',
    //       api: {}, // Empty JSON object as placeholder
    //     },
    //   });

    //   // Test the API call
    //   const apiCallResponse = await request('http://localhost:2021')
    //     .post(`/${apiId}${baseApiPath}/posts`)
    //     .set('Authorization', consumerApiKey)
    //     .set('X-Subscription-Key', consumerApiKey)
    //     .send({
    //       title: 'Test Post',
    //       body: 'This is a test post',
    //       userId: 1,
    //     });

    //   expect(apiCallResponse.status).toBe(201);
    //   expect(apiCallResponse.body.title).toBe('Test Post');
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
    //       path: `/${apiId}${baseApiPath}/posts/:id`,
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

    //   // Link the API to the project via ProjectAllowedAPI
    //   await prisma.projectAllowedAPI.create({
    //     data: {
    //       projectId: testProject.id,
    //       apiId: updateUserApiId,
    //       apiVersionId: 'v1',
    //       status: 'ACTIVE',
    //       api: {}, // Empty JSON object as placeholder
    //     },
    //   });

    //   // Test the API call
    //   const apiCallResponse = await request('http://localhost:2021')
    //     .put(`/${apiId}${baseApiPath}/posts/1`)
    //     .set('Authorization', consumerApiKey)
    //     .set('X-Subscription-Key', consumerApiKey)
    //     .send({
    //       title: 'Updated Test Post',
    //       body: 'This is an updated test post',
    //       userId: 1,
    //     });

    //   expect(apiCallResponse.status).toBe(200);
    //   expect(apiCallResponse.body.title).toBe('Updated Test Post');
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
    //       path: `/${apiId}${baseApiPath}/posts/:id`,
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

    //   // Link the API to the project via ProjectAllowedAPI
    //   await prisma.projectAllowedAPI.create({
    //     data: {
    //       projectId: testProject.id,
    //       apiId: deleteUserApiId,
    //       apiVersionId: 'v1',
    //       status: 'ACTIVE',
    //       api: {}, // Empty JSON object as placeholder
    //     },
    //   });

    //   // Test the API call
    //   const apiCallResponse = await request('http://localhost:2021')
    //     .delete(`/${apiId}${baseApiPath}/posts/1`)
    //     .set('Authorization', consumerApiKey)
    //     .set('X-Subscription-Key', consumerApiKey);

    //   expect(apiCallResponse.status).toBe(200);
    // });

    // describe('Consumer API Tests', () => {
    //   it('should verify all APIs are linked to the project', async () => {
    //     const projectWithApis = await prisma.project.findUnique({
    //       where: { id: testProject.id },
    //       include: { projectAllowedAPIs: true },
    //     });

    //     expect(projectWithApis).toBeDefined();
    //     expect(projectWithApis?.projectAllowedAPIs.length).toBe(4); // One for each API endpoint
    //   });

    //   it('should verify all test resources were created properly', async () => {
    //     // Verify tenant was created
    //     // expect(testTenant).toBeDefined();
    //     // expect(testTenant.id).toBeTruthy();

    //     // Verify project access control
    //     // expect(testProjectAcl).toBeDefined();
    //     // expect(testProjectAcl.projectId).toBe(testProject.id);
    //     // expect(testProjectAcl.userId).toBe(testUser.id);

    //     // Verify gateway URL is set
    //     // expect(gatewayUrl).toBeTruthy();

    //     // Verify JWT tokens exist
    //     // expect(consumerJwtToken).toBeTruthy();

    //     // Verify provider ID was set
    //     // expect(providerId).toBeTruthy();
    //   });
    // });
  });
});
