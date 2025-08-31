import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

/**
 * Hook to handle cross-tab authentication synchronization
 * This ensures that auth state is synchronized across browser tabs
 */
export const useAuthSync = () => {
  const { clearAuth, setUser, setTokens } = useAuthStore();

  useEffect(() => {
    const handleStorageChange = (event: CustomEvent) => {
      const { name, value } = event.detail;

      if (name === "auth-storage") {
        const currentState = useAuthStore.getState();

        if (!value) {
          // Auth was cleared in another tab
          if (currentState.isAuthenticated) {
            console.log("Auth cleared in another tab, synchronizing");
            clearAuth();
          }
        } else {
          // Auth was updated in another tab
          const newState = value.state;

          // Only sync if the state is different
          if (
            newState.user &&
            (!currentState.user || currentState.user.id !== newState.user.id)
          ) {
            console.log("User updated in another tab, synchronizing");
            setUser(newState.user);
          }

          if (
            newState.tokens &&
            (!currentState.tokens ||
              currentState.tokens.accessToken !== newState.tokens.accessToken)
          ) {
            console.log("Tokens updated in another tab, synchronizing");
            setTokens(newState.tokens);
          }

          if (!newState.isAuthenticated && currentState.isAuthenticated) {
            console.log("Auth state cleared in another tab, synchronizing");
            clearAuth();
          }
        }
      }
    };

    // Listen for custom storage events
    window.addEventListener(
      "auth-storage-change",
      handleStorageChange as EventListener
    );

    // Also listen for standard storage events as fallback
    const handleStandardStorageChange = (event: StorageEvent) => {
      if (event.key === "auth-storage" && event.newValue !== event.oldValue) {
        const currentState = useAuthStore.getState();

        if (!event.newValue) {
          // Auth was cleared
          if (currentState.isAuthenticated) {
            console.log(
              "Auth cleared in another tab (standard event), synchronizing"
            );
            clearAuth();
          }
        }
      }
    };

    window.addEventListener("storage", handleStandardStorageChange);

    return () => {
      window.removeEventListener(
        "auth-storage-change",
        handleStorageChange as EventListener
      );
      window.removeEventListener("storage", handleStandardStorageChange);
    };
  }, [clearAuth, setUser, setTokens]);

  // Handle page visibility changes to refresh tokens when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const state = useAuthStore.getState();

        // If we have tokens and are authenticated, check if they need refresh
        if (state.tokens && state.isAuthenticated) {
          const now = Date.now();
          const timeUntilExpiry = state.tokens.expiresAt - now;
          const refreshThreshold = 5 * 60 * 1000; // 5 minutes

          // If token is expired or expiring soon, trigger a refresh check
          if (timeUntilExpiry <= refreshThreshold) {
            console.log("Tab became active and token needs refresh");
            // The auto-refresh effect in useAuth will handle this
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
};
