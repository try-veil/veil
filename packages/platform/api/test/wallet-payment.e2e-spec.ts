import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/services/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { AuthGuard } from '../src/services/auth/auth.guard';

describe('Wallet and Payment Services (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: any;
  let fusionAuthId: string;
  let walletId: string;
  let internalUserId: string;
  let defaultTenant: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Create a test user with fusionAuthId for our tests
    fusionAuthId = uuidv4();
    internalUserId = uuidv4();
    const username = `testuser_${Date.now()}_${uuidv4()}`;

    try {
      // Clean up any existing test data first
      await prisma.projectAcl.deleteMany({
        where: {
          userId: {
            in: [internalUserId],
          },
        },
      });

      // Now clean up users
      const deleteResult = await prisma.user.deleteMany({
        where: {
          OR: [
            { username: { startsWith: 'testuser_' } },
            { id: internalUserId },
            { fusionAuthId: fusionAuthId },
          ],
        },
      });

      console.log('Cleaned up existing test users:', deleteResult);

      // First check if the tenant exists
      defaultTenant = await prisma.tenant.findFirst({
        where: { slugifiedKey: 'default' },
      });

      console.log(
        'Found existing tenant:',
        defaultTenant ? defaultTenant.id : 'none',
      );

      // Create tenant if it doesn't exist
      if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({
          data: {
            id: uuidv4(),
            name: 'Default Tenant',
            domain: 'default.example.com',
            slugifiedKey: 'default',
          },
        });
        console.log('Created new tenant:', defaultTenant.id);
      }

      // Create test user with our predefined IDs
      testUser = await prisma.user.create({
        data: {
          id: internalUserId,
          fusionAuthId,
          name: 'Test User',
          username,
          email: `${username}@example.com`,
          slugifiedName: username,
        },
      });

      console.log('Test setup complete:', {
        userId: testUser.id,
        fusionAuthId,
        tenantId: defaultTenant.id,
        username,
      });
    } catch (error) {
      console.error('Error setting up test data:', {
        error,
        username,
        internalUserId,
        fusionAuthId,
        tenantId: defaultTenant?.id,
      });
      throw error; // Re-throw to fail the test setup
    }
  });

  afterAll(async () => {
    try {
      // Clean up test data
      if (walletId) {
        await prisma.walletTransaction.deleteMany({
          where: { walletId },
        });

        await prisma.wallet.delete({
          where: { id: walletId },
        });
      }

      if (testUser) {
        await prisma.user.delete({
          where: { id: testUser.id },
        });
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }

    await prisma.$disconnect();
    await app.close();
  });

  // Basic health check test
  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .set('Authorization', 'Bearer test-token')
      .expect(200)
      .expect('Hello World!');
  });

  describe('Wallet Service with FusionAuth ID', () => {
    // Test 1: Create wallet using FusionAuth ID
    it('should create a wallet using fusionAuthId', async () => {
      const res = await request(app.getHttpServer())
        .post('/internal/wallet')
        .set('Authorization', 'Bearer test-token')
        .send({
          userId: fusionAuthId,
          tenantId: defaultTenant.id,
          initialCredits: 100,
        });

      console.log('Create wallet response:', {
        status: res.status,
        body: res.body,
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('wallet_id');
      expect(res.body.credit_balance).toBe(100);
      expect(res.body.status).toBe('active');

      // Store the wallet ID for later tests
      walletId = res.body.wallet_id;
      console.log('Created wallet:', walletId);
    });

    // Test 2: Retrieve wallet by ID
    it('should retrieve wallet balance', async () => {
      if (!walletId) {
        console.log('Skipping test as wallet was not created');
        return;
      }

      const res = await request(app.getHttpServer())
        .get(`/internal/wallet/balance/${walletId}`)
        .set('Authorization', 'Bearer test-token');

      console.log('Get balance response:', {
        status: res.status,
        body: res.body,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('walletId');
      expect(res.body).toHaveProperty('creditBalance');
      expect(res.body.creditBalance).toBe(100);
      expect(res.body.walletId).toBe(walletId);
    });

    // Test 3: Add credits to wallet
    it('should add credits to wallet', async () => {
      if (!walletId) {
        console.log('Skipping test as wallet was not created');
        return;
      }

      const res = await request(app.getHttpServer())
        .post(`/internal/wallet/${walletId}/credits/add`)
        .set('Authorization', 'Bearer test-token')
        .send({
          amount: 50,
          description: 'Test addition',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('transaction_id');
      expect(res.body.added_amount).toBe(50);
      expect(res.body.current_balance).toBe(150);
    });

    // Test 4: Add zero credits (edge case)
    it('should handle adding zero credits', async () => {
      if (!walletId) {
        console.log('Skipping test as wallet was not created');
        return;
      }

      const res = await request(app.getHttpServer())
        .post(`/internal/wallet/${walletId}/credits/add`)
        .set('Authorization', 'Bearer test-token')
        .send({
          amount: 0,
          description: 'Zero credit test',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('transaction_id');
      expect(res.body.added_amount).toBe(0);
      expect(res.body.current_balance).toBe(150); // Should be unchanged
    });

    // Test 5: Deduct credits from wallet
    it('should deduct credits from wallet', async () => {
      if (!walletId) {
        console.log('Skipping test as wallet was not created');
        return;
      }

      const res = await request(app.getHttpServer())
        .post(`/internal/wallet/${walletId}/credits/deduct`)
        .set('Authorization', 'Bearer test-token')
        .send({
          amount: 25,
          description: 'Test deduction',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('transaction_id');
      expect(res.body.deducted_amount).toBe(25);
      expect(res.body.current_balance).toBe(125);
    });

    // Test 6: Try to deduct too many credits (edge case)
    it('should handle insufficient credits', async () => {
      if (!walletId) {
        console.log('Skipping test as wallet was not created');
        return;
      }

      const res = await request(app.getHttpServer())
        .post(`/internal/wallet/${walletId}/credits/deduct`)
        .set('Authorization', 'Bearer test-token')
        .send({
          amount: 1000,
          description: 'Too large deduction',
        });

      expect(res.status).toBe(400); // Bad request
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Insufficient');
    });

    // Test 7: Get wallet transactions
    it('should get wallet transactions', async () => {
      if (!walletId) {
        console.log('Skipping test as wallet was not created');
        return;
      }

      const res = await request(app.getHttpServer())
        .get(`/internal/wallet/${walletId}/transactions`)
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('transactions');
      expect(Array.isArray(res.body.transactions)).toBe(true);

      // Should have 4 transactions: initial credit (100), add (50), add (0), deduct (25)
      expect(res.body.transactions.length).toBeGreaterThanOrEqual(4);

      // Verify transaction types
      const creditTransactions = res.body.transactions.filter(
        (t) => t.type === 'CREDIT',
      );
      const debitTransactions = res.body.transactions.filter(
        (t) => t.type === 'DEBIT',
      );

      expect(creditTransactions.length).toBeGreaterThanOrEqual(3);
      expect(debitTransactions.length).toBeGreaterThanOrEqual(1);
    });

    // Test 8: Verify API key wallet check
    it('should check credits using API key', async () => {
      if (!walletId) {
        console.log('Skipping test as wallet was not created');
        return;
      }

      // First create a reference with the API key
      const apiKey = `test_key_${internalUserId}`;

      // Add a small amount with the API key as reference
      await request(app.getHttpServer())
        .post(`/internal/wallet/${walletId}/credits/add`)
        .set('Authorization', 'Bearer test-token')
        .send({
          amount: 5,
          description: 'API key reference',
          referenceId: apiKey,
        })
        .expect(201);

      // Test the API key check endpoint
      const res = await request(app.getHttpServer())
        .get(`/internal/wallet/check?api_key=${apiKey}&amount=10`)
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('has_sufficient_credits');
      expect(res.body.has_sufficient_credits).toBe(true);
      expect(res.body.current_balance).toBe(130); // 125 + 5 = 130
    });

    // Test 9: Check failure cases for missing wallet
    it('should handle requests for non-existent wallets', async () => {
      const fakeWalletId = uuidv4();

      const res = await request(app.getHttpServer())
        .get(`/internal/wallet/balance/${fakeWalletId}`)
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('not found');
    });

    // Test 10: Verify creating a duplicate wallet fails
    it('should prevent creating duplicate wallets', async () => {
      const res = await request(app.getHttpServer())
        .post('/internal/wallet')
        .set('Authorization', 'Bearer test-token')
        .send({
          userId: fusionAuthId,
          tenantId: defaultTenant.id,
          initialCredits: 50,
        });

      expect(res.status).toBe(409); // Conflict
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('already exists');
    });
  });
});
