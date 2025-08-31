import { useState, useCallback } from "react";
import { ErrorHandler } from "@/lib/error-handler";
import { ApiError } from "@/lib/api-client";

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: any) => void;
  onMaxAttemptsReached?: (error: any) => void;
}

interface RetryState {
  isRetrying: boolean;
  attempt: number;
  lastError: any;
}

export const useRetry = (options: RetryOptions = {}) => {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
    onMaxAttemptsReached,
  } = options;

  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    lastError: null,
  });

  const executeWithRetry = useCallback(
    async <T>(
      operation: () => Promise<T>,
      customOptions?: Partial<RetryOptions>
    ): Promise<T> => {
      const finalOptions = { ...options, ...customOptions };
      const finalMaxAttempts = finalOptions.maxAttempts || maxAttempts;

      let lastError: any;

      for (let attempt = 0; attempt < finalMaxAttempts; attempt++) {
        try {
          setRetryState({
            isRetrying: attempt > 0,
            attempt,
            lastError,
          });

          const result = await operation();

          // Success - reset state
          setRetryState({
            isRetrying: false,
            attempt: 0,
            lastError: null,
          });

          return result;
        } catch (error) {
          lastError = error;

          setRetryState({
            isRetrying: true,
            attempt: attempt + 1,
            lastError: error,
          });

          // Check if we should retry
          if (
            !ErrorHandler.shouldRetry(
              error as ApiError,
              attempt,
              finalMaxAttempts
            )
          ) {
            break;
          }

          // If this is not the last attempt, wait before retrying
          if (attempt < finalMaxAttempts - 1) {
            onRetry?.(attempt + 1, error);

            const delay = ErrorHandler.getRetryDelay(attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // All attempts failed
      setRetryState({
        isRetrying: false,
        attempt: finalMaxAttempts,
        lastError,
      });

      onMaxAttemptsReached?.(lastError);
      throw lastError;
    },
    [maxAttempts, onRetry, onMaxAttemptsReached, options]
  );

  const reset = useCallback(() => {
    setRetryState({
      isRetrying: false,
      attempt: 0,
      lastError: null,
    });
  }, []);

  return {
    executeWithRetry,
    reset,
    ...retryState,
  };
};
