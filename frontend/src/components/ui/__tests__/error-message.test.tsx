import { render, screen, fireEvent } from "@testing-library/react";
import {
  ErrorMessage,
  AuthErrorMessage,
  NetworkErrorMessage,
  ValidationErrorMessage,
} from "../error-message";
import { ErrorHandler } from "@/lib/error-handler";

// Mock the ErrorHandler
jest.mock("@/lib/error-handler", () => ({
  ErrorHandler: {
    handleError: jest.fn(),
  },
}));

describe("ErrorMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders error message with title and message", () => {
    const errorInfo = {
      title: "Test Error",
      message: "This is a test error message",
      action: "Please try again",
      retryable: true,
      severity: "medium" as const,
    };

    render(<ErrorMessage errorInfo={errorInfo} />);

    expect(screen.getByText("Test Error")).toBeInTheDocument();
    expect(
      screen.getByText("This is a test error message")
    ).toBeInTheDocument();
    expect(screen.getByText("Please try again")).toBeInTheDocument();
  });

  it("shows retry button when retryable and onRetry provided", () => {
    const errorInfo = {
      title: "Test Error",
      message: "This is a test error message",
      retryable: true,
      severity: "medium" as const,
    };
    const onRetry = jest.fn();

    render(<ErrorMessage errorInfo={errorInfo} showRetry onRetry={onRetry} />);

    const retryButton = screen.getByText("Try Again");
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not show retry button when not retryable", () => {
    const errorInfo = {
      title: "Test Error",
      message: "This is a test error message",
      retryable: false,
      severity: "medium" as const,
    };
    const onRetry = jest.fn();

    render(<ErrorMessage errorInfo={errorInfo} showRetry onRetry={onRetry} />);

    expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
  });

  it("handles error object using ErrorHandler", () => {
    const error = new Error("Test error");
    const mockErrorInfo = {
      title: "Handled Error",
      message: "This error was handled",
      retryable: true,
      severity: "high" as const,
    };

    (ErrorHandler.handleError as jest.Mock).mockReturnValue(mockErrorInfo);

    render(<ErrorMessage error={error} />);

    expect(ErrorHandler.handleError).toHaveBeenCalledWith(error);
    expect(screen.getByText("Handled Error")).toBeInTheDocument();
    expect(screen.getByText("This error was handled")).toBeInTheDocument();
  });

  it("shows technical details in development mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const error = new Error("Test error with stack");
    error.stack = "Error: Test error\n    at test.js:1:1";

    const errorInfo = {
      title: "Test Error",
      message: "This is a test error message",
      retryable: true,
      severity: "medium" as const,
    };

    render(<ErrorMessage error={error} errorInfo={errorInfo} showDetails />);

    const detailsButton = screen.getByText("Show technical details");
    expect(detailsButton).toBeInTheDocument();

    fireEvent.click(detailsButton);
    expect(screen.getByText("Hide technical details")).toBeInTheDocument();
    expect(screen.getByText(/Error: Test error/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it("applies correct severity styling", () => {
    const errorInfo = {
      title: "Critical Error",
      message: "This is critical",
      retryable: false,
      severity: "critical" as const,
    };

    const { container } = render(<ErrorMessage errorInfo={errorInfo} />);

    const errorElement = container.firstChild as HTMLElement;
    expect(errorElement).toHaveClass(
      "bg-red-50",
      "border-red-200",
      "text-red-800"
    );
  });
});

describe("AuthErrorMessage", () => {
  it("renders invalid credentials error", () => {
    render(<AuthErrorMessage type="invalid-credentials" />);

    expect(screen.getByText("Invalid Credentials")).toBeInTheDocument();
    expect(
      screen.getByText("The email or password you entered is incorrect.")
    ).toBeInTheDocument();
  });

  it("renders session expired error with login button", () => {
    const onLogin = jest.fn();

    render(<AuthErrorMessage type="session-expired" onLogin={onLogin} />);

    expect(screen.getByText("Session Expired")).toBeInTheDocument();

    const loginButton = screen.getByText("Log In Again");
    expect(loginButton).toBeInTheDocument();

    fireEvent.click(loginButton);
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("renders access denied error", () => {
    render(<AuthErrorMessage type="access-denied" />);

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(
      screen.getByText("You don't have permission to access this resource.")
    ).toBeInTheDocument();
  });

  it("renders registration failed error with retry", () => {
    const onRetry = jest.fn();

    render(<AuthErrorMessage type="registration-failed" onRetry={onRetry} />);

    expect(screen.getByText("Registration Failed")).toBeInTheDocument();

    const retryButton = screen.getByText("Try Again");
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("NetworkErrorMessage", () => {
  it("renders network error with retry button", () => {
    const onRetry = jest.fn();

    render(<NetworkErrorMessage onRetry={onRetry} />);

    expect(screen.getByText("Connection Error")).toBeInTheDocument();
    expect(
      screen.getByText("Unable to connect to the server.")
    ).toBeInTheDocument();

    const retryButton = screen.getByText("Try Again");
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows retrying state", () => {
    render(<NetworkErrorMessage isRetrying />);

    expect(screen.getByText("Retrying connection...")).toBeInTheDocument();
  });
});

describe("ValidationErrorMessage", () => {
  it("renders single validation error", () => {
    render(
      <ValidationErrorMessage field="email" errors={["Invalid email format"]} />
    );

    expect(screen.getByText("email Error")).toBeInTheDocument();
    expect(screen.getByText("Invalid email format")).toBeInTheDocument();
  });

  it("renders multiple validation errors", () => {
    const errors = [
      "Password must be at least 8 characters",
      "Password must contain uppercase letter",
      "Password must contain number",
    ];

    render(<ValidationErrorMessage field="password" errors={errors} />);

    expect(screen.getByText("password Error")).toBeInTheDocument();
    expect(screen.getByText("3 validation errors found")).toBeInTheDocument();

    errors.forEach((error) => {
      expect(screen.getByText(error)).toBeInTheDocument();
    });
  });

  it("does not render when no errors", () => {
    const { container } = render(<ValidationErrorMessage errors={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
