import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { authService, ApiError } from "@/lib/auth-service";
import { LoginFormData, RegisterFormData } from "@/lib/auth-schemas";
import { useToast } from "@/hooks/use-toast";
import { useAuthSync } from "@/hooks/use-auth-sync";

export const useAuth = () => {
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    setUser,
    setTokens,
    login: setLogin,
    logout: setLogout,
    setLoading,
    clearAuth,
    tokenRefreshInProgress,
  } = useAuthStore();

  const { toast } = useToast();

  // Enable cross-tab synchronization
  useAuthSync();

  // Additional loading states for specific operations
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [isVerifyLoading, setIsVerifyLoading] = useState(false);

  // Enhanced token validation and auto-refresh on app initialization
  useEffect(() => {
    const initializeAuth = async () => {
      // Skip if already loading or no tokens
      if (isVerifyLoading || !tokens) {
        return;
      }

      // Validate token structure first
      if (!authService.validateTokens(tokens)) {
        console.log(
          "Invalid tokens found during initialization, clearing auth"
        );
        clearAuth();
        return;
      }

      // If we have tokens but no user, verify the token
      if (!user) {
        // Check if access token is expired
        if (authService.isTokenExpired(tokens.expiresAt)) {
          console.log(
            "Access token expired during initialization, attempting refresh"
          );
          // Don't verify, let the auto-refresh effect handle it
          return;
        }

        setIsVerifyLoading(true);
        try {
          const verifiedUser = await authService.verifyToken(
            tokens.accessToken
          );
          setUser(verifiedUser);
          console.log("User verified successfully during initialization");
        } catch (error) {
          console.warn(
            "Token verification failed during initialization:",
            error
          );

          // If verification fails, try to refresh token
          if (error instanceof ApiError && error.status === 401) {
            console.log("Token invalid, will attempt refresh");
            // Let the auto-refresh effect handle this
          } else {
            // For other errors, don't clear auth immediately
            console.warn("Non-auth error during verification, keeping tokens");
          }
        } finally {
          setIsVerifyLoading(false);
        }
      }
    };

    // Only run initialization once when the hook mounts or tokens change
    initializeAuth();
  }, [tokens?.accessToken, user?.id]); // Only depend on token and user ID to avoid loops

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (!tokens || !isAuthenticated) {
      return;
    }

    // Validate tokens before setting up refresh
    if (!authService.validateTokens(tokens)) {
      console.log("Invalid tokens detected, clearing auth");
      clearAuth();
      return;
    }

    const performRefresh = async () => {
      // Prevent concurrent refresh attempts
      const currentState = useAuthStore.getState();
      if (currentState.tokenRefreshInProgress) {
        console.log("Token refresh already in progress, skipping");
        return;
      }

      if (!tokens?.refreshToken) {
        console.log("No refresh token available, clearing auth");
        clearAuth();
        return;
      }

      console.log("Starting automatic token refresh");
      useAuthStore.getState().setTokenRefreshInProgress(true);

      try {
        const response = await authService.refreshToken(tokens.refreshToken);
        const newTokens = authService.getTokensWithExpiration(
          response.access_token,
          response.refresh_token || tokens.refreshToken,
          response.expires_in
        );

        setTokens(newTokens);
        console.log("Automatic token refresh successful");
      } catch (error) {
        console.warn("Auto token refresh failed:", error);

        // Only clear auth and show toast for certain errors
        if (error instanceof ApiError) {
          switch (error.status) {
            case 401:
            case 403:
            case 404:
              // These are auth-related errors, clear auth
              clearAuth();
              toast({
                title: "Session Expired",
                description: "Your session has expired. Please log in again.",
                variant: "destructive",
              });
              break;
            case 429:
              // Rate limited, try again later
              console.log("Token refresh rate limited, will retry");
              break;
            case 500:
            case 503:
              // Server errors, don't clear auth immediately
              console.log("Server error during token refresh, will retry");
              break;
            default:
              // For other errors, clear auth
              clearAuth();
              toast({
                title: "Session Error",
                description: "Session error occurred. Please log in again.",
                variant: "destructive",
              });
          }
        } else if (
          error instanceof Error &&
          error.message.includes("Network Error")
        ) {
          // Network errors, don't clear auth
          console.log(
            "Network error during token refresh, will retry when connection is restored"
          );
        } else {
          // Unknown errors, clear auth
          clearAuth();
          toast({
            title: "Session Error",
            description: "An unexpected error occurred. Please log in again.",
            variant: "destructive",
          });
        }
      } finally {
        useAuthStore.getState().setTokenRefreshInProgress(false);
      }
    };

    // Check if token is already expired
    if (authService.isTokenExpired(tokens.expiresAt)) {
      console.log("Token is already expired, refreshing immediately");
      performRefresh();
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = tokens.expiresAt - now;
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry

    // If token is expiring soon, refresh immediately
    if (timeUntilExpiry <= refreshThreshold) {
      console.log(
        `Token expiring in ${Math.round(timeUntilExpiry / 1000)}s, refreshing immediately`
      );
      performRefresh();
      return;
    }

    // Set up automatic refresh timer
    const refreshTime = timeUntilExpiry - refreshThreshold;
    console.log(
      `Setting up token refresh in ${Math.round(refreshTime / 1000)}s`
    );

    const refreshTimer = setTimeout(() => {
      console.log("Token refresh timer triggered");
      performRefresh();
    }, refreshTime);

    return () => {
      clearTimeout(refreshTimer);
    };
  }, [tokens?.expiresAt, tokens?.refreshToken, isAuthenticated]); // Only depend on essential token properties

  const login = useCallback(
    async (credentials: LoginFormData) => {
      setLoading(true);
      setIsLoginLoading(true);
      try {
        const response = await authService.login(credentials);
        const authTokens = authService.getTokensWithExpiration(
          response.access_token,
          response.refresh_token,
          response.expires_in
        );

        setLogin(response.user, authTokens);

        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in.",
        });

        return response.user;
      } catch (error) {
        let message = "Login failed";
        let title = "Login Failed";

        if (error instanceof ApiError) {
          switch (error.status) {
            case 401:
              message =
                "Invalid email or password. Please check your credentials and try again.";
              break;
            case 404:
              message =
                "No account found with this email address. Please check your email or register for a new account.";
              break;
            case 422:
              message = "Please provide a valid email address and password.";
              break;
            case 429:
              message =
                "Too many login attempts. Please wait a few minutes before trying again.";
              title = "Rate Limited";
              break;
            case 500:
              message =
                "Server error. Please try again later or contact support if the problem persists.";
              title = "Server Error";
              break;
            case 503:
              message =
                "Service temporarily unavailable. Please try again in a few minutes.";
              title = "Service Unavailable";
              break;
            default:
              message =
                error.message || "An unexpected error occurred during login.";
          }
        } else if (error instanceof Error) {
          if (error.message.includes("Network Error")) {
            message =
              "Unable to connect to the server. Please check your internet connection and try again.";
            title = "Connection Error";
          } else {
            message = error.message;
          }
        } else {
          message = "An unexpected error occurred. Please try again.";
        }

        toast({
          title,
          description: message,
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
        setIsLoginLoading(false);
      }
    },
    [setLogin, setLoading, toast]
  );

  const register = useCallback(
    async (userData: RegisterFormData) => {
      setLoading(true);
      setIsRegisterLoading(true);
      try {
        const response = await authService.register(userData);
        const authTokens = authService.getTokensWithExpiration(
          response.access_token,
          response.refresh_token,
          response.expires_in
        );

        setLogin(response.user, authTokens);

        toast({
          title: "Account Created!",
          description:
            "Your account has been successfully created. Welcome to the platform!",
        });

        return response.user;
      } catch (error) {
        let message = "Registration failed";
        let title = "Registration Failed";

        if (error instanceof ApiError) {
          switch (error.status) {
            case 409:
              message =
                "An account with this email already exists. Please use a different email or try logging in instead.";
              title = "Account Already Exists";
              break;
            case 400:
              if (error.details?.message) {
                message = error.details.message;
              } else if (error.details?.errors) {
                // Handle validation errors
                const validationErrors = Object.values(
                  error.details.errors
                ).flat();
                message = `Please fix the following issues: ${validationErrors.join(", ")}`;
              } else {
                message =
                  "Please check your information and try again. Make sure all required fields are filled correctly.";
              }
              break;
            case 422:
              message =
                "Invalid data provided. Please check all fields and ensure your password meets the requirements.";
              break;
            case 429:
              message =
                "Too many registration attempts. Please wait a few minutes before trying again.";
              title = "Rate Limited";
              break;
            case 500:
              message =
                "Server error occurred during registration. Please try again later or contact support if the problem persists.";
              title = "Server Error";
              break;
            case 503:
              message =
                "Registration service is temporarily unavailable. Please try again in a few minutes.";
              title = "Service Unavailable";
              break;
            default:
              message =
                error.message ||
                "An unexpected error occurred during registration.";
          }
        } else if (error instanceof Error) {
          if (error.message.includes("Network Error")) {
            message =
              "Unable to connect to the server. Please check your internet connection and try again.";
            title = "Connection Error";
          } else {
            message = error.message;
          }
        } else {
          message = "An unexpected error occurred. Please try again.";
        }

        toast({
          title,
          description: message,
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
        setIsRegisterLoading(false);
      }
    },
    [setLogin, setLoading, toast]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      if (tokens?.refreshToken) {
        await authService.logout(tokens.refreshToken);
      }

      setLogout();

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      // Even if logout fails on server, clear local state
      setLogout();
      console.warn("Logout error:", error);
    } finally {
      setLoading(false);
    }
  }, [tokens, setLogout, setLoading, toast]);

  const refreshToken = useCallback(async () => {
    const currentTokens = useAuthStore.getState().tokens;

    if (!currentTokens?.refreshToken) {
      console.log("No refresh token available for manual refresh");
      clearAuth();
      return false;
    }

    // Prevent multiple simultaneous refresh attempts
    const currentState = useAuthStore.getState();
    if (currentState.tokenRefreshInProgress) {
      console.log("Token refresh already in progress, waiting...");

      // Wait for ongoing refresh to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const state = useAuthStore.getState();
          if (!state.tokenRefreshInProgress) {
            clearInterval(checkInterval);
            resolve(!!state.tokens && authService.validateTokens(state.tokens));
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 10000);
      });
    }

    console.log("Starting manual token refresh");
    useAuthStore.getState().setTokenRefreshInProgress(true);

    try {
      const response = await authService.refreshToken(
        currentTokens.refreshToken
      );
      const newTokens = authService.getTokensWithExpiration(
        response.access_token,
        response.refresh_token || currentTokens.refreshToken,
        response.expires_in
      );

      setTokens(newTokens);
      console.log("Manual token refresh successful");
      return true;
    } catch (error) {
      console.warn("Manual token refresh failed:", error);

      let message = "Your session has expired. Please log in again.";
      let shouldShowToast = true;
      let shouldClearAuth = true;

      if (error instanceof ApiError) {
        switch (error.status) {
          case 401:
            message = "Your session has expired. Please log in again.";
            break;
          case 403:
            message = "Invalid session. Please log in again.";
            break;
          case 404:
            message = "Session not found. Please log in again.";
            break;
          case 429:
            message = "Too many requests. Please wait a moment and try again.";
            shouldClearAuth = false; // Don't clear auth for rate limiting
            break;
          case 500:
            message = "Server error occurred. Please try logging in again.";
            shouldClearAuth = false; // Don't clear auth for server errors
            break;
          case 503:
            message =
              "Service temporarily unavailable. Please try again later.";
            shouldClearAuth = false; // Don't clear auth for service unavailable
            break;
          default:
            if (error.message.includes("Network Error")) {
              message =
                "Connection lost. Please check your internet connection.";
              shouldClearAuth = false;
              shouldShowToast = false;
            } else {
              message = "Session error occurred. Please log in again.";
            }
        }
      } else if (
        error instanceof Error &&
        error.message.includes("Network Error")
      ) {
        message =
          "Connection lost. Your session will be restored when connection is available.";
        shouldShowToast = false;
        shouldClearAuth = false;
      }

      if (shouldClearAuth) {
        clearAuth();
      }

      if (shouldShowToast) {
        toast({
          title: "Session Expired",
          description: message,
          variant: "destructive",
        });
      }

      return false;
    } finally {
      useAuthStore.getState().setTokenRefreshInProgress(false);
    }
  }, [setTokens, clearAuth, toast]);

  const verifyToken = useCallback(async () => {
    if (!tokens?.accessToken) {
      clearAuth();
      return false;
    }

    // Prevent multiple simultaneous verification attempts
    if (isVerifyLoading) {
      return false;
    }

    // Check if token is expired first
    if (authService.isTokenExpired(tokens.expiresAt)) {
      const tokenRefreshResult = await refreshToken();
      return tokenRefreshResult;
    }

    setIsVerifyLoading(true);
    try {
      const verifiedUser = await authService.verifyToken(tokens.accessToken);
      setUser(verifiedUser);
      return true;
    } catch (error) {
      console.warn("Token verification failed:", error);

      if (error instanceof ApiError) {
        switch (error.status) {
          case 401:
            // Token is invalid, try to refresh
            const authRefreshResult = await refreshToken();
            return authRefreshResult;
          case 403:
            // Token is forbidden, clear auth
            clearAuth();
            toast({
              title: "Access Denied",
              description:
                "Your account access has been revoked. Please contact support.",
              variant: "destructive",
            });
            break;
          case 404:
            // User not found, clear auth
            clearAuth();
            toast({
              title: "Account Not Found",
              description:
                "Your account could not be found. Please register again.",
              variant: "destructive",
            });
            break;
          case 500:
            // Server error, don't clear auth immediately
            console.error("Server error during token verification");
            break;
          default:
            // For other errors, try to refresh token
            const fallbackRefreshResult = await refreshToken();
            return fallbackRefreshResult;
        }
      } else {
        // For network errors or other issues, don't clear auth immediately
        console.error(
          "Network or unexpected error during token verification:",
          error
        );
      }

      return false;
    } finally {
      setIsVerifyLoading(false);
    }
  }, [tokens, setUser, clearAuth, refreshToken, isVerifyLoading, toast]);

  const hasRole = useCallback(
    (role: string | string[]) => {
      if (!user) return false;

      if (Array.isArray(role)) {
        return role.includes(user.role);
      }

      return user.role === role;
    },
    [user]
  );

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;

      // Define role-based permissions
      const rolePermissions = {
        admin: ["*"], // Admin has all permissions
        recruiter: [
          "candidates:read",
          "candidates:write",
          "applications:read",
          "applications:write",
          "jobs:read",
          "jobs:write",
          "communications:read",
          "communications:write",
          "analytics:read",
        ],
        hiring_manager: [
          "candidates:read",
          "applications:read",
          "applications:write",
          "jobs:read",
          "analytics:read",
        ],
      };

      const userPermissions = rolePermissions[user.role] || [];

      // Admin has all permissions
      if (userPermissions.includes("*")) return true;

      return userPermissions.includes(permission);
    },
    [user]
  );

  return {
    // State
    user,
    tokens,
    isAuthenticated,
    isLoading,

    // Specific loading states
    isLoginLoading,
    isRegisterLoading,
    isRefreshLoading: tokenRefreshInProgress,
    isVerifyLoading,

    // Actions
    login,
    register,
    logout,
    refreshToken,
    verifyToken,

    // Utilities
    hasRole,
    hasPermission,
  };
};
