"use client";

import * as React from "react";
import { Button } from "./button";
import { useToast } from "@/hooks/use-toast";
import { ErrorHandler } from "@/lib/error-handler";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  Wifi,
  Server,
} from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: "page" | "component" | "critical";
  showRetry?: boolean;
  maxRetries?: number;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({ errorInfo });

    // Log error using error handler
    ErrorHandler.logError(error, {
      componentStack: errorInfo.componentStack,
      level: this.props.level || "component",
      retryCount: this.state.retryCount,
    });

    this.props.onError?.(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  retryWithDelay = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      return;
    }

    const delay = ErrorHandler.getRetryDelay(retryCount);

    this.retryTimeoutId = setTimeout(() => {
      this.setState((prevState) => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    }, delay);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            {...(this.state.error && { error: this.state.error })}
            resetError={this.resetError}
          />
        );
      }

      const errorInfo = this.state.error
        ? ErrorHandler.handleError(this.state.error)
        : null;
      const level = this.props.level || "component";

      if (level === "critical") {
        return (
          <CriticalErrorFallback
            error={this.state.error}
            errorInfo={errorInfo}
            resetError={this.resetError}
          />
        );
      }

      if (level === "page") {
        return (
          <PageErrorFallback
            error={this.state.error}
            errorInfo={errorInfo}
            resetError={this.resetError}
            retryWithDelay={this.retryWithDelay}
            showRetry={this.props.showRetry !== false}
            retryCount={this.state.retryCount}
            maxRetries={this.props.maxRetries || 3}
          />
        );
      }

      return (
        <ComponentErrorFallback
          error={this.state.error}
          errorInfo={errorInfo}
          resetError={this.resetError}
          retryWithDelay={this.retryWithDelay}
          showRetry={this.props.showRetry !== false}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries || 3}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: any;
  resetError: () => void;
  retryWithDelay?: () => void;
  showRetry?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

const ComponentErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  retryWithDelay,
  showRetry = true,
  retryCount = 0,
  maxRetries = 3,
}) => {
  const getErrorIcon = () => {
    if (
      error?.message.includes("network") ||
      error?.message.includes("fetch")
    ) {
      return <Wifi className="h-8 w-8 text-orange-500" />;
    }
    if (error?.message.includes("server") || error?.message.includes("500")) {
      return <Server className="h-8 w-8 text-red-500" />;
    }
    return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
  };

  return (
    <div className="flex items-center justify-center min-h-[200px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">{getErrorIcon()}</div>
          <CardTitle className="text-lg">
            {errorInfo?.title || "Component Error"}
          </CardTitle>
          <CardDescription>
            {errorInfo?.message || "This component encountered an error"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorInfo?.action && (
            <p className="text-sm text-muted-foreground text-center">
              {errorInfo.action}
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={resetError} variant="outline" className="flex-1">
              Try again
            </Button>
            {showRetry && errorInfo?.retryable && retryCount < maxRetries && (
              <Button onClick={retryWithDelay} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry ({maxRetries - retryCount} left)
              </Button>
            )}
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

const PageErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  retryWithDelay,
  showRetry = true,
  retryCount = 0,
  maxRetries = 3,
}) => (
  <div className="flex items-center justify-center min-h-screen p-4">
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <CardTitle className="text-xl">
          {errorInfo?.title || "Page Error"}
        </CardTitle>
        <CardDescription>
          {errorInfo?.message ||
            "This page encountered an error and couldn't load properly"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorInfo?.action && (
          <p className="text-sm text-muted-foreground text-center">
            {errorInfo.action}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            className="flex-1"
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
          <Button onClick={resetError} className="flex-1">
            Try again
          </Button>
        </div>

        {showRetry && errorInfo?.retryable && retryCount < maxRetries && (
          <Button
            onClick={retryWithDelay}
            variant="secondary"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Auto-retry in a moment ({maxRetries - retryCount} attempts left)
          </Button>
        )}

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

const CriticalErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
}) => (
  <div className="flex items-center justify-center min-h-screen p-4 bg-red-50">
    <Card className="w-full max-w-lg border-red-200">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Bug className="h-16 w-16 text-red-600" />
        </div>
        <CardTitle className="text-2xl text-red-800">
          Critical System Error
        </CardTitle>
        <CardDescription className="text-red-600">
          The application has encountered a critical error and needs to be
          restarted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-red-100 p-4 rounded-lg">
          <p className="text-sm text-red-800">
            Please refresh the page or contact support if this error persists.
            Your work may not have been saved.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => window.location.reload()}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            className="flex-1"
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>

        {error && process.env.NODE_ENV === "development" && (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-red-700">
              Error details (Development)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-red-600 bg-red-50 p-2 rounded">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  </div>
);

// Default fallback for backward compatibility
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <ComponentErrorFallback {...props} />
);

const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export {
  ErrorBoundary,
  DefaultErrorFallback,
  ComponentErrorFallback,
  PageErrorFallback,
  CriticalErrorFallback,
  withErrorBoundary,
};
export type { ErrorBoundaryProps, ErrorFallbackProps };
