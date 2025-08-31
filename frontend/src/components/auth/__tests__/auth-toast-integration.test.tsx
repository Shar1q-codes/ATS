import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { RegisterForm } from "../register-form";
import { LoginForm } from "../login-form";

// Mock the auth service
jest.mock("@/lib/auth-service", () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
  },
}));

// Mock the auth hook
const mockRegister = jest.fn();
const mockLogin = jest.fn();

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    register: mockRegister,
    login: mockLogin,
    isLoading: false,
  }),
}));

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <Toaster />
    </ToastProvider>
  );
}

describe("Auth Toast Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show success toast on successful registration", async () => {
    mockRegister.mockResolvedValueOnce({
      id: "1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
    });

    render(
      <TestWrapper>
        <RegisterForm />
      </TestWrapper>
    );

    // Fill out the form
    fireEvent.change(screen.getByLabelText("First Name"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText("Last Name"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Company Name"), {
      target: { value: "Test Company" },
    });
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "recruiter" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "password123" },
    });

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    // Wait for the success toast to appear
    await waitFor(() => {
      expect(screen.getByText("Account Created!")).toBeInTheDocument();
    });
  });

  it("should show error toast on registration failure", async () => {
    mockRegister.mockRejectedValueOnce(new Error("Email already exists"));

    render(
      <TestWrapper>
        <RegisterForm />
      </TestWrapper>
    );

    // Fill out the form
    fireEvent.change(screen.getByLabelText("First Name"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText("Last Name"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Company Name"), {
      target: { value: "Test Company" },
    });
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "recruiter" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "password123" },
    });

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    // Wait for the error toast to appear
    await waitFor(() => {
      expect(screen.getByText("Registration Failed")).toBeInTheDocument();
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });
  });

  it("should show success toast on successful login", async () => {
    mockLogin.mockResolvedValueOnce({
      id: "1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    // Fill out the form
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    // Wait for the success toast to appear
    await waitFor(() => {
      expect(screen.getByText("Welcome back!")).toBeInTheDocument();
    });
  });

  it("should show error toast on login failure", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Invalid credentials"));

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    // Fill out the form
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrongpassword" },
    });

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    // Wait for the error toast to appear
    await waitFor(() => {
      expect(screen.getByText("Login Failed")).toBeInTheDocument();
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });
});
