import { ApiError } from "./api-client";

export interface ErrorInfo {
  title: string;
  message: string;
  action?: string;
  retryable: boolean;
  severity: "low" | "medium" | "high" | "critical";
}

export class ErrorHandler {
  private static errorMap: Record<string, ErrorInfo> = {
    // Authentication errors
    AUTH_INVALID_CREDENTIALS: {
      title: "Invalid Credentials",
      message:
        "The email or password you entered is incorrect. Please try again.",
      action: "Please check your credentials and try again.",
      retryable: true,
      severity: "medium",
    },
    AUTH_TOKEN_EXPIRED: {
      title: "Session Expired",
      message: "Your session has expired. Please log in again.",
      action: "You will be redirected to the login page.",
      retryable: false,
      severity: "medium",
    },
    AUTH_INSUFFICIENT_PERMISSIONS: {
      title: "Access Denied",
      message: "You do not have permission to perform this action.",
      action: "Contact your administrator if you believe this is an error.",
      retryable: false,
      severity: "medium",
    },
    AUTH_ACCOUNT_LOCKED: {
      title: "Account Locked",
      message:
        "Your account has been temporarily locked due to multiple failed login attempts.",
      action: "Please try again later or contact support.",
      retryable: false,
      severity: "high",
    },
    AUTH_INVALID_REFRESH_TOKEN: {
      title: "Session Invalid",
      message: "Your session is no longer valid. Please log in again.",
      action: "You will be redirected to the login page.",
      retryable: false,
      severity: "medium",
    },
    ORGANIZATION_CREATION_FAILED: {
      title: "Registration Error",
      message: "Failed to create your organization during registration.",
      action: "Please try registering again or contact support.",
      retryable: true,
      severity: "high",
    },

    // Validation errors
    VALIDATION_ERROR: {
      title: "Invalid Input",
      message: "Please check the information you entered and try again.",
      action: "Correct the highlighted fields and resubmit.",
      retryable: true,
      severity: "low",
    },
    VALIDATION_EMAIL_EXISTS: {
      title: "Email Already Exists",
      message: "An account with this email address already exists.",
      action: "Try logging in or use a different email address.",
      retryable: true,
      severity: "medium",
    },
    VALIDATION_WEAK_PASSWORD: {
      title: "Weak Password",
      message: "Your password does not meet the security requirements.",
      action:
        "Please choose a stronger password with at least 8 characters, including uppercase, lowercase, and numbers.",
      retryable: true,
      severity: "medium",
    },

    // File upload errors
    FILE_TOO_LARGE: {
      title: "File Too Large",
      message: "The file you selected is too large to upload.",
      action: "Please select a file smaller than 10MB.",
      retryable: true,
      severity: "medium",
    },
    FILE_INVALID_TYPE: {
      title: "Invalid File Type",
      message: "The file type you selected is not supported.",
      action: "Please upload a PDF, DOC, or DOCX file.",
      retryable: true,
      severity: "medium",
    },
    FILE_UPLOAD_FAILED: {
      title: "Upload Failed",
      message: "There was an error uploading your file.",
      action: "Please try again or contact support if the problem persists.",
      retryable: true,
      severity: "medium",
    },

    // Data errors
    RESOURCE_NOT_FOUND: {
      title: "Not Found",
      message: "The requested resource could not be found.",
      action: "Please check the URL or go back to the previous page.",
      retryable: false,
      severity: "medium",
    },
    RESOURCE_ALREADY_EXISTS: {
      title: "Already Exists",
      message: "A resource with this information already exists.",
      action: "Please modify your input or update the existing resource.",
      retryable: true,
      severity: "medium",
    },
    RESOURCE_IN_USE: {
      title: "Resource In Use",
      message:
        "This resource cannot be deleted because it is currently being used.",
      action: "Remove all dependencies before attempting to delete.",
      retryable: false,
      severity: "medium",
    },

    // Network errors
    NETWORK_ERROR: {
      title: "Connection Error",
      message: "Unable to connect to the server.",
      action: "Please check your internet connection and try again.",
      retryable: true,
      severity: "high",
    },
    TIMEOUT_ERROR: {
      title: "Request Timeout",
      message: "The request took too long to complete.",
      action: "Please try again. If the problem persists, contact support.",
      retryable: true,
      severity: "medium",
    },

    // Server errors
    SERVER_ERROR: {
      title: "Server Error",
      message: "An unexpected error occurred on the server.",
      action:
        "Please try again later. If the problem persists, contact support.",
      retryable: true,
      severity: "high",
    },
    SERVICE_UNAVAILABLE: {
      title: "Service Unavailable",
      message: "The service is temporarily unavailable.",
      action: "Please try again in a few minutes.",
      retryable: true,
      severity: "high",
    },
    RATE_LIMIT_EXCEEDED: {
      title: "Too Many Requests",
      message: "You have made too many requests. Please slow down.",
      action: "Wait a moment before trying again.",
      retryable: true,
      severity: "medium",
    },

    // AI/Processing errors
    AI_PROCESSING_FAILED: {
      title: "Processing Failed",
      message: "Unable to process your request using AI services.",
      action: "Please try again or contact support if the issue persists.",
      retryable: true,
      severity: "medium",
    },
    RESUME_PARSING_FAILED: {
      title: "Resume Parsing Failed",
      message: "We were unable to extract information from the resume.",
      action:
        "Please ensure the file is readable and try again, or enter the information manually.",
      retryable: true,
      severity: "medium",
    },
    MATCHING_ENGINE_ERROR: {
      title: "Matching Error",
      message: "Unable to calculate candidate match scores.",
      action: "Please try again later or contact support.",
      retryable: true,
      severity: "medium",
    },
  };

