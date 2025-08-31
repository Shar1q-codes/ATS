import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OrganizationSettings } from "../organization-settings";
import { useUpdateOrganization } from "../../../hooks/api/use-organizations-api";
import { useToast } from "../../../hooks/use-toast";

// Mock the hooks
jest.mock("../../../hooks/api/use-organizations-api");
jest.mock("../../../hooks/use-toast");

const mockUseUpdateOrganization = useUpdateOrganization as jest.MockedFunction<
  typeof useUpdateOrganization
>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

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

describe("OrganizationSettings", () => {
  const mockToast = jest.fn();
  const mockMutateAsync = jest.fn();

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

    mockUseUpdateOrganization.mockReturnValue({
      mutateAsync: mockMutateAsync,
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

  it("renders organization settings form", () => {
    renderWithQueryClient(
      <OrganizationSettings organization={mockOrganization} />
    );

    expect(screen.getByDisplayValue("Test Organization")).toBeInTheDocument();
    expect(screen.getByDisplayValue("test.com")).toBeInTheDocument();
    expect(screen.getByText("Small/Medium Business")).toBeInTheDocument();
    expect(screen.getByText("Basic")).toBeInTheDocument();
  });

  it("enables editing when edit button is clicked", () => {
    renderWithQueryClient(
      <OrganizationSettings organization={mockOrganization} />
    );

    const editButton = screen.getByText("Edit Settings");
    fireEvent.click(editButton);

    expect(screen.getByText("Save Changes")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("updates organization settings successfully", async () => {
    mockMutateAsync.mockResolvedValue(mockOrganization);

    renderWithQueryClient(
      <OrganizationSettings organization={mockOrganization} />
    );

    // Enable editing
    fireEvent.click(screen.getByText("Edit Settings"));

    // Change organization name
    const nameInput = screen.getByDisplayValue("Test Organization");
    fireEvent.change(nameInput, { target: { value: "Updated Organization" } });

    // Submit form
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: "org-1",
        data: {
          name: "Updated Organization",
          domain: "test.com",
          type: "smb",
        },
      });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Settings updated",
      description: "Organization settings have been updated successfully.",
    });
  });

  it("handles update error", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Update failed"));

    renderWithQueryClient(
      <OrganizationSettings organization={mockOrganization} />
    );

    // Enable editing and submit
    fireEvent.click(screen.getByText("Edit Settings"));
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description:
          "Failed to update organization settings. Please try again.",
        variant: "destructive",
      });
    });
  });

  it("cancels editing and resets form", () => {
    renderWithQueryClient(
      <OrganizationSettings organization={mockOrganization} />
    );

    // Enable editing
    fireEvent.click(screen.getByText("Edit Settings"));

    // Change organization name
    const nameInput = screen.getByDisplayValue("Test Organization");
    fireEvent.change(nameInput, { target: { value: "Changed Name" } });

    // Cancel editing
    fireEvent.click(screen.getByText("Cancel"));

    // Form should be reset
    expect(screen.getByDisplayValue("Test Organization")).toBeInTheDocument();
    expect(screen.getByText("Edit Settings")).toBeInTheDocument();
  });

  it("displays organization metadata", () => {
    renderWithQueryClient(
      <OrganizationSettings organization={mockOrganization} />
    );

    expect(screen.getByText("org-1")).toBeInTheDocument();
    expect(screen.getByText("January 1, 2024 at 12:00 AM")).toBeInTheDocument();
  });
});
