import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "../use-auth";
import { authService } from "@/lib/auth-service";
import { useAuthStore } from "@/lib/auth-store";
import { TestWrapper } from "@/lib/test-utils";

// Mock the auth service
jest.mock("@/lib/auth-service");
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Mock toast
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe("useAuth", () => {
  beforeEach(() => {
    // Clear the auth store
    useAuthStore.getState().clearAuth();
    jest.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    expect(result.current.user).toBeNull();
    expect(result.current.tokens).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("should login successfully", async () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "recruiter" as const,
    };

    const mockResponse = {
      user: mockUser,
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
    };

    mockAuthService.login.mockResolvedValue(mockResponse);
    mockAuthService.getTokensWithExpiration.mockReturnValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600000,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await act(async () => {
      await result.current.login({
        email: "test@example.com",
        password: "password123",
      });
    });

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle login failure", async () => {
    const errorMessage = "Invalid credentials";
    mockAuthService.login.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await act(async () => {
      try {
        await result.current.login({
          email: "test@example.com",
          password: "wrong-password",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(errorMessage);
      }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("should register successfully", async () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "recruiter" as const,
    };

    const mockResponse = {
      user: mockUser,
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
    };

    mockAuthService.register.mockResolvedValue(mockResponse);
    mockAuthService.getTokensWithExpiration.mockReturnValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600000,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await act(async () => {
      await result.current.register({
        firstName: "John",
        lastName: "Doe",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
        role: "recruiter",
        companyName: "Test Company",
      });
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("should logout successfully", async () => {
    // First login
    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "recruiter" as const,
    };

    useAuthStore.getState().login(mockUser, {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600000,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockAuthService.logout).toHaveBeenCalledWith("refresh-token");
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should check roles correctly", () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "recruiter" as const,
    };

    useAuthStore.getState().setUser(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    expect(result.current.hasRole("recruiter")).toBe(true);
    expect(result.current.hasRole("admin")).toBe(false);
    expect(result.current.hasRole(["recruiter", "admin"])).toBe(true);
    expect(result.current.hasRole(["admin", "hiring_manager"])).toBe(false);
  });

  it("should check permissions correctly", () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "recruiter" as const,
    };

    useAuthStore.getState().setUser(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    expect(result.current.hasPermission("candidates:read")).toBe(true);
    expect(result.current.hasPermission("candidates:write")).toBe(true);
    expect(result.current.hasPermission("admin:settings")).toBe(false);
  });

  it("should refresh token when expired", async () => {
    const mockTokens = {
      accessToken: "old-access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() - 1000, // Expired
    };

    const mockRefreshResponse = {
      access_token: "new-access-token",
      refresh_token: "new-refresh-token",
      expires_in: 3600,
    };

    mockAuthService.refreshToken.mockResolvedValue(mockRefreshResponse);
    mockAuthService.getTokensWithExpiration.mockReturnValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresAt: Date.now() + 3600000,
    });

    useAuthStore.getState().setTokens(mockTokens);

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(mockAuthService.refreshToken).toHaveBeenCalledWith("refresh-token");
  });

  describe("Enhanced Error Handling", () => {
    it("should provide specific loading states for different operations", () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isLoginLoading).toBe(false);
      expect(result.current.isRegisterLoading).toBe(false);
      expect(result.current.isRefreshLoading).toBe(false);
      expect(result.current.isVerifyLoading).toBe(false);
    });

    it("should handle network errors during login", async () => {
      const networkError = new Error("Network Error");
      mockAuthService.login.mockRejectedValue(networkError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        try {
          await result.current.login({
            email: "test@example.com",
            password: "password123",
          });
        } catch (error) {
          expect(error).toEqual(networkError);
        }
      });

      expect(result.current.isLoginLoading).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it("should handle 401 errors during login with specific message", async () => {
      const apiError = {
        response: {
          status: 401,
          data: { message: "Invalid credentials" },
        },
      };
      mockAuthService.login.mockRejectedValue(apiError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        try {
          await result.current.login({
            email: "test@example.com",
            password: "wrong-password",
          });
        } catch (error) {
          expect(error).toEqual(apiError);
        }
      });

      expect(result.current.isLoginLoading).toBe(false);
    });

    it("should handle 409 conflict during registration", async () => {
      const conflictError = {
        response: {
          status: 409,
          data: { message: "User already exists" },
        },
      };
      mockAuthService.register.mockRejectedValue(conflictError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        try {
          await result.current.register({
            firstName: "John",
            lastName: "Doe",
            email: "existing@example.com",
            password: "password123",
            confirmPassword: "password123",
            role: "recruiter",
            companyName: "Test Company",
          });
        } catch (error) {
          expect(error).toEqual(conflictError);
        }
      });

      expect(result.current.isRegisterLoading).toBe(false);
    });

    it("should prevent multiple simultaneous refresh attempts", async () => {
      const mockTokens = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 3600000,
      };

      useAuthStore.getState().setTokens(mockTokens);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      // Start first refresh
      const firstRefresh = result.current.refreshToken();

      // Try to start second refresh while first is in progress
      const secondRefresh = result.current.refreshToken();

      await act(async () => {
        await Promise.all([firstRefresh, secondRefresh]);
      });

      // Should only call the service once
      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
    });

    it("should handle token verification failure and attempt refresh", async () => {
      const mockTokens = {
        accessToken: "invalid-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 3600000,
      };

      const verifyError = {
        response: {
          status: 401,
          data: { message: "Invalid token" },
        },
      };

      const mockRefreshResponse = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
      };

      mockAuthService.verifyToken.mockRejectedValue(verifyError);
      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResponse);
      mockAuthService.getTokensWithExpiration.mockReturnValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: Date.now() + 3600000,
      });

      useAuthStore.getState().setTokens(mockTokens);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        const success = await result.current.verifyToken();
        expect(success).toBe(true);
      });

      expect(mockAuthService.verifyToken).toHaveBeenCalledWith("invalid-token");
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        "refresh-token"
      );
    });

    it("should clear auth when refresh token is invalid", async () => {
      const mockTokens = {
        accessToken: "access-token",
        refreshToken: "invalid-refresh-token",
        expiresAt: Date.now() - 1000, // Expired
      };

      const refreshError = {
        response: {
          status: 401,
          data: { message: "Invalid refresh token" },
        },
      };

      mockAuthService.refreshToken.mockRejectedValue(refreshError);
      useAuthStore.getState().setTokens(mockTokens);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        const success = await result.current.refreshToken();
        expect(success).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
