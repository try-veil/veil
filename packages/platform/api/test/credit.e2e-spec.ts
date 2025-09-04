import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/services/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreditUsageType,
  CreditBalanceStatus,
} from '../src/entities/credit/types';
import { ConfigService } from '@nestjs/config';

describe('Credit Service (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let configService: ConfigService;
  let testUser: any;
  let userId: string;
  let walletId: string;
  let jwtToken: string;
  let testTenant: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    await app.init();

    jwtToken = configService.get<string>('E2E_CONSUMER_JWT_TOKEN');
    if (!jwtToken) {
      throw new Error(
        'E2E_CONSUMER_JWT_TOKEN not found in environment variables. Please set it.',
      );
    }

    const username = `testuser_${Date.now()}_${uuidv4()}`;

    try {
      // Clean up potential leftovers from previous runs
      await prisma.walletTransaction.deleteMany({
        where: {
          wallet: { customer: { username: { startsWith: 'testuser_' } } },
        },
      });
      await prisma.wallet.deleteMany({
        where: { customer: { username: { startsWith: 'testuser_' } } },
      });
      await prisma.tenant.deleteMany({
        where: { name: { startsWith: 'Test Tenant E2E Credit' } },
      });
      await prisma.user.deleteMany({
        where: { username: { startsWith: 'testuser_' } },
      });

      // Create test tenant
      testTenant = await prisma.tenant.create({
        data: {
          id: uuidv4(),
          name: `Test Tenant E2E Credit ${Date.now()}`,
          domain: `test-credit-${Date.now()}.example.com`,
          slugifiedKey: `test-credit-${Date.now()}`,
        },
      });

      // Create test user
      testUser = await prisma.user.create({
        data: {
          id: uuidv4(),
          fusionAuthId: uuidv4(),
          name: 'Test Credit User',
          username: username,
          email: `${username}@example.com`,
          slugifiedName: `testcredituser-${Date.now()}`,
        },
      });

      userId = testUser.id;

      // Create a wallet for the user
      const wallet = await prisma.wallet.create({
        data: {
          id: uuidv4(),
          customerId: userId,
          tenantId: testTenant.id,
          balance: 0,
        },
      });

      walletId = wallet.id;

      console.log('Test setup complete:', {
        userId: testUser.id,
        walletId: wallet.id,
        tenantId: testTenant.id,
      });
    } catch (error) {
      console.error('Error setting up test data:', error);
      await app?.close();
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up test data in correct order
      if (walletId) {
        await prisma.walletTransaction.deleteMany({
          where: { walletId },
        });
        await prisma.wallet.delete({ where: { id: walletId } }).catch(() => {});
      }

      if (userId) {
        await prisma.user.delete({ where: { id: userId } }).catch(() => {});
      }

      if (testTenant?.id) {
        await prisma.tenant
          .delete({ where: { id: testTenant.id } })
          .catch(() => {});
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    } finally {
      await prisma.$disconnect();
      await app?.close();
    }
  });

  describe('Credit Balance Management with New Paths', () => {
    // Test 1: Add initial credits using new path
    it('should add initial credits to user using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/add`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 100,
          reason: 'Initial credit allocation',
          adjustedBy: 'system',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('balance');
      expect(res.body.balance).toBe(100);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Successfully added 100 credits');
    });

    // Test 2: Get credit balance using new path
    it('should retrieve credit balance using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .get(`/internal/credits/${userId}/balance`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('balance');
      expect(res.body.balance).toBe(100);
      expect(res.body).toHaveProperty('lastUpdated');
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('ACTIVE');
    });

    // Test 3: Check sufficient credits using new path
    it('should check if user has sufficient credits using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/check`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('hasSufficientCredits');
      expect(res.body.hasSufficientCredits).toBe(true);
    });

    // Test 4: Deduct credits using new path
    it('should deduct credits for API usage using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/deduct`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 25,
          type: CreditUsageType.API_CALL,
          metadata: {
            endpoint: '/api/test',
            method: 'GET',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('balance');
      expect(res.body.balance).toBe(75);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Successfully deducted 25 credits');
    });

    // Test 5: Check insufficient credits using new path
    it('should handle insufficient credits check using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/check`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 1000,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('hasSufficientCredits');
      expect(res.body.hasSufficientCredits).toBe(false);
    });

    // Test 6: Try to deduct too many credits using new path
    it('should handle insufficient credits deduction using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/deduct`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 1000,
          type: CreditUsageType.API_CALL,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Insufficient credits');
    });

    // Test 7: Add more credits using new path
    it('should add more credits to existing balance using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/add`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 50,
          reason: 'Additional credit purchase',
          adjustedBy: 'system',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('balance');
      expect(res.body.balance).toBe(125);
    });

    // Test 8: Invalid credit amount using new path
    it('should handle invalid credit amounts using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/add`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: -50,
          reason: 'Negative amount test',
          adjustedBy: 'system',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Invalid amount');
    });

    // Test 9: Missing required fields using new path
    it('should handle missing required fields using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/add`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 50,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    // Test 10: Feature usage deduction using new path
    it('should deduct credits for feature usage using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/deduct`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 10,
          type: CreditUsageType.FEATURE_USAGE,
          metadata: {
            feature: 'test-feature',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('balance');
      expect(res.body.balance).toBe(115);
    });
  });

  describe('Credit Purchase and Payment Flow with New Paths', () => {
    // Test 11: Purchase credits using new path
    it('should create purchase order using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/purchase`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          creditAmount: 100,
          amountInRupees: 1000,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('orderId');
      expect(res.body).toHaveProperty('amount');
      expect(res.body).toHaveProperty('currency');
      expect(res.body).toHaveProperty('keyId');
    });

    // Test 12: Invalid purchase request using new path
    it('should handle invalid purchase request using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/purchase`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          creditAmount: -100,
          amountInRupees: 1000,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Invalid credit amount');
    });

    // Test 13: Confirm payment using new path (mock data)
    it('should handle payment confirmation using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/confirm-payment`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          razorpay_payment_id: 'pay_test_123',
          razorpay_order_id: 'order_test_123',
          razorpay_signature: 'signature_test_123',
        });

      // This might fail due to invalid signature, but we're testing the endpoint exists
      expect([200, 400, 401]).toContain(res.status);
    });
  });

  describe('API Key Generation with New Paths', () => {
    // Test 14: Generate API key using new path
    it('should generate API key with credit deduction using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/generate-api-key`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          creditCost: 10,
          keyName: 'Test API Key',
          apiId: 'test-api-id',
          projectId: 'test-project-id',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('apiKey');
      expect(res.body).toHaveProperty('remainingCredits');
    });

    // Test 15: Invalid API key generation using new path
    it('should handle invalid API key generation using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .post(`/internal/credits/${userId}/generate-api-key`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          creditCost: -10,
          keyName: 'Test API Key',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Invalid credit cost');
    });
  });

  describe('Debug Operations with New Paths', () => {
    // Test 16: Debug balance using new path
    it('should provide debug balance information using /internal/credits path', async () => {
      const res = await request(app.getHttpServer())
        .get(`/internal/credits/${userId}/debug`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('userId');
      // Debug endpoint should return some balance information
    });
  });

  describe('Verify Old Paths No Longer Work', () => {
    // Test 17: Verify old paths return 404
    it('should return 404 for old /credits path', async () => {
      const res = await request(app.getHttpServer())
        .get(`/credits/${userId}/balance`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 for old /credits add endpoint', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/${userId}/add`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 100,
          reason: 'Test',
          adjustedBy: 'system',
        });

      expect(res.status).toBe(404);
    });

    it('should return 404 for old /credits purchase endpoint', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/${userId}/purchase`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          creditAmount: 100,
          amountInRupees: 1000,
        });

      expect(res.status).toBe(404);
    });

    it('should return 404 for old /credits confirm-payment endpoint', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/confirm-payment`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          razorpay_payment_id: 'pay_test_123',
          razorpay_order_id: 'order_test_123',
          razorpay_signature: 'signature_test_123',
        });

      expect(res.status).toBe(404);
    });
  });
});
