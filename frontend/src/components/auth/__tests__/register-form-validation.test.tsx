import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "../register-form";
import { useAuth } from "@/hooks/use-auth";

// Mock the auth hook
jest.mock("@/hooks/use-auth");
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the error handler
jest.mock("@/lib/error-handler", () => ({
  ErrorHandler: {
    handleError: jest.fn(() => ({
      title: "Error",
      message: "Something went wrong",
    })),
  },
}));

describe("RegisterForm Validation", () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      isLoading: false,
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
    });
    mockRegister.mockClear();
  });

  it("should show real-time validation for email field", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const emailInput = screen.getByLabelText("Email");

    // Type invalid email
    await user.type(emailInput, "invalid-email");
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a valid email address/)
      ).toBeInTheDocument();
    });

    // Clear and type valid email
    await user.clear(emailInput);
    await user.type(emailInput, "user@example.com");
    await user.tab();

    await waitFor(() => {
      expect(
        screen.queryByText(/Please enter a valid email address/)
      ).not.toBeInTheDocument();
    });
  });

  it("should show password strength indicator", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const passwordInput = screen.getByLabelText("Password");

    // Type weak password
    await user.type(passwordInput, "weak");
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText("Password strength:")).toBeInTheDocument();
      expect(screen.getByText("Weak")).toBeInTheDocument();
    });

    // Type stronger password
    await user.clear(passwordInput);
    await user.type(passwordInput, "StrongPass123!");
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText("Password strength:")).toBeInTheDocument();
      // Should show better strength
      expect(screen.queryByText("Weak")).not.toBeInTheDocument();
    });
  });

  it("should show field-level validation errors", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const firstNameInput = screen.getByLabelText("First Name");
    const lastNameInput = screen.getByLabelText("Last Name");

    // Focus and blur without typing
    await user.click(firstNameInput);
    await user.tab();

    await user.click(lastNameInput);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText("First name is required")).toBeInTheDocument();
      expect(screen.getByText("Last name is required")).toBeInTheDocument();
    });
  });

  it("should validate password confirmation", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");

    await user.type(passwordInput, "Password123!");
    await user.type(confirmPasswordInput, "DifferentPassword");
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    });

    // Fix the confirmation
    await user.clear(confirmPasswordInput);
    await user.type(confirmPasswordInput, "Password123!");
    await user.tab();

    await waitFor(() => {
      expect(
        screen.queryByText("Passwords don't match")
      ).not.toBeInTheDocument();
    });
  });

  it("should show email suggestions for common typos", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const emailInput = screen.getByLabelText("Email");

    // Type email with common typo
    await user.type(emailInput, "user@gmail.co");
    await user.tab();

    await waitFor(() => {
      expect(
        screen.getByText(/Did you mean user@gmail.com/)
      ).toBeInTheDocument();
    });
  });

  it("should prevent form submission with validation errors", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const submitButton = screen.getByRole("button", { name: "Create Account" });

    // Try to submit empty form
    await user.click(submitButton);

    // Should show validation errors and not call register
    await waitFor(() => {
      expect(screen.getByText("First name is required")).toBeInTheDocument();
      expect(screen.getByText("Last name is required")).toBeInTheDocument();
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("should allow form submission with valid data", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    // Fill out the form with valid data
    await user.type(screen.getByLabelText("First Name"), "John");
    await user.type(screen.getByLabelText("Last Name"), "Doe");
    await user.type(screen.getByLabelText("Email"), "john.doe@example.com");
    await user.type(screen.getByLabelText("Company Name"), "Example Corp");
    await user.selectOptions(screen.getByLabelText("Role"), "recruiter");
    await user.type(screen.getByLabelText("Password"), "StrongPass123!");
    await user.type(
      screen.getByLabelText("Confirm Password"),
      "StrongPass123!"
    );

    const submitButton = screen.getByRole("button", { name: "Create Account" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        companyName: "Example Corp",
        role: "recruiter",
        password: "StrongPass123!",
        confirmPassword: "StrongPass123!",
      });
    });
  });
});
