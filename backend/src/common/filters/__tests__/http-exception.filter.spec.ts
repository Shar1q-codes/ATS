import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from '../http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpExceptionFilter],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/test',
      method: 'GET',
      headers: {
        'x-request-id': 'test-request-id',
      },
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('catch', () => {
    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'HttpException',
          message: 'Test error',
          details: undefined,
          timestamp: expect.any(String),
          path: '/test',
          requestId: 'test-request-id',
        },
        retryable: false,
      });
    });

    it('should handle HttpException with object response', () => {
      const exceptionResponse = {
        message: 'Validation failed',
        error: 'Bad Request',
        details: { field: 'email' },
      };
      const exception = new HttpException(
        exceptionResponse,
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'Bad Request',
          message: 'Validation failed',
          details: { field: 'email' },
          timestamp: expect.any(String),
          path: '/test',
          requestId: 'test-request-id',
        },
        retryable: false,
      });
    });

    it('should handle generic Error', () => {
      const exception = new Error('Generic error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          details: undefined,
          timestamp: expect.any(String),
          path: '/test',
          requestId: 'test-request-id',
        },
        retryable: true,
      });
    });

    it('should handle unknown exception', () => {
      const exception = 'Unknown error';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred',
          details: undefined,
          timestamp: expect.any(String),
          path: '/test',
          requestId: 'test-request-id',
        },
        retryable: true,
      });
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const exception = new Error('Test error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.any(String),
          }),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });
});
