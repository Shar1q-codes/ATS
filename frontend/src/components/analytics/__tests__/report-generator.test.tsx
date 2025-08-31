import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportGenerator } from "../report-generator";

// Mock the hooks
const mockUseReportsQuery = jest.fn();
const mockUseGenerateReportMutation = jest.fn();
const mockUseExportReportMutation = jest.fn();
const mockUseReportQuery = jest.fn();
const mockUseToast = jest.fn();

jest.mock("@/hooks/api/use-analytics-api", () => ({
  useReportsQuery: () => mockUseReportsQuery(),
  useGenerateReportMutation: () => mockUseGenerateReportMutation(),
  useExportReportMutation: () => mockUseExportReportMutation(),
  useReportQuery: () => mockUseReportQuery(),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockUseToast }),
}));

const mockReports = [
  {
    id: "1",
    name: "Monthly Recruitment Report",
    type: "recruitment" as const,
    generatedAt: "2024-01-15T10:00:00Z",
    generatedBy: "John Doe",
    data: {},
    parameters: {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      includeCharts: true,
      includeRawData: true,
    },
  },
  {
    id: "2",
    name: "Pipeline Analysis",
    type: "pipeline" as const,
    generatedAt: "2024-01-14T15:30:00Z",
    generatedBy: "Jane Smith",
    data: {},
    parameters: {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      includeCharts: true,
      includeRawData: false,
    },
  },
];

describe("ReportGenerator", () => {
  const mockMutateAsync = jest.fn();
  const mockRefetch = jest.fn();

  beforeEach(() => {
    mockUseReportsQuery.mockReturnValue({
      data: mockReports,
      isLoading: false,
      refetch: mockRefetch,
    });
    mockUseGenerateReportMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
    mockUseExportReportMutation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    mockUseReportQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders report generator interface", () => {
    render(<ReportGenerator />);

    expect(screen.getByText("Report Generator")).toBeInTheDocument();
    expect(
      screen.getByText("Generate and export custom analytics reports")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /generate report/i })
    ).toBeInTheDocument();
  });

  it("displays existing reports", () => {
    render(<ReportGenerator />);

    expect(screen.getByText("Generated Reports")).toBeInTheDocument();
    expect(screen.getByText("Monthly Recruitment Report")).toBeInTheDocument();
    expect(screen.getByText("Pipeline Analysis")).toBeInTheDocument();
    expect(screen.getByText("recruitment")).toBeInTheDocument();
    expect(screen.getByText("pipeline")).toBeInTheDocument();
  });

  it("shows loading state when reports are loading", () => {
    mockUseReportsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
    });

    render(<ReportGenerator />);

    // Check for loading spinner by class
    const loadingElement = document.querySelector(".animate-spin");
    expect(loadingElement).toBeInTheDocument();
  });

  it("shows empty state when no reports exist", () => {
    mockUseReportsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetch,
    });

    render(<ReportGenerator />);

    expect(screen.getByText("No reports generated yet")).toBeInTheDocument();
    expect(
      screen.getByText('Click "Generate Report" to create your first report')
    ).toBeInTheDocument();
  });

  it("opens generate report dialog when button is clicked", () => {
    render(<ReportGenerator />);

    const generateButton = screen.getByRole("button", {
      name: /generate report/i,
    });
    fireEvent.click(generateButton);

    expect(screen.getByText("Generate New Report")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create a custom analytics report with your specified parameters"
      )
    ).toBeInTheDocument();
  });

  it("validates report name before generation", async () => {
    render(<ReportGenerator />);

    // Open dialog
    const generateButton = screen.getByRole("button", {
      name: /generate report/i,
    });
    fireEvent.click(generateButton);

    // Try to generate without name
    const submitButton = screen.getAllByRole("button", {
      name: /generate report/i,
    })[1]; // Second button is in dialog
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUseToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Please enter a report name",
        variant: "destructive",
      });
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("generates report with valid data", async () => {
    mockMutateAsync.mockResolvedValue({ id: "new-report" });

    render(<ReportGenerator />);

    // Open dialog
    const generateButton = screen.getByRole("button", {
      name: /generate report/i,
    });
    fireEvent.click(generateButton);

    // Fill in form
    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Test Report" } });

    // Submit
    const submitButton = screen.getAllByRole("button", {
      name: /generate report/i,
    })[1];
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: "Test Report",
        type: "recruitment",
        parameters: expect.objectContaining({
          dateRange: expect.any(Object),
          includeCharts: true,
          includeRawData: true,
        }),
        format: "json",
      });
    });

    expect(mockUseToast).toHaveBeenCalledWith({
      title: "Success",
      description: "Report generated successfully",
    });

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("handles report generation error", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Generation failed"));

    render(<ReportGenerator />);

    // Open dialog and fill form
    const generateButton = screen.getByRole("button", {
      name: /generate report/i,
    });
    fireEvent.click(generateButton);

    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Test Report" } });

    const submitButton = screen.getAllByRole("button", {
      name: /generate report/i,
    })[1];
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUseToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    });
  });

  it("displays quick export options", () => {
    render(<ReportGenerator />);

    expect(screen.getByText("Quick Export Options")).toBeInTheDocument();
    expect(screen.getByText("Export CSV")).toBeInTheDocument();
    expect(screen.getByText("Export PDF")).toBeInTheDocument();
    expect(screen.getByText("Export Excel")).toBeInTheDocument();
    expect(screen.getByText("Share Link")).toBeInTheDocument();
  });

  it("formats report dates correctly", () => {
    render(<ReportGenerator />);

    // Check if dates are formatted properly
    expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 14, 2024/)).toBeInTheDocument();
  });

  it("shows correct report type badges", () => {
    render(<ReportGenerator />);

    const recruitmentBadge = screen.getByText("recruitment");
    const pipelineBadge = screen.getByText("pipeline");

    expect(recruitmentBadge).toBeInTheDocument();
    expect(pipelineBadge).toBeInTheDocument();
  });
});