  static handleError(error: ApiError | Error | unknown): ErrorInfo {
    // Handle ApiError
    if (this.isApiError(error)) {
      return this.handleApiError(error);
    }

    // Handle standard Error
    if (error instanceof Error) {
      return this.handleStandardError(error);
    }

    // Handle unknown errors
    return this.handleUnknownError(error);
  }

  private static isApiError(error: any): error is ApiError {
    return (
      error &&
      typeof error === "object" &&
      "message" in error &&
      "status" in error
    );
  }

  private static handleApiError(error: ApiError): ErrorInfo {
    // Check for specific error codes first
    if (error.code && this.errorMap[error.code]) {
      return this.errorMap[error.code];
    }

    // Handle by HTTP status code
    switch (error.status) {
      case 400:
        return this.errorMap["VALIDATION_ERROR"];
      case 401:
        return this.errorMap["AUTH_TOKEN_EXPIRED"];
      case 403:
        return this.errorMap["AUTH_INSUFFICIENT_PERMISSIONS"];
      case 404:
        return this.errorMap["RESOURCE_NOT_FOUND"];
      case 409:
        return this.errorMap["RESOURCE_ALREADY_EXISTS"];
      case 413:
        return this.errorMap["FILE_TOO_LARGE"];
      case 415:
        return this.errorMap["FILE_INVALID_TYPE"];
      case 429:
        return this.errorMap["RATE_LIMIT_EXCEEDED"];
      case 500:
        return this.errorMap["SERVER_ERROR"];
      case 503:
        return this.errorMap["SERVICE_UNAVAILABLE"];
      default:
        return {
          title: "Error",
          message: error.message || "An unexpected error occurred",
          action:
            "Please try again or contact support if the problem persists.",
          retryable: true,
          severity: "medium",
        };
    }
  }

  private static handleStandardError(error: Error): ErrorInfo {
    // Handle specific error types
    if (error.name === "NetworkError" || error.message.includes("network")) {
      return this.errorMap["NETWORK_ERROR"];
    }

    if (error.name === "TimeoutError" || error.message.includes("timeout")) {
      return this.errorMap["TIMEOUT_ERROR"];
    }

    // Generic error handling
    return {
      title: "Error",
      message: error.message || "An unexpected error occurred",
      action: "Please try again or contact support if the problem persists.",
      retryable: true,
      severity: "medium",
    };
  }

  private static handleUnknownError(error: unknown): ErrorInfo {
    console.error("Unknown error:", error);

    return {
      title: "Unexpected Error",
      message: "An unexpected error occurred",
      action:
        "Please refresh the page and try again. Contact support if the problem persists.",
      retryable: true,
      severity: "high",
    };
  }

  static getRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  static shouldRetry(
    error: ApiError | Error,
    attempt: number,
    maxAttempts = 3
  ): boolean {
    if (attempt >= maxAttempts) return false;

    const errorInfo = this.handleError(error);
    if (!errorInfo.retryable) return false;

    // Don't retry client errors (4xx) except for specific cases
    if (this.isApiError(error) && error.status) {
      const status = error.status;
      if (status >= 400 && status < 500) {
        // Only retry these 4xx errors
        return [408, 429].includes(status);
      }
    }

    return true;
  }

  static logError(
    error: ApiError | Error | unknown,
    context?: Record<string, any>
  ): void {
    const errorInfo = this.handleError(error);

    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        title: errorInfo.title,
        message: errorInfo.message,
        severity: errorInfo.severity,
      },
      context,
      stack: error instanceof Error ? error.stack : undefined,
    };

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[Error Handler]", logData);
    }

    // In production, you might want to send this to an error tracking service
    // like Sentry, LogRocket, or your own logging service
    if (
      process.env.NODE_ENV === "production" &&
      errorInfo.severity === "critical"
    ) {
      // Example: Send to error tracking service
      // errorTrackingService.captureError(error, logData);
    }
  }
}

// Utility function for components
export const handleError = (
  error: unknown,
  context?: Record<string, any>
): ErrorInfo => {
  ErrorHandler.logError(error, context);
  return ErrorHandler.handleError(error);
};
