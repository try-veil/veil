import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeAll(async () => {
    console.log('Initializing test environment...');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    prisma = app.get<PrismaService>(PrismaService);

    await app.init();
    await prisma.$connect();
    console.log('Database connection established.');

    try {
      await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
      console.log('Database cleanup complete.');
    } catch (error) {
      console.error('Error cleaning database:', error);
    }
  }, 60000);

  afterAll(async () => {
    console.log('Shutting down test environment...');
    try {
      await prisma.apiKey.deleteMany();
      await prisma.user.deleteMany();
      console.log('Database cleanup complete.');
    } catch (error) {
      console.error('Error cleaning database:', error);
    }
  });

  describe('Authentication', () => {
    describe('POST /auth/signup', () => {
      it('should create a new user', async () => {
        console.log('Testing signup:', testUser.email);
        const response = await request(app.getHttpServer())
          .post('/auth/signup')
          .send(testUser)
          .expect(201);

        expect(response.body.access_token).toBeDefined();
      }, 15000);

      it('should fail if email is already registered', () => {
        return request(app.getHttpServer())
          .post('/auth/signup')
          .send(testUser)
          .expect(409);
      }, 15000);
    });

    describe('POST /auth/login', () => {
      it('should login successfully', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: testUser.email, password: testUser.password })
          .expect(200);

        expect(response.body.access_token).toBeDefined();
      }, 10000);

      it('should fail with wrong password', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: testUser.email, password: 'wrongpassword' })
          .expect(401);
      }, 10000);
    });

    describe('GET /auth/me', () => {
      let token: string;

      beforeAll(async () => {
        console.log('Obtaining authentication token...');
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: testUser.email, password: testUser.password });
        console.log('Login Response:', response.body);
        token = response.body.access_token;
        token
          ? console.log('Token acquired successfully.')
          : console.error('Failed to obtain token!');
      });

      it('should retrieve user profile', () => {
        return request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      });

      it('should fail without token', () => {
        return request(app.getHttpServer()).get('/auth/me').expect(401);
      });
    });
  });
});
