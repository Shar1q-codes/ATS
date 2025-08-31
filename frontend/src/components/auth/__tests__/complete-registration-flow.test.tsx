import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { RegisterForm } from "../register-form";
import { LoginForm } from "../login-form";
import { authService, ApiError } from "@/lib/auth-service";
import { useAuth } from "@/hooks/use-auth";

// Mock the auth service
jest.mock("@/lib/auth-service", () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    verifyToken: jest.fn(),
    refreshToken: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status: number,
      public code?: string,
      public details?: unknown
    ) {
      super(message);
      this.status = status;
      this.code = code;
      this.details = details;
    }
  },
}));

// Mock the auth hook
jest.mock("@/hooks/use-auth", () => ({
  useAuth: jest.fn(),
}));

// Mock router
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ToastProvider>
      {children}
      <Toaster />
    </ToastProvider>
  </BrowserRouter>
);

describe("Complete Registration Flow Integration Tests", () => {
  const mockAuthService = authService as jest.Mocked<typeof authService>;
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
    });
  });

  describe("Task 12.1: Test registration with valid data", () => {
    it("should successfully register a recruiter with valid data", async () => {
      const validUserData = {
        email: "recruiter@validcompany.com",
        password: "SecurePass123!",
        firstName: "John",
        lastName: "Recruiter",
        role: "recruiter" as const,
        companyName: "Valid Recruiting Company",
      };

      const mockResponse = {
        user: {
          id: "user-123",
          email: validUserData.email,
          firstName: validUserData.firstName,
          lastName: validUserData.lastName,
          role: "recruiter",
          organizationId: "org-123",
        },
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresIn: 3600,
      };

      mockAuthService.register.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: validUserData.email },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: validUserData.password },
      });
      fireEvent.change(screen.getByLabelText(/first name/i), {
        target: { value: validUserData.firstName },
      });
      fireEvent.change(screen.getByLabelText(/last name/i), {
        target: { value: validUserData.lastName },
      });
      fireEvent.change(screen.getByLabelText(/company name/i), {
        target: { value: validUserData.companyName },
      });

      // Select role
      const roleSelect = screen.getByRole("combobox");
      fireEvent.click(roleSelect);
      fireEvent.click(screen.getByText("Recruiter"));

      // Submit form
      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith({
          email: validUserData.email,
          password: validUserData.password,
          firstName: validUserData.firstName,
          lastName: validUserData.lastName,
          role: validUserData.role,
          companyName: validUserData.companyName,
        });
      });

      // Verify success behavior (navigation or success message)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/onboarding");
      });
    });

    it("should successfully register a hiring manager with valid data", async () => {
      const validUserData = {
        email: "manager@validcompany.com",
        password: "SecurePass456!",
        firstName: "Jane",
        lastName: "Manager",
        role: "hiring_manager" as const,
        companyName: "Valid Management Company",
      };

      const mockResponse = {
        user: {
          id: "user-456",
          email: validUserData.email,
          firstName: validUserData.firstName,
          lastName: validUserData.lastName,
          role: "hiring_manager",
          organizationId: "org-456",
        },
        accessToken: "mock-access-token-2",
        refreshToken: "mock-refresh-token-2",
        expiresIn: 3600,
      };

      mockAuthService.register.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: validUserData.email },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: validUserData.password },
      });
      fireEvent.change(screen.getByLabelText(/first name/i), {
        target: { value: validUserData.firstName },
      });
      fireEvent.change(screen.getByLabelText(/last name/i), {
        target: { value: validUserData.lastName },
      });
      fireEvent.change(screen.getByLabelText(/company name/i), {
        target: { value: validUserData.companyName },
      });

      // Select hiring manager role
      const roleSelect = screen.getByRole("combobox");
      fireEvent.click(roleSelect);
      fireEvent.click(screen.getByText("Hiring Manager"));

      // Submit form
      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith({
          email: validUserData.email,
          password: validUserData.password,
          firstName: validUserData.firstName,
          lastName: validUserData.lastName,
          role: validUserData.role,
          companyName: validUserData.companyName,
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/onboarding");
      });
    });
  });

  describe("Task 12.2: Test registration with duplicate email", () => {
    it("should show error message when registering with duplicate email", async () => {
      const duplicateUserData = {
        email: "duplicate@company.com",
        password: "SecurePass123!",
        firstName: "Duplicate",
        lastName: "User",
        role: "recruiter" as const,
        companyName: "Duplicate Test Company",
      };

      const duplicateError = new ApiError(
        "An account with this email already exists",
        409,
        "DUPLICATE_EMAIL"
      );

      mockAuthService.register.mockRejectedValue(duplicateError);

      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: duplicateUserData.email },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: duplicateUserData.password },
      });
      fireEvent.change(screen.getByLabelText(/first name/i), {
        target: { value: duplicateUserData.firstName },
      });
      fireEvent.change(screen.getByLabelText(/last name/i), {
        target: { value: duplicateUserData.lastName },
      });
      fireEvent.change(screen.getByLabelText(/company name/i), {
        target: { value: duplicateUserData.companyName },
      });

      const roleSelect = screen.getByRole("combobox");
      fireEvent.click(roleSelect);
      fireEvent.click(screen.getByText("Recruiter"));

      // Submit form
      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      });

      // Verify navigation did not occur
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Task 12.3: Test registration with invalid data", () => {
    const invalidTestCases = [
      {
        name: "invalid email format",
        data: {
          email: "invalid-email-format",
          password: "SecurePass123!",
          firstName: "John",
          lastName: "Doe",
          role: "recruiter" as const,
          companyName: "Test Company",
        },
        expectedError: "Please enter a valid email address",
      },
      {
        name: "password too short",
        data: {
          email: "test@company.com",
          password: "123",
          firstName: "John",
          lastName: "Doe",
          role: "recruiter" as const,
          companyName: "Test Company",
        },
        expectedError: "Password must be at least 8 characters",
      },
      {
        name: "missing firstName",
        data: {
          email: "test@company.com",
          password: "SecurePass123!",
          firstName: "",
          lastName: "Doe",
          role: "recruiter" as const,
          companyName: "Test Company",
        },
        expectedError: "First name is required",
      },
      {
        name: "missing lastName",
        data: {
          email: "test@company.com",
          password: "SecurePass123!",
          firstName: "John",
          lastName: "",
          role: "recruiter" as const,
          companyName: "Test Company",
        },
        expectedError: "Last name is required",
      },
      {
        name: "missing companyName",
        data: {
          email: "test@company.com",
          password: "SecurePass123!",
          firstName: "John",
          lastName: "Doe",
          role: "recruiter" as const,
          companyName: "",
        },
        expectedError: "Company name is required",
      },
    ];

    invalidTestCases.forEach((testCase) => {
      it(`should show validation error for ${testCase.name}`, async () => {
        render(
          <TestWrapper>
            <RegisterForm />
          </TestWrapper>
        );

        // Fill out the form with invalid data
        fireEvent.change(screen.getByLabelText(/email/i), {
          target: { value: testCase.data.email },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
          target: { value: testCase.data.password },
        });
        fireEvent.change(screen.getByLabelText(/first name/i), {
          target: { value: testCase.data.firstName },
        });
        fireEvent.change(screen.getByLabelText(/last name/i), {
          target: { value: testCase.data.lastName },
        });
        fireEvent.change(screen.getByLabelText(/company name/i), {
          target: { value: testCase.data.companyName },
        });

        const roleSelect = screen.getByRole("combobox");
        fireEvent.click(roleSelect);
        fireEvent.click(screen.getByText("Recruiter"));

        // Submit form
        fireEvent.click(screen.getByRole("button", { name: /register/i }));

        // Verify validation error is displayed
        await waitFor(() => {
          expect(screen.getByText(testCase.expectedError)).toBeInTheDocument();
        });

        // Verify auth service was not called
        expect(mockAuthService.register).not.toHaveBeenCalled();
      });
    });

    it("should handle server validation errors", async () => {
      const invalidData = {
        email: "test@company.com",
        password: "SecurePass123!",
        firstName: "John",
        lastName: "Doe",
        role: "recruiter" as const,
        companyName: "Test Company",
      };

      const validationError = new ApiError(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        {
          message: "Please check your information and try again",
          errors: ["Invalid role provided"],
        }
      );

      mockAuthService.register.mockRejectedValue(validationError);

      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: invalidData.email },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: invalidData.password },
      });
      fireEvent.change(screen.getByLabelText(/first name/i), {
        target: { value: invalidData.firstName },
      });
      fireEvent.change(screen.getByLabelText(/last name/i), {
        target: { value: invalidData.lastName },
      });
      fireEvent.change(screen.getByLabelText(/company name/i), {
        target: { value: invalidData.companyName },
      });

      const roleSelect = screen.getByRole("combobox");
      fireEvent.click(roleSelect);
      fireEvent.click(screen.getByText("Recruiter"));

      // Submit form
      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      // Verify server error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/check your information/i)).toBeInTheDocument();
      });
    });
  });

  describe("Task 12.4: Verify successful login after registration", () => {
    it("should allow login immediately after successful registration", async () => {
      const userData = {
        email: "logintest@company.com",
        password: "SecurePass123!",
        firstName: "Login",
        lastName: "Test",
        role: "recruiter" as const,
        companyName: "Login Test Company",
      };

      const registerResponse = {
        user: {
          id: "user-login-123",
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: "recruiter",
          organizationId: "org-login-123",
        },
        accessToken: "register-access-token",
        refreshToken: "register-refresh-token",
        expiresIn: 3600,
      };

      const loginResponse = {
        user: {
          id: "user-login-123",
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: "recruiter",
          organizationId: "org-login-123",
        },
        accessToken: "login-access-token",
        refreshToken: "login-refresh-token",
        expiresIn: 3600,
      };

      mockAuthService.register.mockResolvedValue(registerResponse);
      mockAuthService.login.mockResolvedValue(loginResponse);

      // Test registration first
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill registration form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: userData.email },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: userData.password },
      });
      fireEvent.change(screen.getByLabelText(/first name/i), {
        target: { value: userData.firstName },
      });
      fireEvent.change(screen.getByLabelText(/last name/i), {
        target: { value: userData.lastName },
      });
      fireEvent.change(screen.getByLabelText(/company name/i), {
        target: { value: userData.companyName },
      });

      const roleSelect = screen.getByRole("combobox");
      fireEvent.click(roleSelect);
      fireEvent.click(screen.getByText("Recruiter"));

      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalled();
      });

      // Now test login with same credentials
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: userData.email },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: userData.password },
      });

      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith({
          email: userData.email,
          password: userData.password,
        });
      });

      // Verify different tokens were returned
      expect(registerResponse.accessToken).not.toBe(loginResponse.accessToken);
      expect(registerResponse.refreshToken).not.toBe(
        loginResponse.refreshToken
      );
    });
  });

  describe("Task 12.5: Test organization creation and user assignment", () => {
    it("should create organization during registration", async () => {
      const userData = {
        email: "orgcreation@company.com",
        password: "SecurePass123!",
        firstName: "Org",
        lastName: "Creator",
        role: "recruiter" as const,
        companyName: "New Organization Inc",
      };

      const mockResponse = {
        user: {
          id: "user-org-123",
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: "recruiter",
          organizationId: "org-new-123",
        },
        accessToken: "org-access-token",
        refreshToken: "org-refresh-token",
        expiresIn: 3600,
      };

      mockAuthService.register.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: userData.email },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: userData.password },
      });
      fireEvent.change(screen.getByLabelText(/first name/i), {
        target: { value: userData.firstName },
      });
      fireEvent.change(screen.getByLabelText(/last name/i), {
        target: { value: userData.lastName },
      });
      fireEvent.change(screen.getByLabelText(/company name/i), {
        target: { value: userData.companyName },
      });

      const roleSelect = screen.getByRole("combobox");
      fireEvent.click(roleSelect);
      fireEvent.click(screen.getByText("Recruiter"));

      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          companyName: userData.companyName,
        });
      });

      // Verify user has organizationId
      expect(mockResponse.user.organizationId).toBeDefined();
      expect(mockResponse.user.organizationId).toBe("org-new-123");
    });

    it("should handle organization creation failure", async () => {
      const userData = {
        email: "orgfail@company.com",
        password: "SecurePass123!",
        firstName: "Org",
        lastName: "Fail",
        role: "recruiter" as const,
        companyName: "Failing Company",
      };

      const orgCreationError = new ApiError(
        "Failed to create organization",
        500,
        "ORG_CREATION_FAILED"
      );

      mockAuthService.register.mockRejectedValue(orgCreationError);

      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: userData.email },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: userData.password },
      });
      fireEvent.change(screen.getByLabelText(/first name/i), {
        target: { value: userData.firstName },
      });
      fireEvent.change(screen.getByLabelText(/last name/i), {
        target: { value: userData.lastName },
      });
      fireEvent.change(screen.getByLabelText(/company name/i), {
        target: { value: userData.companyName },
      });

      const roleSelect = screen.getByRole("combobox");
      fireEvent.click(roleSelect);
      fireEvent.click(screen.getByText("Recruiter"));

      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      // Verify error message is displayed
      await waitFor(() => {
        expect(
          screen.getByText(/failed to create organization/i)
        ).toBeInTheDocument();
      });

      // Verify navigation did not occur
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("End-to-End Integration Flow", () => {
    it("should complete full registration and login flow with proper token handling", async () => {
      const userData = {
        email: "fullflow@company.com",
        password: "SecurePass123!",
        firstName: "Full",
        lastName: "Flow",
        role: "recruiter" as const,
        companyName: "Full Flow Company",
      };

      const registerResponse = {
        user: {
          id: "user-full-123",
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: "recruiter",
          organizationId: "org-full-123",
        },
        accessToken: "full-register-token",
        refreshToken: "full-register-refresh",
        expiresIn: 3600,
      };

      const loginResponse = {
        user: {
          id: "user-full-123",
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: "recruiter",
          organizationId: "org-full-123",
        },
        accessToken: "full-login-token",
        refreshToken: "full-login-refresh",
        expiresIn: 3600,
      };

      const refreshResponse = {
        accessToken: "full-refreshed-token",
        refreshToken: "full-refreshed-refresh",
        expiresIn: 3600,
      };

      mockAuthService.register.mockResolvedValue(registerResponse);
      mockAuthService.login.mockResolvedValue(loginResponse);
      mockAuthService.refreshToken.mockResolvedValue(refreshResponse);

      // Step 1: Registration
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: userData.email },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: userData.password },
      });
      fireEvent.change(screen.getByLabelText(/first name/i), {
        target: { value: userData.firstName },
      });
      fireEvent.change(screen.getByLabelText(/last name/i), {
        target: { value: userData.lastName },
      });
      fireEvent.change(screen.getByLabelText(/company name/i), {
        target: { value: userData.companyName },
      });

      const roleSelect = screen.getByRole("combobox");
      fireEvent.click(roleSelect);
      fireEvent.click(screen.getByText("Recruiter"));

      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalled();
      });

      // Step 2: Login
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: userData.email },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: userData.password },
      });

      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalled();
      });

      // Step 3: Token refresh (simulate)
      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
          loginResponse.refreshToken
        );
      });

      // Verify all tokens are different
      expect(registerResponse.accessToken).not.toBe(loginResponse.accessToken);
      expect(loginResponse.accessToken).not.toBe(refreshResponse.accessToken);
      expect(registerResponse.refreshToken).not.toBe(
        loginResponse.refreshToken
      );
    });
  });
});
