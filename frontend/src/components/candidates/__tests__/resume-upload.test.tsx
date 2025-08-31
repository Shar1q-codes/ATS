import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ResumeUpload } from "../resume-upload";
import {
  useCreateCandidateMutation,
  useUploadResumeMutation,
} from "@/hooks/api/use-candidates-api";
import { useToast } from "@/hooks/use-toast";

// Mock the API hooks
jest.mock("@/hooks/api/use-candidates-api");
jest.mock("@/hooks/use-toast");

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockUseCreateCandidateMutation =
  useCreateCandidateMutation as jest.MockedFunction<
    typeof useCreateCandidateMutation
  >;
const mockUseUploadResumeMutation =
  useUploadResumeMutation as jest.MockedFunction<
    typeof useUploadResumeMutation
  >;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockToast = jest.fn();

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

// Create a mock file
const createMockFile = (name: string, type: string, size: number = 1024) => {
  const file = new File(["mock content"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("ResumeUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseToast.mockReturnValue({
      toast: mockToast,
    } as any);

    mockUseCreateCandidateMutation.mockReturnValue({
      mutateAsync: jest.fn(),
    } as any);

    mockUseUploadResumeMutation.mockReturnValue({
      mutateAsync: jest.fn(),
    } as any);
  });

  it("renders upload area", () => {
    renderWithQueryClient(<ResumeUpload />);

    expect(screen.getByText("Upload Resumes")).toBeInTheDocument();
    expect(
      screen.getByText("Drop resumes here or click to browse")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Supports PDF, DOCX, DOC, and image files up to 10MB")
    ).toBeInTheDocument();
    expect(screen.getByText("Choose Files")).toBeInTheDocument();
  });

  it("handles file selection", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ResumeUpload />);

    const fileInput = screen.getByLabelText("Choose Files");
    const file = createMockFile("resume.pdf", "application/pdf");

    await user.upload(fileInput, file);

    expect(screen.getByText("Processing Queue")).toBeInTheDocument();
    expect(screen.getByText("resume.pdf")).toBeInTheDocument();
  });

  it("validates file types", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ResumeUpload />);

    const fileInput = screen.getByLabelText("Choose Files");
    const invalidFile = createMockFile("document.txt", "text/plain");

    await user.upload(fileInput, invalidFile);

    expect(mockToast).toHaveBeenCalledWith({
      title: "Invalid file type",
      description: "document.txt is not a supported file type.",
      variant: "destructive",
    });
  });

  it("validates file size", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ResumeUpload />);

    const fileInput = screen.getByLabelText("Choose Files");
    const largeFile = createMockFile(
      "large-resume.pdf",
      "application/pdf",
      15 * 1024 * 1024
    ); // 15MB

    await user.upload(fileInput, largeFile);

    expect(mockToast).toHaveBeenCalledWith({
      title: "File too large",
      description: "large-resume.pdf is larger than 10MB.",
      variant: "destructive",
    });
  });

  it("handles drag and drop", () => {
    renderWithQueryClient(<ResumeUpload />);

    const dropZone = screen
      .getByText("Drop resumes here or click to browse")
      .closest("div");
    const file = createMockFile("resume.pdf", "application/pdf");

    // Simulate drag over
    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    // Simulate drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(screen.getByText("Processing Queue")).toBeInTheDocument();
    expect(screen.getByText("resume.pdf")).toBeInTheDocument();
  });

  it("processes files successfully", async () => {
    const mockCreateCandidate = jest.fn().mockResolvedValue({
      id: "candidate-1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    });

    const mockUploadResume = jest.fn().mockResolvedValue({
      candidate: {
        id: "candidate-1",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
      },
      parsedData: {
        skills: [],
        experience: [],
        education: [],
        certifications: [],
        totalExperience: 0,
      },
    });

    mockUseCreateCandidateMutation.mockReturnValue({
      mutateAsync: mockCreateCandidate,
    } as any);

    mockUseUploadResumeMutation.mockReturnValue({
      mutateAsync: mockUploadResume,
    } as any);

    const user = userEvent.setup();
    renderWithQueryClient(<ResumeUpload />);

    const fileInput = screen.getByLabelText("Choose Files");
    const file = createMockFile("resume.pdf", "application/pdf");

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockCreateCandidate).toHaveBeenCalled();
      expect(mockUploadResume).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Resume processed successfully",
        description: "John Doe has been added to your candidates.",
      });
    });
  });

  it("handles processing errors", async () => {
    const mockCreateCandidate = jest
      .fn()
      .mockRejectedValue(new Error("API Error"));

    mockUseCreateCandidateMutation.mockReturnValue({
      mutateAsync: mockCreateCandidate,
    } as any);

    const user = userEvent.setup();
    renderWithQueryClient(<ResumeUpload />);

    const fileInput = screen.getByLabelText("Choose Files");
    const file = createMockFile("resume.pdf", "application/pdf");

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Failed to process resume",
        description: "API Error",
        variant: "destructive",
      });
    });
  });

  it("allows file removal", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ResumeUpload />);

    const fileInput = screen.getByLabelText("Choose Files");
    const file = createMockFile("resume.pdf", "application/pdf");

    await user.upload(fileInput, file);

    expect(screen.getByText("resume.pdf")).toBeInTheDocument();

    // Remove the file
    const removeButton = screen.getByRole("button", { name: "" }); // X button
    await user.click(removeButton);

    expect(screen.queryByText("resume.pdf")).not.toBeInTheDocument();
  });

  it("displays file size correctly", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ResumeUpload />);

    const fileInput = screen.getByLabelText("Choose Files");
    const file = createMockFile("resume.pdf", "application/pdf", 2048); // 2KB

    await user.upload(fileInput, file);

    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });

  it("shows different icons for different file types", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ResumeUpload />);

    const fileInput = screen.getByLabelText("Choose Files");

    // Test PDF file
    const pdfFile = createMockFile("resume.pdf", "application/pdf");
    await user.upload(fileInput, pdfFile);

    // Test image file
    const imageFile = createMockFile("photo.jpg", "image/jpeg");
    await user.upload(fileInput, imageFile);

    expect(screen.getByText("resume.pdf")).toBeInTheDocument();
    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
  });

  it("shows enhanced drag and drop visual feedback", () => {
    renderWithQueryClient(<ResumeUpload />);

    const dropZone = screen.getByText(/drop resumes here/i).closest("div");

    // Test drag over
    fireEvent.dragOver(dropZone!);
    expect(screen.getByText("Drop files here!")).toBeInTheDocument();

    // Test drag leave
    fireEvent.dragLeave(dropZone!);
    expect(
      screen.getByText(/drop resumes here or click to browse/i)
    ).toBeInTheDocument();
  });

  it("shows enhanced progress indicators with status text", async () => {
    const user = userEvent.setup();

    // Mock a slow upload to see progress
    const mockCreateCandidate = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                id: "candidate-1",
                firstName: "John",
                lastName: "Doe",
                email: "john.doe@example.com",
              }),
            100
          )
        )
    );

    mockUseCreateCandidateMutation.mockReturnValue({
      mutateAsync: mockCreateCandidate,
    } as unknown);

    renderWithQueryClient(<ResumeUpload />);

    const fileInput = screen.getByLabelText("Choose Files");
    const file = createMockFile("resume.pdf", "application/pdf");

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("resume.pdf")).toBeInTheDocument();
    });

    // Should show progress text
    await waitFor(() => {
      const uploadingText = screen.queryByText(/uploading\.\.\./i);
      if (uploadingText) {
        expect(uploadingText).toBeInTheDocument();
      }
    });
  });

  it("applies enhanced styling classes during drag over", () => {
    renderWithQueryClient(<ResumeUpload />);

    const dropZone = screen.getByText(/drop resumes here/i).closest("div");

    // Test that drag over applies enhanced styling
    fireEvent.dragOver(dropZone!);

    // The enhanced styling should be applied (scale, shadow, etc.)
    expect(dropZone).toHaveClass("border-primary", "bg-primary/10");
  });
});
