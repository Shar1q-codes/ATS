import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReportsPage from "../page";
import {
  useReportsQuery,
  useExportReportMutation,
  ReportData,
} from "@/hooks/api/use-analytics-api";
import { useToast } from "@/hooks/use-toast";

// Mock the hooks
jest.mock("@/hooks/api/use-analytics-api");
jest.mock("@/hooks/use-toast");

const mockUseReportsQuery = useReportsQuery as jest.MockedFunction<
  typeof useReportsQuery
>;
const mockUseExportReportMutation =
  useExportReportMutation as jest.MockedFunction<
    typeof useExportReportMutation
  >;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockToast = jest.fn();
mockUseToast.mockReturnValue({ toast: mockToast });

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockReports: ReportData[] = [
  {
    id: "report-1",
    name: "Monthly Recruitment Report",
    type: "recruitment",
    data: { totalApplications: 100 },
    generatedAt: "2024-01-15T10:00:00Z",
    generatedBy: "John Doe",
    parameters: {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      includeCharts: true,
      includeRawData: true,
    },
  },
  {
    id: "report-2",
    name: "Pipeline Analysis Q1",
    type: "pipeline",
    data: { stageDistribution: {} },
    generatedAt: "2024-01-10T14:30:00Z",
    generatedBy: "Jane Smith",
    parameters: {
      dateRange: { start: "2024-01-01", end: "2024-03-31" },
      includeCharts: true,
      includeRawData: false,
    },
  },
  {
    id: "report-3",
    name: "Diversity Metrics Report",
    type: "diversity",
    data: { genderDistribution: {} },
    generatedAt: "2024-01-05T09:15:00Z",
    generatedBy: "Bob Johnson",
    parameters: {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      includeCharts: true,
      includeRawData: true,
    },
  },
];

