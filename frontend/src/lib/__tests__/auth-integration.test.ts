import { authService, ApiError } from "../auth-service";

// Mock axios for integration testing
jest.mock("axios", () => ({
  post: jest.fn(),
  get: jest.fn(),
  isAxiosError: jest.fn(),
}));

import axios from "axios";
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Auth Service Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle complete registration flow with correct data transformation", async () => {
    // Mock backend response matching actual backend AuthResponse format
    const mockBackendResponse = {
      data: {
        user: {
          id: "123",
          email: "john.doe@company.com",
          firstName: "John",
          lastName: "Doe",
          role: "recruiter",
          organizationId: "org-456",
        },
        access_token: "jwt-access-token-here",
        refresh_token: "jwt-refresh-token-here",
        expires_in: 3600,
      },
    };

    mockedAxios.post.mockResolvedValue(mockBackendResponse);

    // Frontend form data (what user submits)
    const frontendFormData = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@company.com",
      password: "SecurePass123!",
      confirmPassword: "SecurePass123!",
      role: "recruiter" as const,
      companyName: "Acme Corp",
    };

    const result = await authService.register(frontendFormData);

    // Verify correct payload transformation to backend RegisterDto
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/register"),
      {
        email: "john.doe@company.com",
        password: "SecurePass123!",
        firstName: "John",
        lastName: "Doe",
        role: "recruiter",
        companyName: "Acme Corp", // Transformed from frontend to backend expected field
      }
    );

    // Verify response format matches backend AuthResponse
    expect(result).toEqual({
      user: {
        id: "123",
        email: "john.doe@company.com",
        firstName: "John",
        lastName: "Doe",
        role: "recruiter",
        organizationId: "org-456",
      },
      access_token: "jwt-access-token-here",
      refresh_token: "jwt-refresh-token-here",
      expires_in: 3600,
    });
  });

  it("should handle token refresh with correct request format", async () => {
    const mockRefreshResponse = {
      data: {
        access_token: "new-jwt-access-token",
        expires_in: 3600,
      },
    };

    mockedAxios.post.mockResolvedValue(mockRefreshResponse);

    const result = await authService.refreshToken("existing-refresh-token");

    // Verify correct request format for RefreshTokenDto
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/refresh"),
      {
        refreshToken: "existing-refresh-token", // Backend expects this field name
      }
    );

    expect(result).toEqual({
      access_token: "new-jwt-access-token",
      expires_in: 3600,
    });
  });

  it("should handle API errors with proper error details", async () => {
    const mockError = {
      response: {
        status: 409,
        data: {
          message: "User with this email already exists",
          code: "USER_EXISTS",
          details: {
            field: "email",
            value: "john.doe@company.com",
          },
        },
      },
    };

    mockedAxios.post.mockRejectedValue(mockError);

    const frontendFormData = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@company.com",
      password: "SecurePass123!",
      confirmPassword: "SecurePass123!",
      role: "recruiter" as const,
      companyName: "Acme Corp",
    };

    try {
      await authService.register(frontendFormData);
      fail("Expected ApiError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);

      const apiError = error as ApiError;
      expect(apiError.status).toBe(409);
      expect(apiError.message).toBe("User with this email already exists");
      expect(apiError.code).toBe("USER_EXISTS");
      expect(apiError.details).toEqual({
        message: "User with this email already exists",
        code: "USER_EXISTS",
        details: {
          field: "email",
          value: "john.doe@company.com",
        },
      });
    }
  });

  it("should verify token with proper authorization header", async () => {
    const mockVerifyResponse = {
      data: {
        user: {
          id: "123",
          email: "john.doe@company.com",
          firstName: "John",
          lastName: "Doe",
          role: "recruiter",
          organizationId: "org-456",
        },
      },
    };

    mockedAxios.get.mockResolvedValue(mockVerifyResponse);

    const result = await authService.verifyToken("jwt-access-token");

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("/verify"),
      {
        headers: {
          Authorization: "Bearer jwt-access-token",
        },
      }
    );

    expect(result).toEqual({
      id: "123",
      email: "john.doe@company.com",
      firstName: "John",
      lastName: "Doe",
      role: "recruiter",
      organizationId: "org-456",
    });
  });
});
