import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "recruiter" | "hiring_manager";
  companyId?: string;
  organizationId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  issuedAt: number; // Track when tokens were issued
  refreshExpiresAt?: number; // Track refresh token expiration
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastTokenRefresh: number | null; // Track last refresh attempt
  tokenRefreshInProgress: boolean; // Prevent concurrent refresh attempts

  // Actions
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  setTokenRefreshInProgress: (inProgress: boolean) => void;
  isTokenValid: () => boolean;
  isTokenExpiringSoon: (thresholdMinutes?: number) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      lastTokenRefresh: null,
      tokenRefreshInProgress: false,

      setUser: (user: User) => {
        const currentState = get();
        set({
          user,
          isAuthenticated: !!(
            user &&
            currentState.tokens &&
            currentState.tokens.expiresAt > Date.now()
          ),
        });
      },

      setTokens: (tokens: AuthTokens) => {
        const currentState = get();
        const now = Date.now();

        // Validate token before setting
        if (
          !tokens.accessToken ||
          !tokens.refreshToken ||
          tokens.expiresAt <= now
        ) {
          console.warn("Invalid tokens provided to setTokens");
          return;
        }

        set({
          tokens,
          lastTokenRefresh: now,
          tokenRefreshInProgress: false,
          // Only set authenticated if we have both valid tokens and user
          isAuthenticated: !!(
            tokens &&
            tokens.expiresAt > now &&
            currentState.user
          ),
        });
      },

      login: (user: User, tokens: AuthTokens) => {
        const now = Date.now();

        // Validate tokens before login
        if (
          !tokens.accessToken ||
          !tokens.refreshToken ||
          tokens.expiresAt <= now
        ) {
          console.error("Invalid tokens provided to login");
          return;
        }

        set({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
          lastTokenRefresh: now,
          tokenRefreshInProgress: false,
        });
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          lastTokenRefresh: null,
          tokenRefreshInProgress: false,
        });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      clearAuth: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          lastTokenRefresh: null,
          tokenRefreshInProgress: false,
        });
      },

      setTokenRefreshInProgress: (inProgress: boolean) => {
        set({ tokenRefreshInProgress: inProgress });
      },

      isTokenValid: () => {
        const state = get();
        if (!state.tokens) return false;

        const now = Date.now();
        return state.tokens.expiresAt > now;
      },

      isTokenExpiringSoon: (thresholdMinutes: number = 5) => {
        const state = get();
        if (!state.tokens) return false;

        const now = Date.now();
        const threshold = thresholdMinutes * 60 * 1000;
        return state.tokens.expiresAt - now <= threshold;
      },
    }),
    {
      name: "auth-storage",
      version: 2, // Increment version to handle schema changes
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
        lastTokenRefresh: state.lastTokenRefresh,
      }),
      // Enhanced rehydration with better validation
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        const now = Date.now();

        // Validate stored tokens on rehydration
        if (state.tokens) {
          // Check if access token is expired
          if (state.tokens.expiresAt <= now) {
            console.log("Stored access token is expired, clearing tokens");
            state.tokens = null;
            state.isAuthenticated = false;
            state.lastTokenRefresh = null;
            return;
          }

          // Check if refresh token is expired (if we have that info)
          if (
            state.tokens.refreshExpiresAt &&
            state.tokens.refreshExpiresAt <= now
          ) {
            console.log("Stored refresh token is expired, clearing tokens");
            state.tokens = null;
            state.isAuthenticated = false;
            state.lastTokenRefresh = null;
            return;
          }

          // Validate token format
          if (!state.tokens.accessToken || !state.tokens.refreshToken) {
            console.log("Invalid token format in storage, clearing tokens");
            state.tokens = null;
            state.isAuthenticated = false;
            state.lastTokenRefresh = null;
            return;
          }

          // If we have valid tokens but no user, we'll need to verify
          if (!state.user) {
            state.isAuthenticated = false;
          }
        }

        // Clear authentication if no tokens
        if (!state.tokens) {
          state.isAuthenticated = false;
          state.user = null;
          state.lastTokenRefresh = null;
        }
      },
      // Handle storage events for cross-tab synchronization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            return JSON.parse(str);
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
          // Dispatch custom event for cross-tab sync
          window.dispatchEvent(
            new CustomEvent("auth-storage-change", {
              detail: { name, value },
            })
          );
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
          window.dispatchEvent(
            new CustomEvent("auth-storage-change", {
              detail: { name, value: null },
            })
          );
        },
      },
    }
  )
);