describe("ReportsPage", () => {
  const mockRefetch = jest.fn();
  const mockExportMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReportsQuery.mockReturnValue({
      data: mockReports,
      isLoading: false,
      refetch: mockRefetch,
    } as any);
    mockUseExportReportMutation.mockReturnValue({
      mutateAsync: mockExportMutateAsync,
      isPending: false,
    } as any);
  });

  it("renders reports page with header", () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(
      screen.getByText("Manage and export your analytics reports")
    ).toBeInTheDocument();
    expect(screen.getByText("Generate Report")).toBeInTheDocument();
  });

  it("displays reports in table", () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    expect(screen.getByText("Monthly Recruitment Report")).toBeInTheDocument();
    expect(screen.getByText("Pipeline Analysis Q1")).toBeInTheDocument();
    expect(screen.getByText("Diversity Metrics Report")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
  });

  it("filters reports by search query", () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText("Search reports...");
    fireEvent.change(searchInput, { target: { value: "Pipeline" } });

    expect(screen.getByText("Pipeline Analysis Q1")).toBeInTheDocument();
    expect(
      screen.queryByText("Monthly Recruitment Report")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Diversity Metrics Report")
    ).not.toBeInTheDocument();
  });

  it("filters reports by type", () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    const typeFilter = screen.getByRole("combobox");
    fireEvent.click(typeFilter);

    const recruitmentOption = screen.getByText("Recruitment");
    fireEvent.click(recruitmentOption);

    expect(screen.getByText("Monthly Recruitment Report")).toBeInTheDocument();
    expect(screen.queryByText("Pipeline Analysis Q1")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Diversity Metrics Report")
    ).not.toBeInTheDocument();
  });

  it("sorts reports by name", () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    const sortSelect = screen.getAllByRole("combobox")[1]; // Second combobox is sort
    fireEvent.click(sortSelect);

    const nameOption = screen.getByText("Name");
    fireEvent.click(nameOption);

    const reportRows = screen.getAllByRole("row");
    // Check that reports are sorted alphabetically (skip header row)
    expect(reportRows[1]).toHaveTextContent("Diversity Metrics Report");
    expect(reportRows[2]).toHaveTextContent("Monthly Recruitment Report");
    expect(reportRows[3]).toHaveTextContent("Pipeline Analysis Q1");
  });

  it("exports report successfully", async () => {
    mockExportMutateAsync.mockResolvedValue({
      downloadUrl: "https://example.com/download/report.csv",
    });

    // Mock document.createElement and appendChild/removeChild
    const mockLink = {
      href: "",
      download: "",
      click: jest.fn(),
    };
    const mockCreateElement = jest.fn().mockReturnValue(mockLink);
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();

    Object.assign(document, {
      createElement: mockCreateElement,
      body: {
        appendChild: mockAppendChild,
        removeChild: mockRemoveChild,
      },
    });

    render(<ReportsPage />, { wrapper: createWrapper() });

    // Find the first export dropdown and select CSV
    const exportButtons = screen.getAllByRole("combobox");
    const firstExportButton = exportButtons.find((button) =>
      button.querySelector("svg")?.classList.contains("lucide-download")
    );

    if (firstExportButton) {
      fireEvent.click(firstExportButton);

      const csvOption = screen.getByText("Export CSV");
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(mockExportMutateAsync).toHaveBeenCalledWith({
          reportId: "report-1",
          format: "csv",
        });
      });

      expect(mockLink.download).toBe("Monthly Recruitment Report.csv");
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Report exported as CSV",
      });
    }
  });

  it("handles export error", async () => {
    mockExportMutateAsync.mockRejectedValue(new Error("Export failed"));

    render(<ReportsPage />, { wrapper: createWrapper() });

    // Find the first export dropdown and select CSV
    const exportButtons = screen.getAllByRole("combobox");
    const firstExportButton = exportButtons.find((button) =>
      button.querySelector("svg")?.classList.contains("lucide-download")
    );

    if (firstExportButton) {
      fireEvent.click(firstExportButton);

      const csvOption = screen.getByText("Export CSV");
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to export report",
          variant: "destructive",
        });
      });
    }
  });

  it("shows loading state", () => {
    mockUseReportsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
    } as any);

    render(<ReportsPage />, { wrapper: createWrapper() });

    expect(screen.getByRole("status")).toBeInTheDocument(); // Loading spinner
  });

  it("shows empty state when no reports", () => {
    mockUseReportsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetch,
    } as any);

    render(<ReportsPage />, { wrapper: createWrapper() });

    expect(screen.getByText("No reports found")).toBeInTheDocument();
    expect(
      screen.getByText("Generate your first report to get started")
    ).toBeInTheDocument();
  });

  it("shows empty state with search message when filtered", () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText("Search reports...");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    expect(screen.getByText("No reports found")).toBeInTheDocument();
    expect(
      screen.getByText("Try adjusting your search or filters")
    ).toBeInTheDocument();
  });

  it("refreshes reports when refresh button clicked", () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("shows report generator when generate button clicked", () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    const generateButton = screen.getByText("Generate Report");
    fireEvent.click(generateButton);

    expect(screen.getByText("← Back to Reports")).toBeInTheDocument();
  });

  it("returns to reports list from generator", () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    // Go to generator
    const generateButton = screen.getByText("Generate Report");
    fireEvent.click(generateButton);

    // Return to list
    const backButton = screen.getByText("← Back to Reports");
    fireEvent.click(backButton);

    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.queryByText("← Back to Reports")).not.toBeInTheDocument();
  });

  it("displays correct report count", () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    expect(screen.getByText("3 reports found")).toBeInTheDocument();
  });

  it("displays singular report count", () => {
    mockUseReportsQuery.mockReturnValue({
      data: [mockReports[0]],
      isLoading: false,
      refetch: mockRefetch,
    } as any);

    render(<ReportsPage />, { wrapper: createWrapper() });

    expect(screen.getByText("1 report found")).toBeInTheDocument();
  });
});
