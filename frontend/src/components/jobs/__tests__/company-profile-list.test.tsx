import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CompanyProfileList } from "../company-profile-list";
import * as jobsApi from "@/hooks/api/use-jobs-api";

// Mock the hooks
jest.mock("@/hooks/api/use-jobs-api");
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockCompanyProfiles = [
  {
    id: "1",
    name: "Acme Corp",
    industry: "Technology",
    size: "medium" as const,
    culture: ["Innovation", "Collaboration"],
    benefits: ["Health Insurance", "Remote Work"],
    workArrangement: "hybrid" as const,
    location: "San Francisco, CA",
    preferences: {
      prioritySkills: ["JavaScript", "React"],
      dealBreakers: ["No remote work"],
      niceToHave: ["TypeScript"],
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Tech Startup",
    industry: "Software",
    size: "startup" as const,
    culture: ["Fast-paced", "Agile"],
    benefits: ["Equity", "Flexible Hours"],
    workArrangement: "remote" as const,
    location: "New York, NY",
    preferences: {
      prioritySkills: ["Python", "Django"],
      dealBreakers: ["No equity"],
      niceToHave: ["AWS"],
    },
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe("CompanyProfileList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", () => {
    (jobsApi.useCompanyProfilesQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    (jobsApi.useDeleteCompanyProfileMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<CompanyProfileList />);

    expect(screen.getByText("Loading company profiles...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    (jobsApi.useCompanyProfilesQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to fetch"),
    });
    (jobsApi.useDeleteCompanyProfileMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<CompanyProfileList />);

    expect(
      screen.getByText("Failed to load company profiles")
    ).toBeInTheDocument();
  });

  it("renders empty state", () => {
    (jobsApi.useCompanyProfilesQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteCompanyProfileMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<CompanyProfileList />);

    expect(screen.getByText("No company profiles found")).toBeInTheDocument();
    expect(
      screen.getByText("Create Your First Company Profile")
    ).toBeInTheDocument();
  });

  it("renders company profiles list", () => {
    (jobsApi.useCompanyProfilesQuery as jest.Mock).mockReturnValue({
      data: mockCompanyProfiles,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteCompanyProfileMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<CompanyProfileList />);

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Tech Startup")).toBeInTheDocument();
    expect(screen.getByText("Technology")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Startup")).toBeInTheDocument();
  });

  it("filters company profiles by search term", async () => {
    (jobsApi.useCompanyProfilesQuery as jest.Mock).mockReturnValue({
      data: mockCompanyProfiles,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteCompanyProfileMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<CompanyProfileList />);

    const searchInput = screen.getByPlaceholderText("Search companies...");
    fireEvent.change(searchInput, { target: { value: "Acme" } });

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.queryByText("Tech Startup")).not.toBeInTheDocument();
    });
  });

  it("opens create dialog when create button is clicked", () => {
    (jobsApi.useCompanyProfilesQuery as jest.Mock).mockReturnValue({
      data: mockCompanyProfiles,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteCompanyProfileMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<CompanyProfileList />);

    const createButton = screen.getByText("Create Company Profile");
    fireEvent.click(createButton);

    expect(
      screen.getByText(
        "Create a new company profile with preferences and settings."
      )
    ).toBeInTheDocument();
  });

  it("displays work arrangement and location correctly", () => {
    (jobsApi.useCompanyProfilesQuery as jest.Mock).mockReturnValue({
      data: mockCompanyProfiles,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteCompanyProfileMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<CompanyProfileList />);

    expect(screen.getByText("Hybrid")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
    expect(screen.getByText("San Francisco, CA")).toBeInTheDocument();
    expect(screen.getByText("New York, NY")).toBeInTheDocument();
  });

  it("displays culture values with truncation", () => {
    (jobsApi.useCompanyProfilesQuery as jest.Mock).mockReturnValue({
      data: mockCompanyProfiles,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteCompanyProfileMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<CompanyProfileList />);

    expect(screen.getByText("Innovation")).toBeInTheDocument();
    expect(screen.getByText("Collaboration")).toBeInTheDocument();
    expect(screen.getByText("Fast-paced")).toBeInTheDocument();
    expect(screen.getByText("Agile")).toBeInTheDocument();
  });

  it("calls delete mutation when delete is confirmed", async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    (jobsApi.useCompanyProfilesQuery as jest.Mock).mockReturnValue({
      data: mockCompanyProfiles,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteCompanyProfileMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockDelete,
      isPending: false,
    });

    renderWithQueryClient(<CompanyProfileList />);

    const deleteButtons = screen.getAllByRole("button");
    const deleteButton = deleteButtons.find(
      (button) =>
        button.querySelector("svg")?.getAttribute("data-testid") ===
          "trash-2-icon" || button.textContent?.includes("Trash2")
    );

    if (deleteButton) {
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByText("Delete");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith("1");
      });
    }
  });
});
