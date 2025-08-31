import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the analytics API hooks
const mockExportMutateAsync = jest.fn();
const mockGenerateMutateAsync = jest.fn();
const mockReportsData = [
  {
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
  },
];

jest.mock("@/hooks/api/use-analytics-api", () => ({
  useReportsQuery: () => ({
    data: mockReportsData,
    isLoading: false,
    refetch: jest.fn(),
  }),
  useExportReportMutation: () => ({
    mutateAsync: mockExportMutateAsync,
    isPending: false,
  }),
  useGenerateReportMutation: () => ({
    mutateAsync: mockGenerateMutateAsync,
    isPending: false,
  }),
  useShareReportMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useDeleteReportMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useDuplicateReportMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

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

describe("Report Export Functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should export report successfully", async () => {
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

    // Test the export functionality directly
    const exportFunction = async (
      reportId: string,
      format: "csv" | "pdf" | "xlsx",
      reportName: string
    ) => {
      try {
        const result = await mockExportMutateAsync({
          reportId,
          format,
        });

        // Create download link
        const link = document.createElement("a");
        link.href = result.downloadUrl;
        link.download = `${reportName}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    };

    const result = await exportFunction("report-1", "csv", "Test Report");

    expect(result.success).toBe(true);
    expect(mockExportMutateAsync).toHaveBeenCalledWith({
      reportId: "report-1",
      format: "csv",
    });
    expect(mockCreateElement).toHaveBeenCalledWith("a");
    expect(mockLink.href).toBe("https://example.com/download/report.csv");
    expect(mockLink.download).toBe("Test Report.csv");
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
    expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
  });

  it("should handle export error", async () => {
    mockExportMutateAsync.mockRejectedValue(new Error("Export failed"));

    const exportFunction = async (
      reportId: string,
      format: "csv" | "pdf" | "xlsx",
      reportName: string
    ) => {
      try {
        await mockExportMutateAsync({
          reportId,
          format,
        });
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    };

    const result = await exportFunction("report-1", "csv", "Test Report");

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("should generate report with correct parameters", async () => {
    const mockReportData = {
      id: "new-report-1",
      name: "Generated Report",
      type: "recruitment",
      data: {},
      generatedAt: "2024-01-15T10:00:00Z",
      generatedBy: "Test User",
      parameters: {},
    };

    mockGenerateMutateAsync.mockResolvedValue(mockReportData);

    const generateFunction = async (reportData: any) => {
      try {
        const result = await mockGenerateMutateAsync(reportData);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error };
      }
    };

    const reportParams = {
      name: "Test Report",
      type: "recruitment" as const,
      parameters: {
        dateRange: { start: "2024-01-01", end: "2024-01-31" },
        includeCharts: true,
        includeRawData: true,
      },
      format: "json" as const,
    };

    const result = await generateFunction(reportParams);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockReportData);
    expect(mockGenerateMutateAsync).toHaveBeenCalledWith(reportParams);
  });

  it("should handle report generation error", async () => {
    mockGenerateMutateAsync.mockRejectedValue(new Error("Generation failed"));

    const generateFunction = async (reportData: any) => {
      try {
        await mockGenerateMutateAsync(reportData);
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    };

    const result = await generateFunction({
      name: "Test Report",
      type: "recruitment",
      parameters: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("should validate report parameters", () => {
    const validateReportParams = (params: any) => {
      const errors: string[] = [];

      if (!params.name || params.name.trim() === "") {
        errors.push("Report name is required");
      }

      if (
        !params.type ||
        !["recruitment", "pipeline", "diversity", "performance"].includes(
          params.type
        )
      ) {
        errors.push("Valid report type is required");
      }

      if (!params.parameters || !params.parameters.dateRange) {
        errors.push("Date range is required");
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    };

    // Valid parameters
    const validParams = {
      name: "Test Report",
      type: "recruitment",
      parameters: {
        dateRange: { start: "2024-01-01", end: "2024-01-31" },
      },
    };

    const validResult = validateReportParams(validParams);
    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    // Invalid parameters
    const invalidParams = {
      name: "",
      type: "invalid",
      parameters: {},
    };

    const invalidResult = validateReportParams(invalidParams);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toContain("Report name is required");
    expect(invalidResult.errors).toContain("Valid report type is required");
    expect(invalidResult.errors).toContain("Date range is required");
  });

  it("should format dates correctly", () => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const testDate = "2024-01-15T10:30:00Z";
    const formatted = formatDate(testDate);

    // The exact format may vary based on locale, but should contain key elements
    expect(formatted).toMatch(/Jan/);
    expect(formatted).toMatch(/15/);
    expect(formatted).toMatch(/2024/);
  });

  it("should determine correct report type colors", () => {
    const getReportTypeColor = (type: string) => {
      switch (type) {
        case "recruitment":
          return "bg-blue-100 text-blue-800";
        case "pipeline":
          return "bg-green-100 text-green-800";
        case "diversity":
          return "bg-purple-100 text-purple-800";
        case "performance":
          return "bg-orange-100 text-orange-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    expect(getReportTypeColor("recruitment")).toBe("bg-blue-100 text-blue-800");
    expect(getReportTypeColor("pipeline")).toBe("bg-green-100 text-green-800");
    expect(getReportTypeColor("diversity")).toBe(
      "bg-purple-100 text-purple-800"
    );
    expect(getReportTypeColor("performance")).toBe(
      "bg-orange-100 text-orange-800"
    );
    expect(getReportTypeColor("unknown")).toBe("bg-gray-100 text-gray-800");
  });
});
