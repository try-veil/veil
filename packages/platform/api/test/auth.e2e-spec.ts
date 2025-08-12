import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../src/services/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../src/services/prisma/prisma.module';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let consumerToken: string;
  let providerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        PrismaModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = moduleFixture.get<ConfigService>(ConfigService);
    await app.init();

    // Get tokens via ConfigService
    consumerToken = configService.get<string>('E2E_CONSUMER_JWT_TOKEN');
    providerToken = configService.get<string>('E2E_PROVIDER_JWT_TOKEN');

    console.log('Consumer token loaded:', consumerToken ? 'Yes' : 'No');
    console.log('Provider token loaded:', providerToken ? 'Yes' : 'No');

    if (!consumerToken || !providerToken) {
      console.warn('JWT tokens not found in environment variables');
      console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('JWT')));
    }
  });

  describe('Consumer Authentication', () => {
    it('should validate consumer JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/validate')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('roles');
      expect(response.body.roles).toContain('consumer');
      expect(response.body).toHaveProperty('sub');
      expect(response.body).toHaveProperty('aud');
    });

    it('should access consumer-only endpoint', async () => {
      await request(app.getHttpServer())
        .get('/auth/consumer-only')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(200);
    });

    it('should not access provider-only endpoint', async () => {
      await request(app.getHttpServer())
        .get('/auth/provider-only')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(403);
    });
  });

  describe('Provider Authentication', () => {
    it('should validate provider JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/validate')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('roles');
      expect(response.body.roles).toContain('provider');
      expect(response.body).toHaveProperty('sub');
      expect(response.body).toHaveProperty('aud');
    });

    it('should access provider-only endpoint', async () => {
      await request(app.getHttpServer())
        .get('/auth/provider-only')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);
    });

    it('should not access consumer-only endpoint', async () => {
      await request(app.getHttpServer())
        .get('/auth/consumer-only')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(403);
    });
  });

  describe('Invalid Authentication', () => {
    it('should reject requests without token', async () => {
      await request(app.getHttpServer()).get('/auth/validate').expect(401);
    });

    it('should reject invalid tokens', async () => {
      await request(app.getHttpServer())
        .get('/auth/validate')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    it('should reject expired tokens', async () => {
      const expiredToken =
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNTE2MjM5MDIyfQ';

      await request(app.getHttpServer())
        .get('/auth/validate')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
