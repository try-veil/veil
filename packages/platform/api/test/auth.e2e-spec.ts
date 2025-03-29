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
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Authentication', () => {
    const testUser = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    describe('POST /auth/signup', () => {
      it('should create a new user', () => {
        return request(app.getHttpServer())
          .post('/auth/signup')
          .send(testUser)
          .expect(201)
          .expect((res) => {
            expect(res.body.access_token).toBeDefined();
          });
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
      it('should login successfully', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.access_token).toBeDefined();
          });
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

    describe('GET /auth/me', () => {
      let token: string;

      beforeAll(async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          });
        token = response.body.access_token;
      });

      it('should get user profile', () => {
        return request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.email).toBe(testUser.email);
          });
      });

      it('should fail without token', () => {
        return request(app.getHttpServer())
          .get('/auth/me')
          .expect(401);
      });
    });
  });
}); 