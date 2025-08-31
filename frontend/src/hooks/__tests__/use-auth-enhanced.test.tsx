import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../use-auth";
import { authService, ApiError } from "@/lib/auth-service";
import { useAuthStore } from "@/lib/auth-store";

// Mock the auth service
jest.mock("@/lib/auth-service");
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Mock toast
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe("useAuth Enhanced Error Handling", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    jest.clearAllMocks();
    mockToast.mockClear();
  });

  it("should provide specific loading states", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoginLoading).toBe(false);
    expect(result.current.isRegisterLoading).toBe(false);
    expect(result.current.isRefreshLoading).toBe(false);
    expect(result.current.isVerifyLoading).toBe(false);
  });

  it("should handle network errors during login", async () => {
    const networkError = new Error("Network Error");
    mockAuthService.login.mockRejectedValue(networkError);

    const { result } = renderHook(() => useAuth());

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
    expect(mockToast).toHaveBeenCalledWith({
      title: "Connection Error",
      description:
        "Unable to connect to the server. Please check your internet connection and try again.",
      variant: "destructive",
    });
  });

  it("should handle 401 errors during login with specific message", async () => {
    const apiError = new ApiError("Invalid credentials", 401);
    mockAuthService.login.mockRejectedValue(apiError);

    const { result } = renderHook(() => useAuth());

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

    expect(mockToast).toHaveBeenCalledWith({
      title: "Login Failed",
      description:
        "Invalid email or password. Please check your credentials and try again.",
      variant: "destructive",
    });
  });

  it("should handle 409 conflict during registration", async () => {
    const conflictError = new ApiError("User already exists", 409);
    mockAuthService.register.mockRejectedValue(conflictError);

    const { result } = renderHook(() => useAuth());

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

    expect(mockToast).toHaveBeenCalledWith({
      title: "Account Already Exists",
      description:
        "An account with this email already exists. Please use a different email or try logging in instead.",
      variant: "destructive",
    });
  });

  it("should handle refresh token failure", async () => {
    const mockTokens = {
      accessToken: "access-token",
      refreshToken: "invalid-refresh-token",
      expiresAt: Date.now() - 1000, // Expired
    };

    const refreshError = new ApiError("Invalid refresh token", 401);
    mockAuthService.refreshToken.mockRejectedValue(refreshError);
    useAuthStore.getState().setTokens(mockTokens);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.refreshToken();
      expect(success).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.tokens).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should prevent multiple simultaneous refresh attempts", async () => {
    const mockTokens = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600000,
    };

    const mockRefreshResponse = {
      access_token: "new-access-token",
      refresh_token: "new-refresh-token",
      expires_in: 3600,
    };

    mockAuthService.refreshToken.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockRefreshResponse), 100)
        )
    );
    mockAuthService.getTokensWithExpiration.mockReturnValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresAt: Date.now() + 3600000,
    });

    useAuthStore.getState().setTokens(mockTokens);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      // Start multiple refresh attempts simultaneously
      const promises = [
        result.current.refreshToken(),
        result.current.refreshToken(),
        result.current.refreshToken(),
      ];

      await Promise.all(promises);
    });

    // Should only call the service once due to loading state check
    expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
  });
});
