import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "../login-form";
import { useAuth } from "@/hooks/use-auth";
import { TestWrapper } from "@/lib/test-utils";

// Mock the useAuth hook
jest.mock("@/hooks/use-auth");
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("LoginForm", () => {
  const mockLogin = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnSwitchToRegister = jest.fn();
  const mockOnForgotPassword = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      user: null,
      tokens: null,
      isAuthenticated: false,
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      verifyToken: jest.fn(),
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
    });

    jest.clearAllMocks();
  });

  it("renders login form correctly", () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const submitButton = screen.getByRole("button", { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    await user.type(emailInput, "invalid-email");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid email address")
      ).toBeInTheDocument();
    });
  });

  it("shows validation error for short password", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    await user.type(passwordInput, "123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters")
      ).toBeInTheDocument();
    });
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const toggleButton = screen.getByRole("button", { name: "" }); // Eye icon button

    expect(passwordInput.type).toBe("password");

    await user.click(toggleButton);
    expect(passwordInput.type).toBe("text");

    await user.click(toggleButton);
    expect(passwordInput.type).toBe("password");
  });

  it("calls login function with correct data on valid submission", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({});

    render(
      <TestWrapper>
        <LoginForm onSuccess={mockOnSuccess} />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isLoading: true,
      user: null,
      tokens: null,
      isAuthenticated: false,
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      verifyToken: jest.fn(),
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const submitButton = screen.getByRole("button", { name: /sign in/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("shows error message on login failure", async () => {
    const user = userEvent.setup();
    const errorMessage = "Invalid credentials";
    mockLogin.mockRejectedValue(new Error(errorMessage));

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("calls switch to register callback", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />
      </TestWrapper>
    );

    const signUpLink = screen.getByRole("button", { name: /sign up/i });
    await user.click(signUpLink);

    expect(mockOnSwitchToRegister).toHaveBeenCalled();
  });

  it("calls forgot password callback", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm onForgotPassword={mockOnForgotPassword} />
      </TestWrapper>
    );

    const forgotPasswordLink = screen.getByRole("button", {
      name: /forgot your password/i,
    });
    await user.click(forgotPasswordLink);

    expect(mockOnForgotPassword).toHaveBeenCalled();
  });
});
