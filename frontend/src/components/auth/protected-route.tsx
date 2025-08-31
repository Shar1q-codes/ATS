"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loading } from "@/components/ui/loading";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
  fallbackPath?: string;
  loadingComponent?: ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallbackPath = "/auth/login",
  loadingComponent,
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    isLoading,
    user,
    hasRole,
    hasPermission,
    verifyToken,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Verify token on mount if we think we're authenticated
    if (isAuthenticated && user) {
      verifyToken();
    }
  }, [isAuthenticated, user, verifyToken]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(fallbackPath);
    }
  }, [isAuthenticated, isLoading, router, fallbackPath]);

  // Show loading while checking authentication
  if (isLoading) {
    return loadingComponent || <Loading />;
  }

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            You don't have the required permissions to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Check permission requirements
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            You don't have the required permissions to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Higher-order component version
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, "children">
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
