import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TenantModule } from '../src/services/tenant/tenant.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/services/prisma/prisma.module';
import { AuthModule } from '../src/services/auth/auth.module';
import { PrismaService } from '../src/services/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('Tenant Service (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let configService: ConfigService;
  let createdTenantId: string;
  const testDomain = `test-domain-${Date.now()}.com`;
  const testName = `Test Tenant ${Date.now()}`;
  let providerJwtToken: string;
  let consumerJwtToken: string;

  const providerToken = process.env.E2E_PROVIDER_JWT_TOKEN;
  const consumerToken = process.env.E2E_CONSUMER_JWT_TOKEN;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        PrismaModule,
        TenantModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    await app.init();

    providerJwtToken = configService.get<string>('E2E_PROVIDER_JWT_TOKEN');
    consumerJwtToken = configService.get<string>('E2E_CONSUMER_JWT_TOKEN');

    // Debug log tokens
    console.log('Provider token available:', !!providerJwtToken);
    console.log('Consumer token available:', !!consumerJwtToken);
  });

  describe('Authorization', () => {
    it('should not allow consumers to access tenant endpoints', async () => {
      await request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(403);
    });

    it('should not allow unauthorized access', async () => {
      await request(app.getHttpServer()).get('/tenants').expect(401);
    });
  });

  describe('Create Tenant', () => {
    it('should create a tenant with default gateway', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          name: testName,
          domain: testDomain,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(testName);
      expect(response.body.domain).toBe(testDomain);
      expect(response.body.slugifiedKey).toBe(
        testName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, ''),
      );

      createdTenantId = response.body.id;

      // Verify gateway was created
      const gateway = await prisma.gateway.findFirst({
        where: { tenantId: createdTenantId },
      });
      expect(gateway).toBeTruthy();
      expect(gateway.isDefault).toBe(true);
      expect(gateway.dns).toBe(process.env.DEFAULT_GATEWAY_URL);
    });

    it('should not allow duplicate domains', async () => {
      await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          name: 'Another Tenant',
          domain: testDomain,
        })
        .expect(400);
    });
  });

  describe('Get Tenants', () => {
    it('should get all tenants', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.find((t) => t.id === createdTenantId)).toBeTruthy();
    });

    it('should get tenant by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdTenantId);
      expect(response.body.domain).toBe(testDomain);
    });

    it('should get tenant by domain', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tenants/by-domain/${testDomain}`)
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdTenantId);
      expect(response.body.domain).toBe(testDomain);
    });

    it('should return 404 for non-existent tenant', async () => {
      await request(app.getHttpServer())
        .get('/tenants/non-existent-id')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(404);
    });
  });

  describe('Update Tenant', () => {
    const updatedName = `Updated Tenant ${Date.now()}`;
    const updatedDomain = `updated-domain-${Date.now()}.com`;

    it('should update tenant details', async () => {
      const response = await request(app.getHttpServer())
        .put(`/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          name: updatedName,
          domain: updatedDomain,
        })
        .expect(200);

      expect(response.body.name).toBe(updatedName);
      expect(response.body.domain).toBe(updatedDomain);
      expect(response.body.slugifiedKey).toBe(
        updatedName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, ''),
      );
    });

    it('should not allow update with existing domain', async () => {
      // First create another tenant with a unique domain and name
      const anotherName = `Another Tenant ${Date.now()}`;
      const anotherDomain = `another-domain-${Date.now()}.com`;
      const anotherTenant = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          name: anotherName, // Use unique name
          domain: anotherDomain, // Use unique domain
        })
        .expect(201);

      // Try to update it with the *first* tenant's existing domain
      await request(app.getHttpServer())
        .put(`/tenants/${anotherTenant.body.id}`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          domain: updatedDomain, // Try to use the updated domain from the previous test
        })
        .expect(400);

      // Clean up the 'anotherTenant'
      await prisma.tenant.delete({
        where: { id: anotherTenant.body.id },
      });
    });
  });

  describe('Delete Tenant', () => {
    it('should not delete tenant with active subscriptions', async () => {
      // First create a project if it doesn't exist
      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
        },
      });

      // Create a test API
      const api = await prisma.api.create({
        data: {
          name: 'Test API',
          version: '1.0.0',
          path: `/test-api-${Date.now()}`,
          providerId: 'test-provider',
          method: 'GET',
          specification: {},
        },
      });

      // Create a subscription for the tenant
      await prisma.subscription.create({
        data: {
          tenantId: createdTenantId,
          projectId: project.id,
          userId: 'test-user',
          apiId: api.id,
          apiKey: `test-key-${Date.now()}`,
          status: 'ACTIVE',
        },
      });

      await request(app.getHttpServer())
        .delete(`/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(403);

      // Clean up
      await prisma.subscription.deleteMany({
        where: { apiId: api.id },
      });
      await prisma.api.delete({
        where: { id: api.id },
      });
      await prisma.project.delete({
        where: { id: project.id },
      });
    });

    it('should delete tenant and related records', async () => {
      // Delete any potential subscriptions first
      await prisma.subscription.deleteMany({
        where: { tenantId: createdTenantId },
      });
      // Delete any potential wallets
      await prisma.wallet.deleteMany({
        where: { tenantId: createdTenantId },
      });
      // Delete any potential payments
      await prisma.payment.deleteMany({
        where: { tenantId: createdTenantId },
      });
      // Delete related gateways (created automatically)
      await prisma.gateway.deleteMany({
        where: { tenantId: createdTenantId },
      });

      await request(app.getHttpServer())
        .delete(`/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${providerToken}`)
        // Expect 204 No Content for successful deletion
        .expect(204);

      // Verify tenant and related records are deleted
      const tenant = await prisma.tenant.findUnique({
        where: { id: createdTenantId },
      });
      expect(tenant).toBeNull();

      const gateway = await prisma.gateway.findFirst({
        where: { tenantId: createdTenantId },
      });
      expect(gateway).toBeNull();
    });
  });

  afterAll(async () => {
    // Clean up any remaining test data
    await prisma.subscription.deleteMany({
      where: { tenantId: createdTenantId },
    });
    await prisma.gateway.deleteMany({
      where: { tenantId: createdTenantId },
    });
    await prisma.tenant.deleteMany({
      where: { id: createdTenantId },
    });

    await prisma.$disconnect();
    await app.close();
  });
});
