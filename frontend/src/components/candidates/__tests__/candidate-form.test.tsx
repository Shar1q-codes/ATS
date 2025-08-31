import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CandidateForm } from "../candidate-form";
import { useCreateCandidateMutation } from "@/hooks/api/use-candidates-api";
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
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockToast = jest.fn();
const mockPush = jest.fn();

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

describe("CandidateForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseToast.mockReturnValue({
      toast: mockToast,
    } as any);

    mockUseCreateCandidateMutation.mockReturnValue({
      mutateAsync: jest.fn(),
    } as any);
  });

  it("renders form fields", () => {
    renderWithQueryClient(<CandidateForm />);

    expect(screen.getByText("Basic Information")).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/)).toBeInTheDocument();
    expect(screen.getByLabelText(/LinkedIn Profile/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Portfolio\/Website/)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/I consent to the processing/)
    ).toBeInTheDocument();
  });

  it("shows validation errors for required fields", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<CandidateForm />);

    const submitButton = screen.getByText("Create Candidate");
    await user.click(submitButton);

    expect(screen.getByText("First name is required")).toBeInTheDocument();
    expect(screen.getByText("Last name is required")).toBeInTheDocument();
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    expect(
      screen.getByText("Consent is required to create a candidate profile")
    ).toBeInTheDocument();
  });

  it("validates email format", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<CandidateForm />);

    const emailInput = screen.getByLabelText(/Email Address/);
    await user.type(emailInput, "invalid-email");

    const submitButton = screen.getByText("Create Candidate");
    await user.click(submitButton);

    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
  });

  it("validates URL formats", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<CandidateForm />);

    const linkedinInput = screen.getByLabelText(/LinkedIn Profile/);
    const portfolioInput = screen.getByLabelText(/Portfolio\/Website/);

    await user.type(linkedinInput, "not-a-url");
    await user.type(portfolioInput, "also-not-a-url");

    const submitButton = screen.getByText("Create Candidate");
    await user.click(submitButton);

    expect(screen.getByText("Invalid LinkedIn URL")).toBeInTheDocument();
    expect(screen.getByText("Invalid portfolio URL")).toBeInTheDocument();
  });

  it("submits form with valid data", async () => {
    const mockCreateCandidate = jest.fn().mockResolvedValue({
      id: "candidate-1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    });

    mockUseCreateCandidateMutation.mockReturnValue({
      mutateAsync: mockCreateCandidate,
    } as any);

    const user = userEvent.setup();
    renderWithQueryClient(<CandidateForm />);

    // Fill in required fields
    await user.type(screen.getByLabelText(/First Name/), "John");
    await user.type(screen.getByLabelText(/Last Name/), "Doe");
    await user.type(
      screen.getByLabelText(/Email Address/),
      "john.doe@example.com"
    );
    await user.click(screen.getByLabelText(/I consent to the processing/));

    // Fill in optional fields
    await user.type(screen.getByLabelText(/Phone Number/), "+1234567890");
    await user.type(screen.getByLabelText(/Location/), "New York, NY");
    await user.type(
      screen.getByLabelText(/LinkedIn Profile/),
      "https://linkedin.com/in/johndoe"
    );
    await user.type(
      screen.getByLabelText(/Portfolio\/Website/),
      "https://johndoe.dev"
    );

    const submitButton = screen.getByText("Create Candidate");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateCandidate).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1234567890",
        location: "New York, NY",
        linkedinUrl: "https://linkedin.com/in/johndoe",
        portfolioUrl: "https://johndoe.dev",
        consentGiven: true,
      });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Candidate created successfully",
      description: "John Doe has been added to your candidates.",
    });
  });

  it("handles submission errors", async () => {
    const mockCreateCandidate = jest
      .fn()
      .mockRejectedValue(new Error("API Error"));

    mockUseCreateCandidateMutation.mockReturnValue({
      mutateAsync: mockCreateCandidate,
    } as any);

    const user = userEvent.setup();
    renderWithQueryClient(<CandidateForm />);

    // Fill in required fields
    await user.type(screen.getByLabelText(/First Name/), "John");
    await user.type(screen.getByLabelText(/Last Name/), "Doe");
    await user.type(
      screen.getByLabelText(/Email Address/),
      "john.doe@example.com"
    );
    await user.click(screen.getByLabelText(/I consent to the processing/));

    const submitButton = screen.getByText("Create Candidate");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Failed to create candidate",
        description: "API Error",
        variant: "destructive",
      });
    });
  });

  it("shows loading state during submission", async () => {
    const mockCreateCandidate = jest
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

    mockUseCreateCandidateMutation.mockReturnValue({
      mutateAsync: mockCreateCandidate,
    } as any);

    const user = userEvent.setup();
    renderWithQueryClient(<CandidateForm />);

    // Fill in required fields
    await user.type(screen.getByLabelText(/First Name/), "John");
    await user.type(screen.getByLabelText(/Last Name/), "Doe");
    await user.type(
      screen.getByLabelText(/Email Address/),
      "john.doe@example.com"
    );
    await user.click(screen.getByLabelText(/I consent to the processing/));

    const submitButton = screen.getByText("Create Candidate");
    await user.click(submitButton);

    expect(screen.getByText("Creating...")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it("calls onSuccess callback when provided", async () => {
    const mockOnSuccess = jest.fn();
    const mockCreateCandidate = jest.fn().mockResolvedValue({
      id: "candidate-1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    });

    mockUseCreateCandidateMutation.mockReturnValue({
      mutateAsync: mockCreateCandidate,
    } as any);

    const user = userEvent.setup();
    renderWithQueryClient(<CandidateForm onSuccess={mockOnSuccess} />);

    // Fill in required fields
    await user.type(screen.getByLabelText(/First Name/), "John");
    await user.type(screen.getByLabelText(/Last Name/), "Doe");
    await user.type(
      screen.getByLabelText(/Email Address/),
      "john.doe@example.com"
    );
    await user.click(screen.getByLabelText(/I consent to the processing/));

    const submitButton = screen.getByText("Create Candidate");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith({
        id: "candidate-1",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
      });
    });
  });

  it("allows empty optional URL fields", async () => {
    const mockCreateCandidate = jest.fn().mockResolvedValue({
      id: "candidate-1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    });

    mockUseCreateCandidateMutation.mockReturnValue({
      mutateAsync: mockCreateCandidate,
    } as any);

    const user = userEvent.setup();
    renderWithQueryClient(<CandidateForm />);

    // Fill in required fields only
    await user.type(screen.getByLabelText(/First Name/), "John");
    await user.type(screen.getByLabelText(/Last Name/), "Doe");
    await user.type(
      screen.getByLabelText(/Email Address/),
      "john.doe@example.com"
    );
    await user.click(screen.getByLabelText(/I consent to the processing/));

    const submitButton = screen.getByText("Create Candidate");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateCandidate).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        consentGiven: true,
      });
    });
  });
});
