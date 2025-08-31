import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from '../guards/roles.guard';
import { UserRole } from '../../entities/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockExecutionContext({
        role: UserRole.RECRUITER,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockExecutionContext({
        role: UserRole.ADMIN,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockExecutionContext({
        role: UserRole.RECRUITER,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return true when user has one of multiple required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
        UserRole.HIRING_MANAGER,
      ]);

      const context = createMockExecutionContext({
        role: UserRole.HIRING_MANAGER,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
        UserRole.HIRING_MANAGER,
      ]);

      const context = createMockExecutionContext({
        role: UserRole.RECRUITER,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });
});
