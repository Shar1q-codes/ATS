/**
 * @jest-environment jsdom
 */

import {
  getEnvConfig,
  getApiUrl,
  isDevelopment,
  isProduction,
  validateEnvironment,
} from "../env-config";

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe("Environment Configuration", () => {
  describe("getEnvConfig", () => {
    it("should return valid configuration with required environment variables", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api";
      process.env.NODE_ENV = "development";
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const config = getEnvConfig();

      expect(config).toEqual({
        apiUrl: "http://localhost:3001/api",
        nodeEnv: "development",
        supabaseUrl: undefined,
        supabaseAnonKey: undefined,
      });
    });

    it("should throw error when NEXT_PUBLIC_API_URL is missing", () => {
      delete process.env.NEXT_PUBLIC_API_URL;

      expect(() => getEnvConfig()).toThrow(
        "NEXT_PUBLIC_API_URL is required. Please check your environment configuration."
      );
    });

    it("should throw error when NEXT_PUBLIC_API_URL is invalid", () => {
      process.env.NEXT_PUBLIC_API_URL = "invalid-url";

      expect(() => getEnvConfig()).toThrow(
        "NEXT_PUBLIC_API_URL must be a valid URL. Received: invalid-url"
      );
    });

    it("should include optional Supabase configuration when provided", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";

      const config = getEnvConfig();

      expect(config.supabaseUrl).toBe("https://test.supabase.co");
      expect(config.supabaseAnonKey).toBe("test-key");
    });
  });

  describe("getApiUrl", () => {
    it("should return the API URL", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api";

      expect(getApiUrl()).toBe("http://localhost:3001/api");
    });

    it("should throw error when API URL is not configured", () => {
      delete process.env.NEXT_PUBLIC_API_URL;

      expect(() => getApiUrl()).toThrow();
    });
  });

  describe("isDevelopment", () => {
    it("should return true in development mode", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api";
      process.env.NODE_ENV = "development";

      expect(isDevelopment()).toBe(true);
    });

    it("should return false in production mode", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api";
      process.env.NODE_ENV = "production";

      expect(isDevelopment()).toBe(false);
    });

    it("should default to development when NODE_ENV is not set", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api";
      delete process.env.NODE_ENV;

      expect(isDevelopment()).toBe(true);
    });
  });

  describe("isProduction", () => {
    it("should return true in production mode", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api";
      process.env.NODE_ENV = "production";

      expect(isProduction()).toBe(true);
    });

    it("should return false in development mode", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api";
      process.env.NODE_ENV = "development";

      expect(isProduction()).toBe(false);
    });
  });

  describe("validateEnvironment", () => {
    it("should not throw when environment is valid", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api";
      process.env.NODE_ENV = "development";

      expect(() => validateEnvironment()).not.toThrow();
    });

    it("should throw when environment is invalid", () => {
      delete process.env.NEXT_PUBLIC_API_URL;

      expect(() => validateEnvironment()).toThrow();
    });

    it("should log configuration in development mode", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api";
      process.env.NODE_ENV = "development";

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      validateEnvironment();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[Environment] Configuration validated:",
        expect.objectContaining({
          apiUrl: "http://localhost:3001/api",
          nodeEnv: "development",
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
