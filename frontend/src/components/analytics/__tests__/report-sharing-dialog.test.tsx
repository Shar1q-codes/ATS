import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReportSharingDialog } from "../report-sharing-dialog";
import { useShareReportMutation } from "@/hooks/api/use-analytics-api";
import { useToast } from "@/hooks/use-toast";

// Mock the hooks
jest.mock("@/hooks/api/use-analytics-api");
jest.mock("@/hooks/use-toast");

const mockUseShareReportMutation =
  useShareReportMutation as jest.MockedFunction<typeof useShareReportMutation>;
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

describe("ReportSharingDialog", () => {
  const mockMutateAsync = jest.fn();
  const defaultProps = {
    reportId: "report-1",
    reportName: "Test Report",
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseShareReportMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);
  });

  it("renders dialog with report name", () => {
    render(<ReportSharingDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Share Report")).toBeInTheDocument();
    expect(
      screen.getByText(
        'Share "Test Report" with others by generating a secure link'
      )
    ).toBeInTheDocument();
  });

  it("allows setting permissions", () => {
    render(<ReportSharingDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const permissionsSelect = screen.getByRole("combobox");
    fireEvent.click(permissionsSelect);

    expect(screen.getByText("View Only")).toBeInTheDocument();
    expect(screen.getByText("View & Edit")).toBeInTheDocument();
  });

  it("shows expiration date input when expiration is enabled", () => {
    render(<ReportSharingDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const expirationSwitch = screen.getByRole("switch", {
      name: /set expiration date/i,
    });
    fireEvent.click(expirationSwitch);

    expect(screen.getByDisplayValue("")).toBeInTheDocument(); // datetime-local input
  });

  it("shows password input when password protection is enabled", () => {
    render(<ReportSharingDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const passwordSwitch = screen.getByRole("switch", {
      name: /password protection/i,
    });
    fireEvent.click(passwordSwitch);

    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
  });

  it("generates share link successfully", async () => {
    const mockShareUrl = "https://example.com/share/abc123";
    mockMutateAsync.mockResolvedValue({
      shareUrl: mockShareUrl,
      shareId: "abc123",
    });

    render(<ReportSharingDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const generateButton = screen.getByText("Generate Share Link");
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        reportId: "report-1",
        permissions: "view",
        expiresAt: undefined,
        password: undefined,
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Share link generated successfully",
      });
    });
  });

  it("handles share link generation error", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Failed to generate"));

    render(<ReportSharingDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const generateButton = screen.getByText("Generate Share Link");
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive",
      });
    });
  });

  it("copies share link to clipboard", async () => {
    const mockShareUrl = "https://example.com/share/abc123";
    mockMutateAsync.mockResolvedValue({
      shareUrl: mockShareUrl,
      shareId: "abc123",
    });

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    render(<ReportSharingDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    // Generate link first
    const generateButton = screen.getByText("Generate Share Link");
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockShareUrl)).toBeInTheDocument();
    });

    // Copy link
    const copyButton = screen.getByRole("button", { name: "" }); // Copy button has no text, just icon
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockShareUrl);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Copied",
        description: "Share link copied to clipboard",
      });
    });
  });

  it("opens email client with share link", async () => {
    const mockShareUrl = "https://example.com/share/abc123";
    mockMutateAsync.mockResolvedValue({
      shareUrl: mockShareUrl,
      shareId: "abc123",
    });

    // Mock window.open
    const mockOpen = jest.fn();
    Object.assign(window, { open: mockOpen });

    render(<ReportSharingDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    // Generate link first
    const generateButton = screen.getByText("Generate Share Link");
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockShareUrl)).toBeInTheDocument();
    });

    // Fill email form
    const emailInput = screen.getByPlaceholderText(
      "Enter email addresses (comma separated)"
    );
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const messageInput = screen.getByPlaceholderText(
      "Add a personal message (optional)"
    );
    fireEvent.change(messageInput, {
      target: { value: "Check out this report!" },
    });

    // Send email
    const sendButton = screen.getByText("Send Email");
    fireEvent.click(sendButton);

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining("mailto:test@example.com")
    );
  });

  it("resets form when dialog closes", () => {
    const { rerender } = render(<ReportSharingDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    // Enable some options
    const expirationSwitch = screen.getByRole("switch", {
      name: /set expiration date/i,
    });
    fireEvent.click(expirationSwitch);

    // Close dialog
    rerender(<ReportSharingDialog {...defaultProps} isOpen={false} />);

    // Reopen dialog
    rerender(<ReportSharingDialog {...defaultProps} isOpen={true} />);

    // Check that form is reset
    const expirationSwitchAfter = screen.getByRole("switch", {
      name: /set expiration date/i,
    });
    expect(expirationSwitchAfter).not.toBeChecked();
  });
});
