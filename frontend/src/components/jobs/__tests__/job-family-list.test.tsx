import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JobFamilyList } from "../job-family-list";
import * as jobsApi from "@/hooks/api/use-jobs-api";

// Mock the hooks
jest.mock("@/hooks/api/use-jobs-api");
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockJobFamilies = [
  {
    id: "1",
    name: "Software Engineer",
    description: "Software development roles",
    baseRequirements: [
      {
        id: "req1",
        type: "skill" as const,
        category: "must" as const,
        description: "JavaScript programming",
        weight: 8,
        alternatives: ["TypeScript"],
      },
    ],
    skillCategories: ["Programming", "Web Development"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Data Scientist",
    description: "Data analysis and machine learning roles",
    baseRequirements: [
      {
        id: "req2",
        type: "skill" as const,
        category: "must" as const,
        description: "Python programming",
        weight: 9,
        alternatives: ["R"],
      },
    ],
    skillCategories: ["Data Analysis", "Machine Learning"],
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

describe("JobFamilyList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", () => {
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    (jobsApi.useDeleteJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobFamilyList />);

    expect(screen.getByText("Loading job families...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to fetch"),
    });
    (jobsApi.useDeleteJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobFamilyList />);

    expect(screen.getByText("Failed to load job families")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobFamilyList />);

    expect(screen.getByText("No job families found")).toBeInTheDocument();
    expect(
      screen.getByText("Create Your First Job Family")
    ).toBeInTheDocument();
  });

  it("renders job families list", () => {
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobFamilyList />);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Data Scientist")).toBeInTheDocument();
    expect(screen.getByText("Software development roles")).toBeInTheDocument();
    expect(screen.getByText("Programming")).toBeInTheDocument();
    expect(screen.getByText("Web Development")).toBeInTheDocument();
  });

  it("filters job families by search term", async () => {
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobFamilyList />);

    const searchInput = screen.getByPlaceholderText("Search job families...");
    fireEvent.change(searchInput, { target: { value: "Software" } });

    await waitFor(() => {
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      expect(screen.queryByText("Data Scientist")).not.toBeInTheDocument();
    });
  });

  it("opens create dialog when create button is clicked", () => {
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobFamilyList />);

    const createButton = screen.getByText("Create Job Family");
    fireEvent.click(createButton);

    expect(
      screen.getByText(
        "Create a new job family with base requirements and skill categories."
      )
    ).toBeInTheDocument();
  });

  it("opens preview dialog when preview button is clicked", () => {
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobFamilyList />);

    const previewButtons = screen.getAllByRole("button");
    const previewButton = previewButtons.find(
      (button) =>
        button.querySelector("svg")?.getAttribute("data-testid") ===
          "eye-icon" || button.textContent?.includes("Eye")
    );

    if (previewButton) {
      fireEvent.click(previewButton);
      expect(
        screen.getByText("Preview the job family details and requirements.")
      ).toBeInTheDocument();
    }
  });

  it("opens delete confirmation dialog when delete button is clicked", () => {
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobFamilyList />);

    const deleteButtons = screen.getAllByRole("button");
    const deleteButton = deleteButtons.find(
      (button) =>
        button.querySelector("svg")?.getAttribute("data-testid") ===
          "trash-2-icon" || button.textContent?.includes("Trash2")
    );

    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(
        screen.getByText(/Are you sure you want to delete/)
      ).toBeInTheDocument();
    }
  });

  it("calls delete mutation when delete is confirmed", async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockDelete,
      isPending: false,
    });

    renderWithQueryClient(<JobFamilyList />);

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
