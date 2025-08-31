import { render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "../protected-route";
import { useAuth } from "@/hooks/use-auth";
import { TestWrapper } from "@/lib/test-utils";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock the useAuth hook
jest.mock("@/hooks/use-auth");
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockPush = jest.fn();

describe("ProtectedRoute", () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    jest.clearAllMocks();
  });

  it("shows loading when authentication is loading", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      tokens: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      verifyToken: jest.fn(),
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
    });

    render(
      <TestWrapper>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("redirects to login when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      tokens: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      verifyToken: jest.fn(),
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
    });

    render(
      <TestWrapper>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(mockPush).toHaveBeenCalledWith("/auth/login");
  });

  it("renders children when authenticated", () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "recruiter" as const,
    };

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockUser,
      tokens: {
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() + 3600000,
      },
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      verifyToken: jest.fn(),
      hasRole: jest.fn().mockReturnValue(true),
      hasPermission: jest.fn().mockReturnValue(true),
    });

    render(
      <TestWrapper>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("shows access denied when user lacks required role", () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "recruiter" as const,
    };

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockUser,
      tokens: {
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() + 3600000,
      },
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      verifyToken: jest.fn(),
      hasRole: jest.fn().mockReturnValue(false),
      hasPermission: jest.fn().mockReturnValue(true),
    });

    render(
      <TestWrapper>
        <ProtectedRoute requiredRole="admin">
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You don't have the required permissions to access this page."
      )
    ).toBeInTheDocument();
  });

  it("shows access denied when user lacks required permission", () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "recruiter" as const,
    };

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockUser,
      tokens: {
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() + 3600000,
      },
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      verifyToken: jest.fn(),
      hasRole: jest.fn().mockReturnValue(true),
      hasPermission: jest.fn().mockReturnValue(false),
    });

    render(
      <TestWrapper>
        <ProtectedRoute requiredPermission="admin:settings">
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("uses custom fallback path", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      tokens: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      verifyToken: jest.fn(),
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
    });

    render(
      <TestWrapper>
        <ProtectedRoute fallbackPath="/custom-login">
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(mockPush).toHaveBeenCalledWith("/custom-login");
  });
});
