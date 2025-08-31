import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth-store";
import { authService } from "@/lib/auth-service";
import { useToast } from "@/hooks/use-toast";

// Mock dependencies
jest.mock("@/lib/auth-service");
jest.mock("@/hooks/use-toast");
jest.mock("@/hooks/use-auth-sync", () => ({
  useAuthSync: jest.fn(),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe("Token Management", () => {
  const mockToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({ toast: mockToast });

    // Reset auth store
    useAuthStore.getState().clearAuth();

    // Mock current time
    jest.spyOn(Date, "now").mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Token Storage Format", () => {
    it("should store tokens with proper format including issuedAt and expiresAt", () => {
      const mockTokens = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: 1000000 + 3600000, // 1 hour from now
        issuedAt: 1000000,
      };

      act(() => {
        useAuthStore.getState().setTokens(mockTokens);
      });

      const state = useAuthStore.getState();
      expect(state.tokens).toEqual(mockTokens);
      expect(state.tokens?.issuedAt).toBe(1000000);
      expect(state.tokens?.expiresAt).toBe(1000000 + 3600000);
    });

    it("should reject invalid tokens", () => {
      const invalidTokens = {
        accessToken: "",
        refreshToken: "refresh-token",
        expiresAt: 1000000 - 1000, // Already expired
        issuedAt: 1000000,
      };

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      act(() => {
        useAuthStore.getState().setTokens(invalidTokens);
      });

      const state = useAuthStore.getState();
      expect(state.tokens).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Invalid tokens provided to setTokens"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Token Persistence", () => {
    it("should persist tokens across browser sessions", () => {
      const mockTokens = {
        accessToken: "access-token",
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

      // Simulate login
      act(() => {
        useAuthStore.getState().login(mockUser, mockTokens);
      });

      // Verify state is persisted
      const state = useAuthStore.getState();
      expect(state.tokens).toEqual(mockTokens);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it("should clear expired tokens on rehydration", () => {
      const expiredTokens = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: 1000000 - 1000, // Already expired
        issuedAt: 1000000 - 3600000,
      };

      // Simulate rehydration with expired tokens
      const mockState = {
        user: { id: "1", email: "test@example.com" },
        tokens: expiredTokens,
        isAuthenticated: true,
        lastTokenRefresh: null,
      };

      // Simulate the onRehydrateStorage callback
      const onRehydrateStorage =
        useAuthStore.persist.getOptions().onRehydrateStorage;
      const rehydrateCallback = onRehydrateStorage?.();

      if (rehydrateCallback) {
        rehydrateCallback(mockState);
      }

      expect(mockState.tokens).toBeNull();
      expect(mockState.isAuthenticated).toBe(false);
    });
  });

  describe("Automatic Token Refresh", () => {
    it("should automatically refresh tokens when they are about to expire", async () => {
      const mockTokens = {
        accessToken: "access-token",
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

      const newTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
      };

      mockAuthService.refreshToken.mockResolvedValue(newTokens);
      mockAuthService.getTokensWithExpiration.mockReturnValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: 1000000 + 3600000,
        issuedAt: 1000000,
      });
      mockAuthService.validateTokens.mockReturnValue(true);

      // Set up initial state
      act(() => {
        useAuthStore.getState().login(mockUser, mockTokens);
      });

      // Render the hook to trigger the auto-refresh effect
      const { result } = renderHook(() => useAuth());

      // Wait for the refresh to complete
      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
          "refresh-token"
        );
      });

      // Verify tokens were updated
      const state = useAuthStore.getState();
      expect(state.tokens?.accessToken).toBe("new-access-token");
    });

    it("should handle refresh failures gracefully", async () => {
      const mockTokens = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: 1000000 + 240000, // 4 minutes from now
        issuedAt: 1000000,
      };

      const mockUser = {
        id: "1",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "recruiter" as const,
      };

      mockAuthService.refreshToken.mockRejectedValue(
        new Error("Refresh failed")
      );
      mockAuthService.validateTokens.mockReturnValue(true);

      // Set up initial state
      act(() => {
        useAuthStore.getState().login(mockUser, mockTokens);
      });

      // Render the hook
      const { result } = renderHook(() => useAuth());

      // Wait for the refresh attempt
      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalled();
      });

      // Verify auth was cleared
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.tokens).toBeNull();
    });
  });

  describe("Token Validation on App Initialization", () => {
    it("should verify user when tokens exist but user is missing", async () => {
      const mockTokens = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: 1000000 + 3600000, // 1 hour from now
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

      // Set tokens without user
      act(() => {
        useAuthStore.getState().setTokens(mockTokens);
      });

      // Render the hook to trigger initialization
      const { result } = renderHook(() => useAuth());

      // Wait for verification
      await waitFor(() => {
        expect(mockAuthService.verifyToken).toHaveBeenCalledWith(
          "access-token"
        );
      });

      // Verify user was set
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });

    it("should clear invalid tokens on initialization", async () => {
      const invalidTokens = {
        accessToken: "invalid-token",
        refreshToken: "invalid-refresh",
        expiresAt: 1000000 + 3600000,
        issuedAt: 1000000,
      };

      mockAuthService.validateTokens.mockReturnValue(false);

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Set invalid tokens
      act(() => {
        useAuthStore.getState().setTokens(invalidTokens);
      });

      // Render the hook
      const { result } = renderHook(() => useAuth());

      // Wait for initialization
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Invalid tokens found during initialization, clearing auth"
        );
      });

      // Verify auth was cleared
      const state = useAuthStore.getState();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe("Token Refresh Prevention", () => {
    it("should prevent concurrent refresh attempts", async () => {
      const mockTokens = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: 1000000 + 3600000,
        issuedAt: 1000000,
      };

      mockAuthService.refreshToken.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  access_token: "new-token",
                  refresh_token: "new-refresh",
                  expires_in: 3600,
                }),
              100
            )
          )
      );

      // Set up initial state
      act(() => {
        useAuthStore.getState().setTokens(mockTokens);
        useAuthStore.getState().setTokenRefreshInProgress(true);
      });

      const { result } = renderHook(() => useAuth());

      // Try to refresh token while another refresh is in progress
      const refreshPromise1 = result.current.refreshToken();
      const refreshPromise2 = result.current.refreshToken();

      const [result1, result2] = await Promise.all([
        refreshPromise1,
        refreshPromise2,
      ]);

      // Only one should have actually called the service
      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(0); // Because refresh was already in progress
    });
  });
});
