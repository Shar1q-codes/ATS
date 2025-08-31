import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TenantMiddleware, TenantRequest } from '../tenant.middleware';
import { Request, Response, NextFunction } from 'express';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let jwtService: jest.Mocked<JwtService>;
  let mockRequest: Partial<TenantRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantMiddleware,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<TenantMiddleware>(TenantMiddleware);
    jwtService = module.get(JwtService);

    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should call next() when no authorization header is present', () => {
    middleware.use(
      mockRequest as TenantRequest,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.tenantId).toBeUndefined();
    expect(mockRequest.userId).toBeUndefined();
  });

  it('should call next() when authorization header does not start with Bearer', () => {
    mockRequest.headers = { authorization: 'Basic token' };

    middleware.use(
      mockRequest as TenantRequest,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.tenantId).toBeUndefined();
    expect(mockRequest.userId).toBeUndefined();
  });

  it('should extract tenant information from valid JWT token', () => {
    const mockPayload = {
      sub: 'user-123',
      organizationId: 'org-456',
      role: 'admin',
    };

    mockRequest.headers = { authorization: 'Bearer valid-token' };
    jwtService.verify.mockReturnValue(mockPayload);

    middleware.use(
      mockRequest as TenantRequest,
      mockResponse as Response,
      mockNext,
    );

    expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
    expect(mockRequest.tenantId).toBe('org-456');
    expect(mockRequest.userId).toBe('user-123');
    expect(mockRequest.userRole).toBe('admin');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next() when JWT verification fails', () => {
    mockRequest.headers = { authorization: 'Bearer invalid-token' };
    jwtService.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    middleware.use(
      mockRequest as TenantRequest,
      mockResponse as Response,
      mockNext,
    );

    expect(jwtService.verify).toHaveBeenCalledWith('invalid-token');
    expect(mockRequest.tenantId).toBeUndefined();
    expect(mockRequest.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next() when payload does not contain organizationId', () => {
    const mockPayload = {
      sub: 'user-123',
      role: 'admin',
      // organizationId is missing
    };

    mockRequest.headers = { authorization: 'Bearer token-without-org' };
    jwtService.verify.mockReturnValue(mockPayload);

    middleware.use(
      mockRequest as TenantRequest,
      mockResponse as Response,
      mockNext,
    );

    expect(jwtService.verify).toHaveBeenCalledWith('token-without-org');
    expect(mockRequest.tenantId).toBeUndefined();
    expect(mockRequest.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle empty authorization header gracefully', () => {
    mockRequest.headers = { authorization: '' };

    middleware.use(
      mockRequest as TenantRequest,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.tenantId).toBeUndefined();
    expect(mockRequest.userId).toBeUndefined();
  });

  it('should handle Bearer token without actual token', () => {
    mockRequest.headers = { authorization: 'Bearer ' };

    middleware.use(
      mockRequest as TenantRequest,
      mockResponse as Response,
      mockNext,
    );

    expect(jwtService.verify).toHaveBeenCalledWith('');
    expect(mockNext).toHaveBeenCalled();
  });
});
