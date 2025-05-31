import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UserModule } from '../src/services/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/services/prisma/prisma.module';
import { UpdateUserDto } from '../src/services/user/user.service';

describe('User Service (e2e)', () => {
  let app: INestApplication;
  let userId: string;
  const testUsername = 'testuser' + Date.now(); // Ensure unique username

  const consumerToken = process.env.E2E_CONSUMER_JWT_TOKEN;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        PrismaModule,
        UserModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('Get Current User', () => {
    it('should get current user details with consumer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('fusionAuthId');
      userId = response.body.id; // Store for later tests
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('Get User by ID', () => {
    it('should get user by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(200);

      console.log(response.body);
      expect(response.body).toHaveProperty('id', userId);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/users/non-existent-id')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(404);
    });
  });

  describe('Update Current User', () => {
    const updateData: UpdateUserDto = {
      username: testUsername,
      name: 'Test User',
      description: 'Test description',
      bio: 'Test bio',
    };

    it('should update current user details', async () => {
      const response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('username', updateData.username);
      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty(
        'description',
        updateData.description,
      );
      expect(response.body).toHaveProperty('bio', updateData.bio);
    });

    it('should fail to update protected fields', async () => {
      const protectedUpdate = {
        id: 'new-id',
        fusionAuthId: 'new-fusion-auth-id',
        createdAt: new Date(),
      };

      const response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(protectedUpdate)
        .expect(200);

      expect(response.body.id).not.toBe(protectedUpdate.id);
      expect(response.body.fusionAuthId).not.toBe(protectedUpdate.fusionAuthId);
    });
  });

  describe('Update User Attributes', () => {
    it('should update user attribute', async () => {
      await request(app.getHttpServer())
        .put(`/users/${userId}/attributes/testAttribute`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ value: 'test value' })
        .expect(200);
    });

    it('should not allow updating attributes of other users', async () => {
      await request(app.getHttpServer())
        .put(`/users/different-user-id/attributes/testAttribute`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ value: 'test value' })
        .expect(403);
    });
  });

  describe('Update User Metadata', () => {
    it('should update user metadata', async () => {
      await request(app.getHttpServer())
        .put(`/users/${userId}/metadata/testMetadata`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ value: 'test metadata value' })
        .expect(200);
    });

    it('should not allow updating metadata of other users', async () => {
      await request(app.getHttpServer())
        .put(`/users/different-user-id/metadata/testMetadata`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ value: 'test metadata value' })
        .expect(403);
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
