"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { User } from "@/lib/auth-store";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const {
    user,
    isAuthenticated,
    isLoading,
    hasRole,
    hasPermission,
    verifyToken,
  } = useAuth();

  // Verify token on app initialization
  useEffect(() => {
    if (isAuthenticated && user) {
      verifyToken();
    }
  }, []);

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
