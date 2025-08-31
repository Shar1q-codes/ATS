import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from '../all-exceptions.filter';
import { QueryFailedError } from 'typeorm';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AllExceptionsFilter],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/test',
      method: 'GET',
      headers: {
        'user-agent': 'test-agent',
        'x-request-id': 'test-request-id',
      },
      ip: '127.0.0.1',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HttpException handling', () => {
    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
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
      const exception = new HttpException(
        {
          message: 'Validation failed',
          error: 'Bad Request',
          details: { field: 'email' },
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

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
  });

  describe('QueryFailedError handling', () => {
    it('should handle duplicate key error', () => {
      const exception = new QueryFailedError(
        'SELECT * FROM users',
        [],
        new Error(
          'duplicate key value violates unique constraint "users_email_key"',
        ),
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'An account with this email already exists',
          details: undefined,
          timestamp: expect.any(String),
          path: '/test',
          requestId: 'test-request-id',
        },
        retryable: false,
      });
    });

    it('should handle foreign key constraint error', () => {
      const exception = new QueryFailedError(
        'INSERT INTO applications',
        [],
        new Error('foreign key constraint fails'),
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Invalid reference to related data',
          details: undefined,
          timestamp: expect.any(String),
          path: '/test',
          requestId: 'test-request-id',
        },
        retryable: false,
      });
    });
  });

  describe('Generic Error handling', () => {
    it('should handle generic Error', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

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

      filter.catch(exception, mockHost);

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
  });

  describe('Retryable error detection', () => {
    it('should mark server errors as retryable', () => {
      const exception = new HttpException(
        'Server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      filter.catch(exception, mockHost);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.retryable).toBe(true);
    });

    it('should mark timeout errors as retryable', () => {
      const exception = new HttpException(
        'Request timeout',
        HttpStatus.REQUEST_TIMEOUT,
      );

      filter.catch(exception, mockHost);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.retryable).toBe(true);
    });

    it('should mark rate limit errors as retryable', () => {
      const exception = new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );

      filter.catch(exception, mockHost);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.retryable).toBe(true);
    });

    it('should not mark client errors as retryable by default', () => {
      const exception = new HttpException(
        'Bad request',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.retryable).toBe(false);
    });
  });
});
