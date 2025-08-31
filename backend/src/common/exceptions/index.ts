// Auth exceptions
export * from './auth.exceptions';

// Validation exceptions
export * from './validation.exceptions';

// Business logic exceptions
export * from './business.exceptions';

// Common error response types
export interface ErrorDetails {
  field?: string;
  value?: any;
  constraint?: string;
  children?: ErrorDetails[];
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    requestId?: string;
  };
  retryable: boolean;
}
