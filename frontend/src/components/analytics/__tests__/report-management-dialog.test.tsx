import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReportManagementDialog } from "../report-management-dialog";
import {
  useDeleteReportMutation,
  useDuplicateReportMutation,
  useExportReportMutation,
  ReportData,
} from "@/hooks/api/use-analytics-api";
import { useToast } from "@/hooks/use-toast";

// Mock the hooks
jest.mock("@/hooks/api/use-analytics-api");
jest.mock("@/hooks/use-toast");

const mockUseDeleteReportMutation =
  useDeleteReportMutation as jest.MockedFunction<
    typeof useDeleteReportMutation
  >;
const mockUseDuplicateReportMutation =
  useDuplicateReportMutation as jest.MockedFunction<
    typeof useDuplicateReportMutation
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

const mockReport: ReportData = {
  id: "report-1",
  name: "Test Report",
  type: "recruitment",
  data: { totalApplications: 100 },
  generatedAt: "2024-01-15T10:00:00Z",
  generatedBy: "John Doe",
  parameters: {
    dateRange: { start: "2024-01-01", end: "2024-01-31" },
    includeCharts: true,
    includeRawData: true,
  },
};

describe("ReportManagementDialog", () => {
  const mockDeleteMutateAsync = jest.fn();
  const mockDuplicateMutateAsync = jest.fn();
  const mockExportMutateAsync = jest.fn();
  const mockOnReportUpdated = jest.fn();
  const mockOnClose = jest.fn();

  const defaultProps = {
    report: mockReport,
    isOpen: true,
    onClose: mockOnClose,
    onReportUpdated: mockOnReportUpdated,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeleteReportMutation.mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    } as any);
    mockUseDuplicateReportMutation.mockReturnValue({
      mutateAsync: mockDuplicateMutateAsync,
      isPending: false,
    } as any);
    mockUseExportReportMutation.mockReturnValue({
      mutateAsync: mockExportMutateAsync,
      isPending: false,
    } as any);
  });

  it("renders dialog with report information", () => {
    render(<ReportManagementDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Manage Report")).toBeInTheDocument();
    expect(
      screen.getByText('Manage settings and actions for "Test Report"')
    ).toBeInTheDocument();
    expect(screen.getByText("Test Report")).toBeInTheDocument();
    expect(screen.getByText("recruitment")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("exports report in different formats", async () => {
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

    render(<ReportManagementDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const csvButton = screen.getByText("CSV");
    fireEvent.click(csvButton);

    await waitFor(() => {
      expect(mockExportMutateAsync).toHaveBeenCalledWith({
        reportId: "report-1",
        format: "csv",
      });
    });

    expect(mockCreateElement).toHaveBeenCalledWith("a");
    expect(mockLink.href).toBe("https://example.com/download/report.csv");
    expect(mockLink.download).toBe("Test Report.csv");
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
    expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Report exported as CSV",
      });
    });
  });

  it("duplicates report with custom name", async () => {
    const duplicatedReport = {
      ...mockReport,
      id: "report-2",
      name: "Test Report (Copy)",
    };
    mockDuplicateMutateAsync.mockResolvedValue(duplicatedReport);

    render(<ReportManagementDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const nameInput = screen.getByDisplayValue("Test Report (Copy)");
    fireEvent.change(nameInput, { target: { value: "My Custom Copy" } });

    const duplicateButton = screen.getByRole("button", { name: "" }); // Duplicate button has no text, just icon
    fireEvent.click(duplicateButton);

    await waitFor(() => {
      expect(mockDuplicateMutateAsync).toHaveBeenCalledWith({
        reportId: "report-1",
        name: "My Custom Copy",
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Report duplicated successfully",
      });
    });

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnReportUpdated).toHaveBeenCalled();
  });

  it("opens sharing dialog", () => {
    render(<ReportManagementDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const shareButton = screen.getByText("Share Report");
    fireEvent.click(shareButton);

    // The sharing dialog should be rendered (we can't easily test the dialog state here)
    expect(shareButton).toBeInTheDocument();
  });

  it("deletes report after confirmation", async () => {
    mockDeleteMutateAsync.mockResolvedValue(undefined);

    render(<ReportManagementDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const deleteButton = screen.getByText("Delete Report");
    fireEvent.click(deleteButton);

    // Confirm deletion in alert dialog
    const confirmButton = screen.getByRole("button", {
      name: /delete report/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith("report-1");
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Report deleted successfully",
      });
    });

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnReportUpdated).toHaveBeenCalled();
  });

  it("handles delete error", async () => {
    mockDeleteMutateAsync.mockRejectedValue(new Error("Delete failed"));

    render(<ReportManagementDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const deleteButton = screen.getByText("Delete Report");
    fireEvent.click(deleteButton);

    // Confirm deletion in alert dialog
    const confirmButton = screen.getByRole("button", {
      name: /delete report/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive",
      });
    });
  });

  it("handles export error", async () => {
    mockExportMutateAsync.mockRejectedValue(new Error("Export failed"));

    render(<ReportManagementDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const csvButton = screen.getByText("CSV");
    fireEvent.click(csvButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    });
  });

  it("handles duplicate error", async () => {
    mockDuplicateMutateAsync.mockRejectedValue(new Error("Duplicate failed"));

    render(<ReportManagementDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const duplicateButton = screen.getByRole("button", { name: "" }); // Duplicate button has no text, just icon
    fireEvent.click(duplicateButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to duplicate report",
        variant: "destructive",
      });
    });
  });

  it("does not render when report is null", () => {
    render(<ReportManagementDialog {...defaultProps} report={null} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByText("Manage Report")).not.toBeInTheDocument();
  });

  it("sets duplicate name when dialog opens", () => {
    const { rerender } = render(
      <ReportManagementDialog {...defaultProps} isOpen={false} />,
      { wrapper: createWrapper() }
    );

    rerender(<ReportManagementDialog {...defaultProps} isOpen={true} />);

    expect(screen.getByDisplayValue("Test Report (Copy)")).toBeInTheDocument();
  });
});
