import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth-store";
import { authService } from "@/lib/auth-service";

// Mock dependencies
jest.mock("@/lib/auth-service");
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));
jest.mock("@/hooks/use-auth-sync", () => ({
  useAuthSync: jest.fn(),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe("Token Management Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().clearAuth();
    jest.spyOn(Date, "now").mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should handle complete authentication flow with token management", async () => {
    // Mock successful login
    const loginResponse = {
      user: {
        id: "1",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "recruiter" as const,
      },
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
    };

    const initialTokens = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: 1000000 + 3600000,
      issuedAt: 1000000,
    };

    mockAuthService.login.mockResolvedValue(loginResponse);
    mockAuthService.getTokensWithExpiration.mockReturnValue(initialTokens);
    mockAuthService.validateTokens.mockReturnValue(true);

    const { result } = renderHook(() => useAuth());

    // Perform login
    await act(async () => {
      await result.current.login({
        email: "test@example.com",
        password: "password",
      });
    });

    // Wait for state to update
    await waitFor(() => {
      console.log("Auth state:", {
        isAuthenticated: result.current.isAuthenticated,
        user: result.current.user,
        tokens: result.current.tokens,
      });
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Verify login state
    expect(result.current.user).toEqual(loginResponse.user);
    expect(result.current.tokens).toEqual(initialTokens);

    // Mock token refresh for when token is about to expire
    const refreshResponse = {
      access_token: "new-access-token",
      refresh_token: "new-refresh-token",
      expires_in: 3600,
    };

    const newTokens = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresAt: 1000000 + 3600000,
      issuedAt: 1000000,
    };

    mockAuthService.refreshToken.mockResolvedValue(refreshResponse);
    mockAuthService.getTokensWithExpiration.mockReturnValue(newTokens);
    mockAuthService.validateTokens.mockReturnValue(true);

    // Manually trigger token refresh
    await act(async () => {
      const refreshResult = await result.current.refreshToken();
      expect(refreshResult).toBe(true);
    });

    // Verify tokens were refreshed
    expect(result.current.tokens?.accessToken).toBe("new-access-token");
    expect(result.current.tokens?.refreshToken).toBe("new-refresh-token");
    expect(result.current.isAuthenticated).toBe(true);

    // Test logout
    mockAuthService.logout.mockResolvedValue();

    await act(async () => {
      await result.current.logout();
    });

    // Verify logout state
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.tokens).toBeNull();
  });

  it("should handle token expiration and automatic refresh", async () => {
    // Set up tokens that are about to expire
    const expiringTokens = {
      accessToken: "expiring-token",
      refreshToken: "refresh-token",
      expiresAt: 1000000 + 240000, // 4 minutes from now (within 5 minute threshold)
      issuedAt: 1000000,
    };

    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "recruiter" as const,
    };

    // Mock successful refresh
    const refreshResponse = {
      access_token: "refreshed-token",
      refresh_token: "new-refresh-token",
      expires_in: 3600,
    };

    const refreshedTokens = {
      accessToken: "refreshed-token",
      refreshToken: "new-refresh-token",
      expiresAt: 1000000 + 3600000,
      issuedAt: 1000000,
    };

    mockAuthService.refreshToken.mockResolvedValue(refreshResponse);
    mockAuthService.getTokensWithExpiration.mockReturnValue(refreshedTokens);
    mockAuthService.validateTokens.mockReturnValue(true);
    mockAuthService.isTokenExpired.mockReturnValue(false);

    // Set up initial state with expiring tokens
    act(() => {
      useAuthStore.getState().login(mockUser, expiringTokens);
    });

    // Render the hook to trigger auto-refresh
    const { result } = renderHook(() => useAuth());

    // Wait for automatic refresh to occur
    await waitFor(
      () => {
        expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
          "refresh-token"
        );
      },
      { timeout: 1000 }
    );

    // Verify tokens were automatically refreshed
    await waitFor(() => {
      expect(result.current.tokens?.accessToken).toBe("refreshed-token");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it("should validate tokens on app initialization", async () => {
    // Set up valid tokens without user
    const validTokens = {
      accessToken: "valid-token",
      refreshToken: "refresh-token",
      expiresAt: 1000000 + 3600000,
      issuedAt: 1000000,
    };

    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "recruiter" as const,
    };

    mockAuthService.validateTokens.mockReturnValue(true);
    mockAuthService.isTokenExpired.mockReturnValue(false);
    mockAuthService.verifyToken.mockResolvedValue(mockUser);

    // Set tokens without user (simulating app restart)
    act(() => {
      useAuthStore.getState().setTokens(validTokens);
    });

    // Render the hook to trigger initialization
    const { result } = renderHook(() => useAuth());

    // Wait for token verification
    await waitFor(() => {
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith("valid-token");
    });

    // Verify user was set after verification
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });
});
