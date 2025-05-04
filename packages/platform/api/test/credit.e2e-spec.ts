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
          creditBalance: 0,
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

  describe('Credit Balance Management', () => {
    // Test 1: Add initial credits
    it('should add initial credits to user', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/${userId}/add`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 100,
          reason: 'Initial credit allocation',
          adjustedBy: 'system',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.balance).toBe(100);
      expect(res.body.status).toBe(CreditBalanceStatus.ACTIVE);
    });

    // Test 2: Get credit balance
    it('should retrieve credit balance', async () => {
      const res = await request(app.getHttpServer())
        .get(`/credits/${userId}`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('balance');
      expect(res.body.balance).toBe(100);
      expect(res.body).toHaveProperty('recentUsage');
      expect(Array.isArray(res.body.recentUsage)).toBe(true);
    });

    // Test 3: Check sufficient credits
    it('should check if user has sufficient credits', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/${userId}/check`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('hasSufficientCredits');
      expect(res.body.hasSufficientCredits).toBe(true);
    });

    // Test 4: Deduct credits
    it('should deduct credits for API usage', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/${userId}/deduct`)
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
    });

    // Test 5: Check insufficient credits
    it('should handle insufficient credits check', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/${userId}/check`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 1000,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('hasSufficientCredits');
      expect(res.body.hasSufficientCredits).toBe(false);
    });

    // Test 6: Try to deduct too many credits
    it('should handle insufficient credits deduction', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/${userId}/deduct`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 1000,
          type: CreditUsageType.API_CALL,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Insufficient credits');
    });

    // Test 7: Add more credits
    it('should add more credits to existing balance', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/${userId}/add`)
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

    // Test 8: Invalid credit amount
    it('should handle invalid credit amounts', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/${userId}/add`)
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

    // Test 9: Missing required fields
    it('should handle missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/${userId}/add`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          amount: 50,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    // Test 10: Feature usage deduction
    it('should deduct credits for feature usage', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/${userId}/deduct`)
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
});
