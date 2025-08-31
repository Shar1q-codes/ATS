import {
  getEnvConfig,
  getCorsOrigin,
  getJwtSecret,
  getDatabaseUrl,
  isDevelopment,
  isProduction,
  validateEnvironment,
} from '../env-validation';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Environment Validation', () => {
  describe('getEnvConfig', () => {
    it('should return valid configuration with required environment variables', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.PORT = '3001';
      process.env.CORS_ORIGIN = 'http://localhost:3000';

      const config = getEnvConfig();

      expect(config).toEqual({
        nodeEnv: 'test', // Jest sets NODE_ENV to 'test'
        port: 3001,
        corsOrigin: 'http://localhost:3000',
        jwtSecret: 'a-very-long-secret-key-that-is-at-least-32-characters-long',
        jwtExpiresIn: '7d',
        databaseUrl: 'postgresql://user:pass@localhost:5432/db',
        redisUrl: undefined,
        openaiApiKey: undefined,
      });
    });

    it('should throw error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      expect(() => getEnvConfig()).toThrow(
        'Missing required environment variables: JWT_SECRET',
      );
    });

    it('should throw error when DATABASE_URL is missing', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      delete process.env.DATABASE_URL;

      expect(() => getEnvConfig()).toThrow(
        'Missing required environment variables: DATABASE_URL',
      );
    });

    it('should throw error when JWT_SECRET is too short', () => {
      process.env.JWT_SECRET = 'short';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      expect(() => getEnvConfig()).toThrow(
        'JWT_SECRET must be at least 32 characters long for security',
      );
    });

    it('should throw error when PORT is invalid', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.PORT = 'invalid';

      expect(() => getEnvConfig()).toThrow(
        'PORT must be a valid port number between 1 and 65535',
      );
    });

    it('should throw error when CORS_ORIGIN is invalid URL', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CORS_ORIGIN = 'invalid-url';

      expect(() => getEnvConfig()).toThrow(
        "CORS_ORIGIN must be a valid URL or '*'. Received: invalid-url",
      );
    });

    it('should accept wildcard CORS_ORIGIN', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CORS_ORIGIN = '*';

      const config = getEnvConfig();
      expect(config.corsOrigin).toBe('*');
    });

    it('should use default values for optional variables', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      delete process.env.PORT;
      delete process.env.CORS_ORIGIN;
      delete process.env.NODE_ENV;
      delete process.env.JWT_EXPIRES_IN;

      const config = getEnvConfig();

      expect(config.nodeEnv).toBe('development');
      expect(config.port).toBe(3001);
      expect(config.corsOrigin).toBe('http://localhost:3000');
      expect(config.jwtExpiresIn).toBe('7d');
    });
  });

  describe('getCorsOrigin', () => {
    it('should return the CORS origin', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CORS_ORIGIN = 'https://example.com';

      expect(getCorsOrigin()).toBe('https://example.com');
    });
  });

  describe('getJwtSecret', () => {
    it('should return the JWT secret', () => {
      const secret =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.JWT_SECRET = secret;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      expect(getJwtSecret()).toBe(secret);
    });
  });

  describe('getDatabaseUrl', () => {
    it('should return the database URL', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      expect(getDatabaseUrl()).toBe('postgresql://user:pass@localhost:5432/db');
    });
  });

  describe('isDevelopment', () => {
    it('should return true in development mode', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'development';

      expect(isDevelopment()).toBe(true);
    });

    it('should return false in production mode', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'production';

      expect(isDevelopment()).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('should return true in production mode', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'production';

      expect(isProduction()).toBe(true);
    });

    it('should return false in development mode', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'development';

      expect(isProduction()).toBe(false);
    });
  });

  describe('validateEnvironment', () => {
    it('should not throw when environment is valid', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should throw when environment is invalid', () => {
      delete process.env.JWT_SECRET;
      delete process.env.DATABASE_URL;

      expect(() => validateEnvironment()).toThrow();
    });

    it('should log configuration in development mode', () => {
      process.env.JWT_SECRET =
        'a-very-long-secret-key-that-is-at-least-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'development';

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      validateEnvironment();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Environment] Configuration validated:',
        expect.objectContaining({
          nodeEnv: 'development',
          hasJwtSecret: true,
          hasDatabaseUrl: true,
        }),
      );

      consoleSpy.mockRestore();
    });
  });
});
