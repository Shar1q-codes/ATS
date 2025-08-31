import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserManagement } from "../user-management";
import {
  useOrganizationUsers,
  useUpdateUserRole,
  useRemoveUserFromOrganization,
} from "../../../hooks/api/use-organizations-api";
import { useAuth } from "../../../hooks/use-auth";
import { useToast } from "../../../hooks/use-toast";

// Mock the hooks
jest.mock("../../../hooks/api/use-organizations-api");
jest.mock("../../../hooks/use-auth");
jest.mock("../../../hooks/use-toast");

const mockUseOrganizationUsers = useOrganizationUsers as jest.MockedFunction<
  typeof useOrganizationUsers
>;
const mockUseUpdateUserRole = useUpdateUserRole as jest.MockedFunction<
  typeof useUpdateUserRole
>;
const mockUseRemoveUserFromOrganization =
  useRemoveUserFromOrganization as jest.MockedFunction<
    typeof useRemoveUserFromOrganization
  >;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockUsers = [
  {
    id: "user-1",
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "User",
    role: "admin" as const,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "user-2",
    email: "recruiter@test.com",
    firstName: "Recruiter",
    lastName: "User",
    role: "recruiter" as const,
    isActive: true,
    createdAt: "2024-01-02T00:00:00Z",
  },
];

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe("UserManagement", () => {
  const mockToast = jest.fn();
  const mockUpdateUserRole = jest.fn();
  const mockRemoveUser = jest.fn();

  beforeEach(() => {
    mockUseToast.mockReturnValue({
      toast: mockToast,
      toasts: [],
      addToast: jest.fn(),
      removeToast: jest.fn(),
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
    });

    mockUseOrganizationUsers.mockReturnValue({
      data: mockUsers,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isSuccess: true,
    });

    mockUseUpdateUserRole.mockReturnValue({
      mutateAsync: mockUpdateUserRole,
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
      mutate: jest.fn(),
      reset: jest.fn(),
    });

    mockUseRemoveUserFromOrganization.mockReturnValue({
      mutateAsync: mockRemoveUser,
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
      mutate: jest.fn(),
      reset: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders user list for admin user", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", role: "admin", organizationId: "org-1" },
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    renderWithQueryClient(<UserManagement organizationId="org-1" />);

    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("Recruiter User")).toBeInTheDocument();
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
    expect(screen.getByText("recruiter@test.com")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("allows admin to change user roles", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", role: "admin", organizationId: "org-1" },
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    mockUpdateUserRole.mockResolvedValue(mockUsers[1]);

    renderWithQueryClient(<UserManagement organizationId="org-1" />);

    // Find the role select for the recruiter user (not the admin user)
    const roleSelects = screen.getAllByRole("combobox");
    const recruiterRoleSelect = roleSelects.find((select) =>
      select.closest("tr")?.textContent?.includes("recruiter@test.com")
    );

    expect(recruiterRoleSelect).toBeInTheDocument();

    // Change role to hiring_manager
    fireEvent.click(recruiterRoleSelect!);
    fireEvent.click(screen.getByText("Hiring Manager"));

    await waitFor(() => {
      expect(mockUpdateUserRole).toHaveBeenCalledWith({
        organizationId: "org-1",
        userId: "user-2",
        role: "hiring_manager",
      });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Role updated",
      description: "User role has been updated successfully.",
    });
  });

  it("allows admin to remove users", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", role: "admin", organizationId: "org-1" },
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    mockRemoveUser.mockResolvedValue(undefined);

    renderWithQueryClient(<UserManagement organizationId="org-1" />);

    // Click remove button for recruiter user
    const removeButtons = screen.getAllByText("Remove");
    fireEvent.click(removeButtons[0]);

    // Confirm removal in dialog
    const confirmButton = screen.getByText("Remove User");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockRemoveUser).toHaveBeenCalledWith({
        organizationId: "org-1",
        userId: "user-2",
      });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "User removed",
      description: "User has been removed from the organization.",
    });
  });

  it("restricts actions for non-admin users", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-2", role: "recruiter", organizationId: "org-1" },
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    renderWithQueryClient(<UserManagement organizationId="org-1" />);

    // Should not show role selects or remove buttons
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByText("Remove")).not.toBeInTheDocument();

    // Should show restriction message
    expect(
      screen.getByText(
        "You need administrator privileges to manage users and roles."
      )
    ).toBeInTheDocument();
  });

  it("handles loading state", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", role: "admin", organizationId: "org-1" },
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    mockUseOrganizationUsers.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isSuccess: false,
    });

    renderWithQueryClient(<UserManagement organizationId="org-1" />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("handles error state", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", role: "admin", organizationId: "org-1" },
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    mockUseOrganizationUsers.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load"),
      refetch: jest.fn(),
      isError: true,
      isSuccess: false,
    });

    renderWithQueryClient(<UserManagement organizationId="org-1" />);

    expect(
      screen.getByText("Failed to load users. Please try again.")
    ).toBeInTheDocument();
  });
});
