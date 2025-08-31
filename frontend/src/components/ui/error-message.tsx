"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ErrorHandler, ErrorInfo } from "@/lib/error-handler";
import {
  AlertTriangle,
  AlertCircle,
  XCircle,
  Info,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "./button";

const errorMessageVariants = cva(
  "flex items-start gap-3 p-4 rounded-lg border",
  {
    variants: {
      severity: {
        low: "bg-blue-50 border-blue-200 text-blue-800",
        medium: "bg-yellow-50 border-yellow-200 text-yellow-800",
        high: "bg-orange-50 border-orange-200 text-orange-800",
        critical: "bg-red-50 border-red-200 text-red-800",
      },
    },
    defaultVariants: {
      severity: "medium",
    },
  }
);

const iconVariants = cva("h-5 w-5 mt-0.5 flex-shrink-0", {
  variants: {
    severity: {
      low: "text-blue-500",
      medium: "text-yellow-500",
      high: "text-orange-500",
      critical: "text-red-500",
    },
  },
  defaultVariants: {
    severity: "medium",
  },
});

interface ErrorMessageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof errorMessageVariants> {
  error?: Error | unknown;
  errorInfo?: ErrorInfo;
  showRetry?: boolean;
  onRetry?: () => void;
  showDetails?: boolean;
  compact?: boolean;
  children?: React.ReactNode;
}

const ErrorMessage = React.forwardRef<HTMLDivElement, ErrorMessageProps>(
  (
    {
      className,
      severity,
      error,
      errorInfo,
      showRetry = false,
      onRetry,
      showDetails = false,
      compact = false,
      ...props
    },
    ref
  ) => {
    const [showFullDetails, setShowFullDetails] = React.useState(false);

    // Get error info if not provided
    const resolvedErrorInfo =
      errorInfo || (error ? ErrorHandler.handleError(error) : null);
    const resolvedSeverity =
      severity || resolvedErrorInfo?.severity || "medium";

    const getIcon = () => {
      switch (resolvedSeverity) {
        case "low":
          return (
            <Info className={iconVariants({ severity: resolvedSeverity })} />
          );
        case "medium":
          return (
            <AlertCircle
              className={iconVariants({ severity: resolvedSeverity })}
            />
          );
        case "high":
          return (
            <AlertTriangle
              className={iconVariants({ severity: resolvedSeverity })}
            />
          );
        case "critical":
          return (
            <XCircle className={iconVariants({ severity: resolvedSeverity })} />
          );
        default:
          return (
            <AlertCircle
              className={iconVariants({ severity: resolvedSeverity })}
            />
          );
      }
    };

    if (!resolvedErrorInfo && !error) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          errorMessageVariants({ severity: resolvedSeverity }),
          className
        )}
        {...props}
      >
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="font-medium">
            {resolvedErrorInfo?.title || "Error"}
          </div>
          <div className={cn("text-sm mt-1", compact && "text-xs")}>
            {resolvedErrorInfo?.message || "An unexpected error occurred"}
          </div>
          {resolvedErrorInfo?.action && !compact && (
            <div className="text-sm mt-2 opacity-90">
              {resolvedErrorInfo.action}
            </div>
          )}

          {showRetry && resolvedErrorInfo?.retryable && onRetry && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="h-8 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            </div>
          )}

          {showDetails && error && process.env.NODE_ENV === "development" && (
            <div className="mt-3">
              <button
                onClick={() => setShowFullDetails(!showFullDetails)}
                className="text-xs underline opacity-70 hover:opacity-100"
              >
                {showFullDetails ? "Hide" : "Show"} technical details
              </button>
              {showFullDetails && (
                <pre className="mt-2 text-xs bg-black/5 p-2 rounded overflow-auto max-h-32">
                  {error instanceof Error
                    ? error.stack || error.message
                    : String(error)}
                </pre>
              )}
            </div>
          )}

          {/* Render children if provided */}
          {props.children}
        </div>
      </div>
    );
  }
);

ErrorMessage.displayName = "ErrorMessage";

