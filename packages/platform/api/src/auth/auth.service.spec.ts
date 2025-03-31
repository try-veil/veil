import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    fusionAuthId: 'fa-123',
    firstName: 'Test',
    lastName: 'User',
    roles: [],
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    apiKey: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a JWT token', async () => {
      const mockToken = 'jwt-token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.generateToken(mockUser);

      expect(result).toEqual({ access_token: mockToken });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        roles: [],
      });
    });
  });

  describe('assignRole', () => {
    it('should assign a role to a user', async () => {
      const mockRole = { id: 'role-123', name: 'admin' };
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        roles: [mockRole],
      });

      const result = await service.assignRole(mockUser.id, 'admin');

      expect(result.roles).toContainEqual(mockRole);
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'admin' },
      });
    });

    it('should throw error if role not found', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(
        service.assignRole(mockUser.id, 'nonexistent'),
      ).rejects.toThrow();
    });
  });

  describe('createApiKey', () => {
    it('should create an API key', async () => {
      const mockApiKey = {
        id: 'key-123',
        key: 'test-key',
        name: 'Test Key',
        userId: mockUser.id,
      };
      mockPrismaService.apiKey.create.mockResolvedValue(mockApiKey);

      const result = await service.createApiKey(mockUser.id, 'Test Key');

      expect(result).toEqual(mockApiKey);
      expect(prisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Key',
          userId: mockUser.id,
        }),
      });
    });
  });
});
