import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OrganizationPage from "../page";
import { useAuth } from "../../../hooks/use-auth";
import { useOrganization } from "../../../hooks/api/use-organizations-api";

// Mock the hooks and components
jest.mock("../../../hooks/use-auth");
jest.mock("../../../hooks/api/use-organizations-api");
jest.mock("../../../components/organization/organization-settings", () => ({
  OrganizationSettings: ({ organization }: any) => (
    <div data-testid="organization-settings">
      Settings for {organization.name}
    </div>
  ),
}));
jest.mock("../../../components/organization/user-management", () => ({
  UserManagement: ({ organizationId }: any) => (
    <div data-testid="user-management">
      User management for {organizationId}
    </div>
  ),
}));
jest.mock("../../../components/organization/organization-branding", () => ({
  OrganizationBranding: ({ organization }: any) => (
    <div data-testid="organization-branding">
      Branding for {organization.name}
    </div>
  ),
}));
jest.mock("../../../components/organization/organization-analytics", () => ({
  OrganizationAnalytics: ({ organizationId }: any) => (
    <div data-testid="organization-analytics">
      Analytics for {organizationId}
    </div>
  ),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseOrganization = useOrganization as jest.MockedFunction<
  typeof useOrganization
>;

const mockOrganization = {
  id: "org-1",
  name: "Test Organization",
  domain: "test.com",
  type: "smb" as const,
  subscriptionPlan: "basic" as const,
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

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

describe("OrganizationPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", role: "admin", organizationId: "org-1" },
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    mockUseOrganization.mockReturnValue({
      data: mockOrganization,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isSuccess: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders organization page with tabs", () => {
    renderWithQueryClient(<OrganizationPage />);

    expect(screen.getByText("Organization Settings")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Manage your organization settings, users, and preferences."
      )
    ).toBeInTheDocument();

    // Check tabs
    expect(screen.getByText("General Settings")).toBeInTheDocument();
    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Branding")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  it("shows settings tab by default", () => {
    renderWithQueryClient(<OrganizationPage />);

    expect(screen.getByTestId("organization-settings")).toBeInTheDocument();
    expect(
      screen.getByText("Settings for Test Organization")
    ).toBeInTheDocument();
  });

  it("switches to user management tab", () => {
    renderWithQueryClient(<OrganizationPage />);

    fireEvent.click(screen.getByText("User Management"));

    expect(screen.getByTestId("user-management")).toBeInTheDocument();
    expect(screen.getByText("User management for org-1")).toBeInTheDocument();
  });

  it("switches to branding tab", () => {
    renderWithQueryClient(<OrganizationPage />);

    fireEvent.click(screen.getByText("Branding"));

    expect(screen.getByTestId("organization-branding")).toBeInTheDocument();
    expect(
      screen.getByText("Branding for Test Organization")
    ).toBeInTheDocument();
  });

  it("switches to analytics tab", () => {
    renderWithQueryClient(<OrganizationPage />);

    fireEvent.click(screen.getByText("Analytics"));

    expect(screen.getByTestId("organization-analytics")).toBeInTheDocument();
    expect(screen.getByText("Analytics for org-1")).toBeInTheDocument();
  });

  it("handles loading state", () => {
    mockUseOrganization.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isSuccess: false,
    });

    renderWithQueryClient(<OrganizationPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("handles error state", () => {
    mockUseOrganization.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load"),
      refetch: jest.fn(),
      isError: true,
      isSuccess: false,
    });

    renderWithQueryClient(<OrganizationPage />);

    expect(
      screen.getByText("Failed to load organization details. Please try again.")
    ).toBeInTheDocument();
  });

  it("handles missing organization data", () => {
    mockUseOrganization.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isSuccess: true,
    });

    renderWithQueryClient(<OrganizationPage />);

    expect(
      screen.getByText("Failed to load organization details. Please try again.")
    ).toBeInTheDocument();
  });
});