// Specific error message components for common scenarios
interface AuthErrorMessageProps
  extends Omit<ErrorMessageProps, "error" | "errorInfo"> {
  type:
    | "invalid-credentials"
    | "session-expired"
    | "access-denied"
    | "registration-failed";
  onLogin?: () => void;
  onRetry?: () => void;
}

const AuthErrorMessage: React.FC<AuthErrorMessageProps> = ({
  type,
  onLogin,
  onRetry,
  ...props
}) => {
  const errorMap = {
    "invalid-credentials": {
      title: "Invalid Credentials",
      message: "The email or password you entered is incorrect.",
      action: "Please check your credentials and try again.",
      severity: "medium" as const,
      retryable: true,
    },
    "session-expired": {
      title: "Session Expired",
      message: "Your session has expired for security reasons.",
      action: "Please log in again to continue.",
      severity: "medium" as const,
      retryable: false,
    },
    "access-denied": {
      title: "Access Denied",
      message: "You don't have permission to access this resource.",
      action: "Contact your administrator if you believe this is an error.",
      severity: "high" as const,
      retryable: false,
    },
    "registration-failed": {
      title: "Registration Failed",
      message: "We couldn't create your account at this time.",
      action: "Please try again or contact support if the problem persists.",
      severity: "high" as const,
      retryable: true,
    },
  };

  const errorInfo = errorMap[type];

  return (
    <ErrorMessage
      errorInfo={errorInfo}
      severity={errorInfo.severity}
      showRetry={errorInfo.retryable}
      onRetry={errorInfo.retryable ? onRetry : undefined}
      {...props}
    >
      {type === "session-expired" && onLogin && (
        <div className="mt-3">
          <Button size="sm" onClick={onLogin} className="h-8 text-xs">
            Log In Again
          </Button>
        </div>
      )}
    </ErrorMessage>
  );
};

// Network error message component
interface NetworkErrorMessageProps
  extends Omit<ErrorMessageProps, "error" | "errorInfo"> {
  onRetry?: () => void;
  isRetrying?: boolean;
}

const NetworkErrorMessage: React.FC<NetworkErrorMessageProps> = ({
  onRetry,
  isRetrying = false,
  ...props
}) => {
  const errorInfo = {
    title: "Connection Error",
    message: "Unable to connect to the server.",
    action: "Please check your internet connection and try again.",
    severity: "high" as const,
    retryable: true,
  };

  return (
    <ErrorMessage
      errorInfo={errorInfo}
      severity="high"
      showRetry={true}
      onRetry={onRetry}
      {...props}
    >
      {isRetrying && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Retrying connection...
        </div>
      )}
    </ErrorMessage>
  );
};

// Validation error message component
interface ValidationErrorMessageProps
  extends Omit<ErrorMessageProps, "error" | "errorInfo"> {
  field?: string;
  errors?: string[];
}

const ValidationErrorMessage: React.FC<ValidationErrorMessageProps> = ({
  field,
  errors = [],
  ...props
}) => {
  if (errors.length === 0) return null;

  const errorInfo = {
    title: field ? `${field} Error` : "Validation Error",
    message:
      errors.length === 1
        ? errors[0]
        : `${errors.length} validation errors found`,
    action: "Please correct the highlighted fields and try again.",
    severity: "medium" as const,
    retryable: true,
  };

  return (
    <ErrorMessage
      errorInfo={errorInfo}
      severity="medium"
      compact={errors.length === 1}
      {...props}
    >
      {errors.length > 1 && (
        <ul className="mt-2 text-sm space-y-1">
          {errors.map((error, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>{error}</span>
            </li>
          ))}
        </ul>
      )}
    </ErrorMessage>
  );
};

export {
  ErrorMessage,
  AuthErrorMessage,
  NetworkErrorMessage,
  ValidationErrorMessage,
  errorMessageVariants,
};
export type {
  ErrorMessageProps,
  AuthErrorMessageProps,
  NetworkErrorMessageProps,
  ValidationErrorMessageProps,
};
