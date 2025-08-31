import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth.service';
import { User, UserRole } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const bcrypt = require('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let organizationRepository: Repository<Organization>;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.RECRUITER,
    organizationId: 'org-id',
    companyId: 'company-id',
    isActive: true,
  };

  const mockOrganization = {
    id: 'org-id',
    name: 'Test Company',
    type: 'SMB',
    subscriptionPlan: 'FREE',
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockOrganizationRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    organizationRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com', isActive: true },
        relations: ['company', 'organization'],
      });
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return auth response when credentials are valid', async () => {
      const loginDto = { email: 'test@example.com', password: 'password' };
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: 3600,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          organizationId: mockUser.organizationId,
          companyId: mockUser.companyId,
        },
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const loginDto = { email: 'test@example.com', password: 'password' };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('should create new user and return auth response', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'recruiter' as 'recruiter' | 'hiring_manager',
        companyName: 'Test Company',
      };

      const hashedPassword = 'hashed-password';
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      mockUserRepository.findOne.mockResolvedValue(null); // User doesn't exist
      mockOrganizationRepository.create.mockReturnValue(mockOrganization);
      mockOrganizationRepository.save.mockResolvedValue(mockOrganization);
      bcrypt.hash.mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: 3600,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          organizationId: mockUser.organizationId,
          companyId: mockUser.companyId,
        },
      });

      expect(mockOrganizationRepository.create).toHaveBeenCalledWith({
        name: registerDto.companyName,
        type: 'smb',
        subscriptionPlan: 'free',
      });
    });

    it('should throw ConflictException when user already exists in same organization', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'recruiter' as 'recruiter' | 'hiring_manager',
        companyName: 'Test Company',
      };

      mockOrganizationRepository.create.mockReturnValue(mockOrganization);
      mockOrganizationRepository.save.mockResolvedValue(mockOrganization);
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow same email in different organizations (multi-tenant)', async () => {
      const registerDto = {
        email: 'same@example.com',
        password: 'password',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'recruiter' as 'recruiter' | 'hiring_manager',
        companyName: 'Different Company',
      };

      const differentOrganization = {
        id: 'different-org-id',
        name: 'Different Company',
        type: 'SMB',
        subscriptionPlan: 'FREE',
      };

      const newUser = {
        ...mockUser,
        id: 'different-user-id',
        organizationId: 'different-org-id',
      };

      const hashedPassword = 'hashed-password';
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      // First call checks if user exists in the new organization (should return null)
      mockUserRepository.findOne.mockResolvedValue(null);
      mockOrganizationRepository.create.mockReturnValue(differentOrganization);
      mockOrganizationRepository.save.mockResolvedValue(differentOrganization);
      bcrypt.hash.mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockJwtService.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: 3600,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          organizationId: newUser.organizationId,
          companyId: newUser.companyId,
        },
      });

      // Verify that the user lookup was done with both email and organizationId
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: {
          email: registerDto.email,
          organizationId: differentOrganization.id,
        },
      });
    });
  });

  describe('refreshToken', () => {
    it('should return new access token when refresh token is valid', async () => {
      const refreshToken = 'valid-refresh-token';
      const newAccessToken = 'new-access-token';
      const payload = { sub: mockUser.id };

      mockJwtService.verify.mockReturnValue(payload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(newAccessToken);

      const result = await service.refreshToken(refreshToken);

      expect(result).toEqual({
        accessToken: newAccessToken,
        refreshToken: newAccessToken, // Since we're mocking the same return value
        expiresIn: 3600,
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      const refreshToken = 'invalid-refresh-token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 'non-existent-user-id' };

      mockJwtService.verify.mockReturnValue(payload);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('user-id');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id', isActive: true },
        relations: ['company', 'organization'],
      });
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
