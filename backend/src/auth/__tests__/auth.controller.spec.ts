import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { UserRole } from '../../entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    findById: jest.fn(),
  };

  const mockAuthResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
    user: {
      id: 'user-id',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.RECRUITER,
      organizationId: 'org-id',
      companyId: 'company-id',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password',
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const refreshTokenDto = {
        refreshToken: 'refresh-token',
      };

      const refreshResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      };
      mockAuthService.refreshToken.mockResolvedValue(refreshResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(result).toEqual(refreshResponse);
      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockRequest = {
        user: {
          id: 'user-id',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.RECRUITER,
          companyId: 'company-id',
        },
      };

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual({
        user: mockRequest.user,
      });
    });
  });
});
