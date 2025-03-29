import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    prisma = app.get<PrismaService>(PrismaService);
    await prisma.apiKey.deleteMany();
    await prisma.user.deleteMany();
    
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Authentication', () => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    let accessToken: string;
    let userId: string;


    describe('POST /auth/signup', () => {
      it('should create a new user', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/signup')
          .send(testUser)
          .expect(201);
        
        expect(response.body.access_token).toBeDefined();
        expect(response.body.fusion_auth_token).toBeDefined();
        expect(response.body.user).toBeDefined();
        expect(response.body.user.email).toBe(testUser.email);
        
        accessToken = response.body.access_token;
        userId = response.body.user.id;
      });

      it('should fail if email is already registered', () => {
        return request(app.getHttpServer())
          .post('/auth/signup')
          .send(testUser)
          .expect(409);
      });

      it('should fail with invalid email', () => {
        return request(app.getHttpServer())
          .post('/auth/signup')
          .send({ ...testUser, email: 'invalid-email' })
          .expect(400);
      });
    });

    describe('POST /auth/login', () => {
      it('should login successfully', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          })
          .expect(200);
        
        expect(response.body.access_token).toBeDefined();
        expect(response.body.fusion_auth_token).toBeDefined();
        expect(response.body.user).toBeDefined();
        expect(response.body.user.email).toBe(testUser.email);
      });

      it('should fail with wrong password', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword',
          })
          .expect(401);
      });
    });

    describe('POST /auth/validate', () => {
      it('should validate a valid token', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/validate')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
          
        expect(response.body.access_token).toBeDefined();
      });
      
      it('should fail with invalid token', () => {
        return request(app.getHttpServer())
          .post('/auth/validate')
          .set('Authorization', 'Bearer invalid_token')
          .expect(401);
      });
      
      it('should fail without token', () => {
        return request(app.getHttpServer())
          .post('/auth/validate')
          .expect(401);
      });
    });

    describe('GET /auth/me', () => {
      it('should get user profile', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
          
        expect(response.body.email).toBe(testUser.email);
        expect(response.body.id).toBeDefined();
      });

      it('should fail without token', () => {
        return request(app.getHttpServer())
          .get('/auth/me')
          .expect(401);
      });
    });
    
    describe('POST /auth/api-keys', () => {
      it('should create an API key', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: 'Test API Key' })
          .expect(201);
          
        expect(response.body.key).toBeDefined();
        expect(response.body.name).toBe('Test API Key');
        expect(response.body.userId).toBe(userId);
      });
      
      it('should fail without token', () => {
        return request(app.getHttpServer())
          .post('/auth/api-keys')
          .send({ name: 'Test API Key' })
          .expect(401);
      });
    });
  });
});