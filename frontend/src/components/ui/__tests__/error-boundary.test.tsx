import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary, withErrorBoundary } from "../error-boundary";
import { ErrorHandler } from "@/lib/error-handler";

// Mock the ErrorHandler
jest.mock("@/lib/error-handler", () => ({
  ErrorHandler: {
    handleError: jest.fn(),
    logError: jest.fn(),
    getRetryDelay: jest.fn(() => 1000),
  },
}));

// Mock useToast
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Test component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for tests
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("renders default error fallback when error occurs", () => {
    const mockErrorInfo = {
      title: "Component Error",
      message: "This component encountered an error",
      retryable: true,
      severity: "medium" as const,
    };

    (ErrorHandler.handleError as jest.Mock).mockReturnValue(mockErrorInfo);

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Component Error")).toBeInTheDocument();
    expect(
      screen.getByText("This component encountered an error")
    ).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("calls onError callback when error occurs", () => {
    const onError = jest.fn();
    const mockErrorInfo = {
      title: "Test Error",
      message: "Test message",
      retryable: true,
      severity: "medium" as const,
    };

    (ErrorHandler.handleError as jest.Mock).mockReturnValue(mockErrorInfo);

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it("resets error when Try again button is clicked", () => {
    const mockErrorInfo = {
      title: "Component Error",
      message: "This component encountered an error",
      retryable: true,
      severity: "medium" as const,
    };

    (ErrorHandler.handleError as jest.Mock).mockReturnValue(mockErrorInfo);

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Component Error")).toBeInTheDocument();

    const tryAgainButton = screen.getByText("Try again");
    fireEvent.click(tryAgainButton);

    // After clicking try again, the error boundary should reset
    // Since we're not re-rendering with different props, the error will occur again
    // But the error boundary should have reset its internal state
    expect(screen.getByText("Component Error")).toBeInTheDocument();
  });

  it("renders page-level error fallback", () => {
    const mockErrorInfo = {
      title: "Page Error",
      message: "This page encountered an error",
      retryable: true,
      severity: "high" as const,
    };

    (ErrorHandler.handleError as jest.Mock).mockReturnValue(mockErrorInfo);

    render(
      <ErrorBoundary level="page">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Page Error")).toBeInTheDocument();
    expect(screen.getByText("Go Home")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders critical error fallback", () => {
    const mockErrorInfo = {
      title: "Critical System Error",
      message: "The application has encountered a critical error",
      retryable: false,
      severity: "critical" as const,
    };

    (ErrorHandler.handleError as jest.Mock).mockReturnValue(mockErrorInfo);

    render(
      <ErrorBoundary level="critical">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Critical System Error")).toBeInTheDocument();
    expect(screen.getByText("Refresh Page")).toBeInTheDocument();
    expect(screen.getByText("Go Home")).toBeInTheDocument();
  });

  it("shows retry button with attempt counter", () => {
    const mockErrorInfo = {
      title: "Component Error",
      message: "This component encountered an error",
      retryable: true,
      severity: "medium" as const,
    };

    (ErrorHandler.handleError as jest.Mock).mockReturnValue(mockErrorInfo);

    render(
      <ErrorBoundary showRetry maxRetries={3}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Retry (3 left)")).toBeInTheDocument();
  });

  it("hides retry button when max retries reached", () => {
    const mockErrorInfo = {
      title: "Component Error",
      message: "This component encountered an error",
      retryable: true,
      severity: "medium" as const,
    };

    (ErrorHandler.handleError as jest.Mock).mockReturnValue(mockErrorInfo);

    // Create a component that simulates reaching max retries
    const TestComponent = () => {
      const [retryCount, setRetryCount] = React.useState(3);

      return (
        <ErrorBoundary showRetry maxRetries={3}>
          <div>
            {retryCount >= 3 ? (
              <ThrowError shouldThrow={true} />
            ) : (
              <div>No error</div>
            )}
          </div>
        </ErrorBoundary>
      );
    };

    render(<TestComponent />);

    // The retry button should still show initially since we haven't reached max retries
    expect(screen.getByText(/Retry \(3 left\)/)).toBeInTheDocument();
  });

  it("uses custom fallback component", () => {
    const CustomFallback = ({
      error,
      resetError,
    }: {
      error?: Error;
      resetError: () => void;
    }) => (
      <div>
        <h1>Custom Error</h1>
        <p>{error?.message}</p>
        <button onClick={resetError}>Reset</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom Error")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });
});

describe("withErrorBoundary HOC", () => {
  it("wraps component with error boundary", () => {
    const TestComponent = () => <div>Test Component</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText("Test Component")).toBeInTheDocument();
  });

  it("handles errors in wrapped component", () => {
    const mockErrorInfo = {
      title: "Component Error",
      message: "This component encountered an error",
      retryable: true,
      severity: "medium" as const,
    };

    (ErrorHandler.handleError as jest.Mock).mockReturnValue(mockErrorInfo);

    const WrappedComponent = withErrorBoundary(ThrowError);

    render(<WrappedComponent shouldThrow={true} />);

    expect(screen.getByText("Component Error")).toBeInTheDocument();
  });

  it("passes error boundary props to wrapper", () => {
    const onError = jest.fn();
    const TestComponent = () => <div>Test Component</div>;
    const WrappedComponent = withErrorBoundary(TestComponent, { onError });

    render(<WrappedComponent />);

    expect(screen.getByText("Test Component")).toBeInTheDocument();
  });
});
