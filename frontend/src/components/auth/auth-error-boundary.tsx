"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ErrorBoundary,
  ErrorBoundaryProps,
} from "@/components/ui/error-boundary";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ErrorHandler } from "@/lib/error-handler";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, LogIn, RefreshCw, AlertTriangle } from "lucide-react";

interface AuthErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

const AuthErrorFallback: React.FC<AuthErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const errorInfo = error ? ErrorHandler.handleError(error) : null;

  const handleRetryAuth = () => {
    resetError();
    // Clear any stored auth data that might be corrupted
    localStorage.removeItem("auth-storage");
    sessionStorage.removeItem("auth-storage");
    router.push("/auth/login");
  };

  const handleGoToLogin = () => {
    localStorage.removeItem("auth-storage");
    sessionStorage.removeItem("auth-storage");
    router.push("/auth/login");
  };

  const handleGoToRegister = () => {
    localStorage.removeItem("auth-storage");
    sessionStorage.removeItem("auth-storage");
    router.push("/auth/register");
  };

  const getAuthErrorIcon = () => {
    if (
      error?.message.includes("token") ||
      error?.message.includes("session")
    ) {
      return <Shield className="h-8 w-8 text-orange-500" />;
    }
    if (
      error?.message.includes("credentials") ||
      error?.message.includes("login")
    ) {
      return <LogIn className="h-8 w-8 text-red-500" />;
    }
    return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
  };

  const getAuthErrorTitle = () => {
    if (
      error?.message.includes("token") ||
      error?.message.includes("session")
    ) {
      return "Session Error";
    }
    if (error?.message.includes("credentials")) {
      return "Authentication Failed";
    }
    if (error?.message.includes("network")) {
      return "Connection Error";
    }
    return errorInfo?.title || "Authentication Error";
  };

  const getAuthErrorMessage = () => {
    if (
      error?.message.includes("token") ||
      error?.message.includes("session")
    ) {
      return "Your session has expired or is invalid. Please log in again.";
    }
    if (error?.message.includes("credentials")) {
      return "The credentials you provided are incorrect. Please try again.";
    }
    if (error?.message.includes("network")) {
      return "Unable to connect to the authentication server. Please check your connection.";
    }
    return (
      errorInfo?.message ||
      "An authentication error occurred. Please try logging in again."
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">{getAuthErrorIcon()}</div>
          <CardTitle className="text-xl">{getAuthErrorTitle()}</CardTitle>
          <CardDescription>{getAuthErrorMessage()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorInfo?.action && (
            <p className="text-sm text-muted-foreground text-center">
              {errorInfo.action}
            </p>
          )}

          <div className="space-y-2">
            <Button onClick={handleGoToLogin} className="w-full">
              <LogIn className="h-4 w-4 mr-2" />
              Go to Login
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={handleRetryAuth}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button
                onClick={handleGoToRegister}
                variant="outline"
                className="flex-1"
              >
                Sign Up
              </Button>
            </div>
          </div>

          {error && process.env.NODE_ENV === "development" && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                Error details
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface AuthErrorBoundaryProps extends Omit<ErrorBoundaryProps, "fallback"> {
  children: React.ReactNode;
}

export const AuthErrorBoundary: React.FC<AuthErrorBoundaryProps> = ({
  children,
  onError,
  ...props
}) => {
  const { toast } = useToast();

  const handleAuthError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log the auth error
    ErrorHandler.logError(error, {
      context: "authentication",
      componentStack: errorInfo.componentStack,
    });

    // Show toast notification for auth errors
    const errorDetails = ErrorHandler.handleError(error);
    toast({
      title: errorDetails.title,
      description: errorDetails.message,
      variant: "destructive",
    });

    // Call the original onError if provided
    onError?.(error, errorInfo);
  };

  return (
    <ErrorBoundary
      {...props}
      fallback={AuthErrorFallback}
      onError={handleAuthError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default AuthErrorBoundary;
