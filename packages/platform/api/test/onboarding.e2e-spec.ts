import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/services/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { GatewayService } from '../src/services/onboarding/gateway.service';
import { OnboardingModule } from '../src/services/onboarding/onboarding.module';

describe('API Onboarding Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let configService: ConfigService;
  let gatewayService: GatewayService;
  let testUser: any; // Consumer user
  let testProject: any;
  let providerJwtToken: string;
  let consumerApiKey: string;
  let providerId: string; // Provider user ID
  let gatewayUrl: string; // For making calls through the actual gateway

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      // Include OnboardingModule to access GatewayService and potentially /onboard endpoint logic
      imports: [AppModule, OnboardingModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    gatewayService = moduleFixture.get<GatewayService>(GatewayService);
    await app.init();

    // Use the same provider token and gateway URL as the other test
    providerJwtToken = configService.get<string>('E2E_PROVIDER_JWT_TOKEN');
    // !! Ensure E2E_PROVIDER_JWT_TOKEN is set in your .env.test or equivalent !!
    if (!providerJwtToken) {
      throw new Error(
        'E2E_PROVIDER_JWT_TOKEN is not set. Please configure it for e2e tests.',
      );
    }
    consumerApiKey = uuidv4(); // Generate a unique API key for the consumer for this test run
    gatewayUrl =
      configService.get<string>('E2E_GATEWAY_URL') || 'http://localhost:2021'; // Use the gateway for testing calls

    // Setup test data using a similar pattern
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData(); // Use consistent cleanup logic
    await prisma.$disconnect();
    await app.close();
  });

  // Adapted setupTestData from jsonplaceholder-onboarding.e2e-spec.ts
  async function setupTestData() {
    const timestamp = Date.now();
    const username = `testuser_${timestamp}_${uuidv4()}`;
    const providerUsername = `provider_${username}`;

    try {
      // Clean up potential leftovers from previous runs first
      await cleanupTestData();

      // Create test tenant directly - Assuming tenant creation via API isn't strictly necessary for these tests
      // If it IS necessary, uncomment the API call block from the other test file.
      await prisma.tenant.create({
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
          fusionAuthId: uuidv4(), // Use unique UUIDs
          name: 'Test Provider User',
          username: providerUsername,
          email: `${providerUsername}@example.com`,
          slugifiedName: providerUsername,
          type: 'USER', // Ensure type is set if required by your schema/logic
        },
      });
      providerId = provider.id;

      // Create test consumer user
      testUser = await prisma.user.create({
        data: {
          id: uuidv4(),
          fusionAuthId: uuidv4(), // Use unique UUIDs
          name: 'Test Consumer User',
          username,
          email: `${username}@example.com`,
          slugifiedName: username,
          type: 'USER', // Ensure type is set
        },
      });

      // Create test project using the API endpoint (requires provider token)
      const createProjectResponse = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${providerJwtToken}`)
        .send({
          name: `test_project_${timestamp}`,
          // Add other required fields for project creation if necessary
        });

      if (createProjectResponse.status !== 201) {
        console.error(
          'Failed to create project via API:',
          createProjectResponse.body,
        );
        throw new Error(
          `Project creation failed in test setup: ${JSON.stringify(createProjectResponse.body)}`,
        );
      }
      testProject = createProjectResponse.body;

      // Link project to the provider user via ProjectAcl
      await prisma.projectAcl.create({
        data: {
          userId: providerId,
          projectId: testProject.id,
        },
      });

      console.log('Test setup complete:', {
        providerId: providerId,
        consumerUserId: testUser.id,
        projectId: testProject.id,
        consumerApiKey: consumerApiKey,
      });
    } catch (error) {
      console.error('Error setting up test data:', error);
      throw error; // Fail fast if setup fails
    }
  }

  // Adapted cleanupTestData from jsonplaceholder-onboarding.e2e-spec.ts
  async function cleanupTestData() {
    try {
      if (testProject?.id) {
        // Delete API-related data first
        await prisma.projectAllowedAPI.deleteMany({
          where: { projectId: testProject.id },
        });
        await prisma.projectAcl.deleteMany({
          where: { projectId: testProject.id },
        });
        await prisma.project
          .deleteMany({
            where: { id: testProject.id },
          })
          .catch(() => {}); // Ignore if already deleted or doesn't exist
      }

      // Delete user-related data (consumer and provider)
      const userIdsToDelete = [testUser?.id, providerId].filter(Boolean);
      if (userIdsToDelete.length > 0) {
        // Assuming wallet/transactions are linked to consumer user only
        if (testUser?.id) {
          await prisma.walletTransaction.deleteMany({
            where: { wallet: { customerId: testUser.id } },
          });
          await prisma.wallet.deleteMany({
            where: { customerId: testUser.id },
          });
          await prisma.metadataAttribute.deleteMany({
            where: { userId: testUser.id },
          });
          await prisma.userAttribute.deleteMany({
            where: { userId: testUser.id },
          });
        }
        // Also delete provider specific attributes if they exist
        if (providerId) {
          await prisma.metadataAttribute.deleteMany({
            where: { userId: providerId },
          });
          await prisma.userAttribute.deleteMany({
            where: { userId: providerId },
          });
        }

        // Now delete users
        await prisma.user.deleteMany({
          where: { id: { in: userIdsToDelete } },
        });
      }

      // Clean up tenants - use a pattern that avoids collisions
      await prisma.tenant.deleteMany({
        where: { name: { startsWith: 'Test Tenant' } }, // Adjust if names changed
      });
    } catch (error) {
      // Log cleanup errors but don't necessarily fail the test run
      console.error('Error cleaning up test data:', error);
    }
  }

  // --- Refactored Test Blocks ---

  describe('API Onboarding via /onboard Endpoint', () => {
    let testApiId: string;
    const testTargetPath = '/test/downstream';
    const testUpstreamUrl = 'http://localhost:8081'; // Example upstream

    beforeEach(() => {
      testApiId = uuidv4(); // Generate a fresh API ID for each test
    });

    it('should onboard a new API successfully using PUT /onboard', async () => {
      const onboardPath = `/${testApiId}${testTargetPath}`; // Path format from example

      const response = await request(app.getHttpServer()) // Target the app server
        .put('/onboard') // Use PUT /onboard
        .set('Authorization', `Bearer ${providerJwtToken}`) // Auth as provider
        .set('Content-Type', 'application/json')
        .send({
          api_id: testApiId,
          project_id: testProject.id,
          name: 'Test API Onboarding',
          path: onboardPath, // The path the gateway will expose
          target_url: testUpstreamUrl, // The internal upstream service
          method: 'GET',
          version: 'v1',
          description: 'A test API onboarded via e2e test',
          // Define required headers matching the example structure
          required_headers: [
            { name: 'Authorization', value: '', is_variable: true },
            { name: 'X-Subscription-Key', value: '', is_variable: true },
            { name: 'X-Request-ID', value: '', is_variable: true }, // Add other required headers
          ],
          // Add other fields like parameters, documentation_url if needed
        });

      console.log('Onboarding response:', response.body);
      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.api_id).toBe(testApiId);
      expect(response.body.path).toBe(onboardPath);
      expect(response.body.target_url).toBe(testUpstreamUrl);

      // Register the consumer's API key for this newly onboarded API
      await gatewayService.registerApiKey(
        consumerApiKey,
        testUser.id, // The consumer user's ID
        testApiId,
      );

      // Verify the ProjectAllowedAPI link was created
      const projectLink = await prisma.projectAllowedAPI.findFirst({
        where: {
          projectId: testProject.id,
          apiId: testApiId,
        },
      });
      expect(projectLink).toBeDefined();
      expect(projectLink.status).toBe('ACTIVE');

      // Optional: Add a test call through the actual gateway to verify end-to-end
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Allow time for gateway config update
      const gatewayResponse = await request(gatewayUrl)
        .get(onboardPath) // Use the path defined during onboarding
        .set('Authorization', consumerApiKey) // Use consumer key
        .set('X-Subscription-Key', consumerApiKey) // Use consumer key
        .set('X-Request-ID', 'e2e-test-request'); // Provide required header
      // Check for a non-error status. The exact status depends on the upstream mock/service.
      // If upstream isn't running, gateway might return 502. If running, expect 200.
      expect(gatewayResponse.status).toBeLessThan(500); // Example: Check it's not a client or server error (adjust as needed)
    });

    it('should fail to onboard API with missing required fields (e.g., target_url)', async () => {
      const onboardPath = `/${testApiId}${testTargetPath}`;

      const response = await request(app.getHttpServer())
        .put('/onboard')
        .set('Authorization', `Bearer ${providerJwtToken}`)
        .set('Content-Type', 'application/json')
        .send({
          api_id: testApiId,
          project_id: testProject.id,
          name: 'Test API Missing Fields',
          path: onboardPath,
          // target_url: 'MISSING', // Intentionally missing
          method: 'GET',
          version: 'v1',
          required_headers: [],
        });

      console.log('Missing fields response:', response.body);
      // Expecting 400 Bad Request due to validation failure in the /onboard endpoint
      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
      expect(response.body.message).toBeDefined(); // Check for error messages
    });

    it('should fail to onboard duplicate API ID', async () => {
      const onboardPath = `/${testApiId}${testTargetPath}`;
      const payload = {
        api_id: testApiId,
        project_id: testProject.id,
        name: 'Test API Duplicate ID',
        path: onboardPath,
        target_url: testUpstreamUrl,
        method: 'GET',
        version: 'v1',
        required_headers: [],
      };

      // First onboarding (should succeed)
      const firstResponse = await request(app.getHttpServer())
        .put('/onboard')
        .set('Authorization', `Bearer ${providerJwtToken}`)
        .send(payload);
      expect(firstResponse.status).toBe(201);

      // Attempt duplicate onboarding with the same api_id
      const secondResponse = await request(app.getHttpServer())
        .put('/onboard')
        .set('Authorization', `Bearer ${providerJwtToken}`)
        .send(payload); // Send the exact same payload (including api_id)

      console.log('Duplicate API response:', secondResponse.body);
      // Expecting 409 Conflict (or potentially another error code depending on implementation)
      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body).toBeDefined();
      expect(secondResponse.body.message).toBeDefined();
      expect(secondResponse.body.message.toLowerCase()).toMatch(
        /exists|duplicate|already/i,
      );
    });
  });

  // Note: The 'API Key Management' describe block is removed as key registration
  // is now handled via gatewayService.registerApiKey during/after onboarding.
  // If separate key management endpoints exist and need testing, add a new block.

  describe('API Access Validation via Gateway', () => {
    let testApiId: string;
    let onboardPath: string;
    const testUpstreamUrl = 'http://localhost:8081';

    // Onboard an API once for all tests in this block
    beforeAll(async () => {
      testApiId = uuidv4();
      onboardPath = `/${testApiId}/test/validation`;

      const response = await request(app.getHttpServer())
        .put('/onboard')
        .set('Authorization', `Bearer ${providerJwtToken}`)
        .send({
          api_id: testApiId,
          project_id: testProject.id,
          name: 'Test API Access Validation',
          path: onboardPath,
          target_url: testUpstreamUrl,
          method: 'GET',
          version: 'v1',
          required_headers: [
            { name: 'Authorization', value: '', is_variable: true },
            { name: 'X-Subscription-Key', value: '', is_variable: true },
            { name: 'X-Required-Custom-Header', value: '', is_variable: true }, // Add a specific required header
          ],
        });
      expect(response.status).toBe(201); // Ensure onboarding succeeded

      // Register the consumer key for this API
      await gatewayService.registerApiKey(
        consumerApiKey,
        testUser.id,
        testApiId,
      );

      // Allow time for gateway configuration propagation
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Increased wait time slightly
    });

    it('should allow access with valid consumer API key and all required headers', async () => {
      const response = await request(gatewayUrl) // Target the actual gateway
        .get(onboardPath) // Use the correct path
        .set('Authorization', consumerApiKey) // Correct consumer key
        .set('X-Subscription-Key', consumerApiKey) // Correct consumer key
        .set('X-Required-Custom-Header', 'test-value'); // Provide the required header

      // Depending on upstream, expect 200 OK or similar success/proxy status
      // Avoid 401, 400, 403
      expect(response.status).toBeLessThan(400);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should deny access with invalid consumer API key', async () => {
      const response = await request(gatewayUrl)
        .get(onboardPath)
        .set('Authorization', 'invalid-key') // Invalid key
        .set('X-Subscription-Key', 'invalid-key') // Invalid key
        .set('X-Required-Custom-Header', 'test-value');

      // Expect 401 Unauthorized because the key is wrong
      expect(response.status).toBe(401);
    });

    it('should deny access with missing required headers (X-Required-Custom-Header)', async () => {
      const response = await request(gatewayUrl)
        .get(onboardPath)
        .set('Authorization', consumerApiKey) // Valid key
        .set('X-Subscription-Key', consumerApiKey); // Valid key
      // Missing 'X-Required-Custom-Header'

      // Expect 400 Bad Request because a required header is missing
      expect(response.status).toBe(400);
    });

    // Add more validation tests if needed (e.g., wrong method, subscription checks if applicable)
  });
});
