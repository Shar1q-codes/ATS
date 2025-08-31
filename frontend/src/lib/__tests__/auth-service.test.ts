import axios from "axios";
import { authService, ApiError } from "../auth-service";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should transform frontend form data to backend format", async () => {
      const mockBackendResponse = {
        data: {
          user: {
            id: "1",
            email: "test@example.com",
            firstName: "John",
            lastName: "Doe",
            role: "recruiter",
            organizationId: "org-1",
          },
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValue(mockBackendResponse);

      const frontendFormData = {
        firstName: "John",
        lastName: "Doe",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
        role: "recruiter" as const,
        companyName: "Test Company",
      };

      const result = await authService.register(frontendFormData);

      // Verify the payload sent to backend matches RegisterDto structure
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/register"),
        {
          email: "test@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
          role: "recruiter",
          companyName: "Test Company", // Backend expects companyName
        }
      );

      // Verify response format matches backend AuthResponse
      expect(result).toEqual(mockBackendResponse.data);
    });

    it("should throw ApiError on registration failure", async () => {
      const mockError = {
        response: {
          status: 409,
          data: {
            message: "User already exists",
            code: "USER_EXISTS",
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const frontendFormData = {
        firstName: "John",
        lastName: "Doe",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
        role: "recruiter" as const,
        companyName: "Test Company",
      };

      await expect(authService.register(frontendFormData)).rejects.toThrow(
        ApiError
      );

      try {
        await authService.register(frontendFormData);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(409);
        expect((error as ApiError).message).toBe("User already exists");
        expect((error as ApiError).code).toBe("USER_EXISTS");
      }
    });
  });

  describe("refreshToken", () => {
    it("should send correct request format for token refresh", async () => {
      const mockBackendResponse = {
        data: {
          access_token: "new-access-token",
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValue(mockBackendResponse);

      const result = await authService.refreshToken("refresh-token");

      // Verify the payload sent to backend matches RefreshTokenDto structure
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/refresh"),
        {
          refreshToken: "refresh-token", // Backend expects refreshToken field
        }
      );

      expect(result).toEqual(mockBackendResponse.data);
    });

    it("should throw ApiError on refresh failure", async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: "Invalid refresh token",
            code: "INVALID_TOKEN",
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      await expect(authService.refreshToken("invalid-token")).rejects.toThrow(
        ApiError
      );

      try {
        await authService.refreshToken("invalid-token");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(401);
        expect((error as ApiError).message).toBe("Invalid refresh token");
        expect((error as ApiError).code).toBe("INVALID_TOKEN");
      }
    });
  });

  describe("login", () => {
    it("should handle login with proper error handling", async () => {
      const mockBackendResponse = {
        data: {
          user: {
            id: "1",
            email: "test@example.com",
            firstName: "John",
            lastName: "Doe",
            role: "recruiter",
            organizationId: "org-1",
          },
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValue(mockBackendResponse);

      const credentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await authService.login(credentials);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/login"),
        credentials
      );

      expect(result).toEqual(mockBackendResponse.data);
    });
  });

  describe("verifyToken", () => {
    it("should handle token verification with proper error handling", async () => {
      const mockBackendResponse = {
        data: {
          user: {
            id: "1",
            email: "test@example.com",
            firstName: "John",
            lastName: "Doe",
            role: "recruiter",
            organizationId: "org-1",
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockBackendResponse);

      const result = await authService.verifyToken("access-token");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/verify"),
        {
          headers: {
            Authorization: "Bearer access-token",
          },
        }
      );

      expect(result).toEqual(mockBackendResponse.data.user);
    });

    it("should throw ApiError on verification failure", async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: "Token expired",
            code: "TOKEN_EXPIRED",
          },
        },
      };

      mockedAxios.get.mockRejectedValue(mockError);

      await expect(authService.verifyToken("expired-token")).rejects.toThrow(
        ApiError
      );

      try {
        await authService.verifyToken("expired-token");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(401);
        expect((error as ApiError).message).toBe("Token expired");
        expect((error as ApiError).code).toBe("TOKEN_EXPIRED");
      }
    });
  });
});
