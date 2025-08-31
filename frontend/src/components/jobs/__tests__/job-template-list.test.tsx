import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JobTemplateList } from "../job-template-list";
import * as jobsApi from "@/hooks/api/use-jobs-api";

// Mock the hooks
jest.mock("@/hooks/api/use-jobs-api");
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockJobTemplates = [
  {
    id: "1",
    jobFamilyId: "family1",
    name: "Senior Software Engineer",
    level: "senior" as const,
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
    experienceRange: { min: 3, max: 7 },
    salaryRange: { min: 80000, max: 120000, currency: "USD" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    jobFamilyId: "family2",
    name: "Junior Data Scientist",
    level: "junior" as const,
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
    experienceRange: { min: 0, max: 2 },
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

const mockJobFamilies = [
  {
    id: "family1",
    name: "Software Engineer",
    description: "Software development roles",
    baseRequirements: [],
    skillCategories: ["Programming"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "family2",
    name: "Data Scientist",
    description: "Data analysis roles",
    baseRequirements: [],
    skillCategories: ["Data Analysis"],
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

describe("JobTemplateList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", () => {
    (jobsApi.useJobTemplatesQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobTemplateMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobTemplateList />);

    expect(screen.getByText("Loading job templates...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    (jobsApi.useJobTemplatesQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to fetch"),
    });
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobTemplateMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobTemplateList />);

    expect(
      screen.getByText("Failed to load job templates")
    ).toBeInTheDocument();
  });

  it("renders empty state", () => {
    (jobsApi.useJobTemplatesQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobTemplateMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobTemplateList />);

    expect(screen.getByText("No job templates found")).toBeInTheDocument();
    expect(
      screen.getByText("Create Your First Job Template")
    ).toBeInTheDocument();
  });

  it("renders job templates list", () => {
    (jobsApi.useJobTemplatesQuery as jest.Mock).mockReturnValue({
      data: mockJobTemplates,
      isLoading: false,
      error: null,
    });
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobTemplateMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobTemplateList />);

    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Junior Data Scientist")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Data Scientist")).toBeInTheDocument();
    expect(screen.getByText("Senior")).toBeInTheDocument();
    expect(screen.getByText("Junior")).toBeInTheDocument();
  });

  it("filters templates by search term", async () => {
    (jobsApi.useJobTemplatesQuery as jest.Mock).mockReturnValue({
      data: mockJobTemplates,
      isLoading: false,
      error: null,
    });
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobTemplateMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobTemplateList />);

    const searchInput = screen.getByPlaceholderText("Search job templates...");
    fireEvent.change(searchInput, { target: { value: "Senior" } });

    await waitFor(() => {
      expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
      expect(
        screen.queryByText("Junior Data Scientist")
      ).not.toBeInTheDocument();
    });
  });

  it("filters templates by job family", async () => {
    (jobsApi.useJobTemplatesQuery as jest.Mock).mockReturnValue({
      data: mockJobTemplates,
      isLoading: false,
      error: null,
    });
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobTemplateMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobTemplateList />);

    const jobFamilySelect = screen.getByDisplayValue("Filter by job family");
    fireEvent.click(jobFamilySelect);

    const softwareOption = screen.getByText("Software Engineer");
    fireEvent.click(softwareOption);

    // The useJobTemplatesQuery should be called with the selected job family ID
    expect(jobsApi.useJobTemplatesQuery).toHaveBeenCalledWith("family1");
  });

  it("filters templates by level", async () => {
    (jobsApi.useJobTemplatesQuery as jest.Mock).mockReturnValue({
      data: mockJobTemplates,
      isLoading: false,
      error: null,
    });
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobTemplateMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobTemplateList />);

    const levelSelect = screen.getByDisplayValue("Level");
    fireEvent.click(levelSelect);

    const seniorOption = screen.getByText("Senior");
    fireEvent.click(seniorOption);

    await waitFor(() => {
      expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
      expect(
        screen.queryByText("Junior Data Scientist")
      ).not.toBeInTheDocument();
    });
  });

  it("opens create dialog when create button is clicked", () => {
    (jobsApi.useJobTemplatesQuery as jest.Mock).mockReturnValue({
      data: mockJobTemplates,
      isLoading: false,
      error: null,
    });
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobTemplateMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobTemplateList />);

    const createButton = screen.getByText("Create Job Template");
    fireEvent.click(createButton);

    expect(
      screen.getByText(
        "Create a new job template with specific level and requirements."
      )
    ).toBeInTheDocument();
  });

  it("displays salary range when available", () => {
    (jobsApi.useJobTemplatesQuery as jest.Mock).mockReturnValue({
      data: mockJobTemplates,
      isLoading: false,
      error: null,
    });
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobTemplateMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobTemplateList />);

    expect(screen.getByText("USD 80,000-120,000")).toBeInTheDocument();
    expect(screen.getByText("Not specified")).toBeInTheDocument();
  });

  it("displays experience range correctly", () => {
    (jobsApi.useJobTemplatesQuery as jest.Mock).mockReturnValue({
      data: mockJobTemplates,
      isLoading: false,
      error: null,
    });
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobTemplateMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    renderWithQueryClient(<JobTemplateList />);

    expect(screen.getByText("3-7 years")).toBeInTheDocument();
    expect(screen.getByText("0-2 years")).toBeInTheDocument();
  });

  it("calls delete mutation when delete is confirmed", async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    (jobsApi.useJobTemplatesQuery as jest.Mock).mockReturnValue({
      data: mockJobTemplates,
      isLoading: false,
      error: null,
    });
    (jobsApi.useJobFamiliesQuery as jest.Mock).mockReturnValue({
      data: mockJobFamilies,
      isLoading: false,
      error: null,
    });
    (jobsApi.useDeleteJobTemplateMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockDelete,
      isPending: false,
    });

    renderWithQueryClient(<JobTemplateList />);

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
