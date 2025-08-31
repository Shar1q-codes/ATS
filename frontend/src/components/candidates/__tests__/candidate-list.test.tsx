import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CandidateList } from "../candidate-list";
import { useCandidatesQuery } from "@/hooks/api/use-candidates-api";

// Mock the API hook
jest.mock("@/hooks/api/use-candidates-api");
const mockUseCandidatesQuery = useCandidatesQuery as jest.MockedFunction<
  typeof useCandidatesQuery
>;

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => "/candidates",
}));

// Mock date-fns
jest.mock("date-fns", () => ({
  formatDistanceToNow: () => "2 days ago",
}));

const mockCandidates = [
  {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
    location: "New York, NY",
    linkedinUrl: "https://linkedin.com/in/johndoe",
    portfolioUrl: "https://johndoe.dev",
    resumeUrl: "https://example.com/resume.pdf",
    parsedData: {
      skills: [
        { name: "JavaScript", category: "Programming", yearsOfExperience: 5 },
        { name: "React", category: "Framework", yearsOfExperience: 3 },
        { name: "Node.js", category: "Backend", yearsOfExperience: 4 },
      ],
      experience: [],
      education: [],
      certifications: [],
      totalExperience: 5,
    },
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    consentGiven: true,
    consentDate: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@example.com",
    location: "San Francisco, CA",
    parsedData: {
      skills: [
        { name: "Python", category: "Programming", yearsOfExperience: 6 },
        { name: "Django", category: "Framework", yearsOfExperience: 4 },
      ],
      experience: [],
      education: [],
      certifications: [],
      totalExperience: 6,
    },
    createdAt: "2024-01-14T10:00:00Z",
    updatedAt: "2024-01-14T10:00:00Z",
    consentGiven: true,
    consentDate: "2024-01-14T10:00:00Z",
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

describe("CandidateList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", () => {
    mockUseCandidatesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    renderWithQueryClient(<CandidateList filters={{}} />);

    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseCandidatesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to fetch"),
    } as any);

    renderWithQueryClient(<CandidateList filters={{}} />);

    expect(
      screen.getByText("Failed to load candidates. Please try again.")
    ).toBeInTheDocument();
  });

  it("renders empty state", () => {
    mockUseCandidatesQuery.mockReturnValue({
      data: { candidates: [], total: 0, page: 1, limit: 20, totalPages: 0 },
      isLoading: false,
      error: null,
    } as any);

    renderWithQueryClient(<CandidateList filters={{}} />);

    expect(
      screen.getByText("No candidates found matching your criteria.")
    ).toBeInTheDocument();
    expect(screen.getByText("Upload Resume")).toBeInTheDocument();
  });

  it("renders candidates list", () => {
    mockUseCandidatesQuery.mockReturnValue({
      data: {
        candidates: mockCandidates,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    } as any);

    renderWithQueryClient(<CandidateList filters={{}} />);

    expect(screen.getByText("Candidates (2)")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
    expect(screen.getByText("jane.smith@example.com")).toBeInTheDocument();
  });

  it("displays candidate skills", () => {
    mockUseCandidatesQuery.mockReturnValue({
      data: {
        candidates: mockCandidates,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    } as any);

    renderWithQueryClient(<CandidateList filters={{}} />);

    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Django")).toBeInTheDocument();
  });

  it("displays experience information", () => {
    mockUseCandidatesQuery.mockReturnValue({
      data: {
        candidates: mockCandidates,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    } as any);

    renderWithQueryClient(<CandidateList filters={{}} />);

    expect(screen.getByText("5 years")).toBeInTheDocument();
    expect(screen.getByText("6 years")).toBeInTheDocument();
  });

  it("handles candidate selection", () => {
    mockUseCandidatesQuery.mockReturnValue({
      data: {
        candidates: mockCandidates,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    } as any);

    renderWithQueryClient(<CandidateList filters={{}} />);

    const checkboxes = screen.getAllByRole("checkbox");
    const firstCandidateCheckbox = checkboxes[1]; // First is select all

    fireEvent.click(firstCandidateCheckbox);

    expect(screen.getByText("1 candidate(s) selected")).toBeInTheDocument();
    expect(screen.getByText("Export Selected")).toBeInTheDocument();
    expect(screen.getByText("Send Email")).toBeInTheDocument();
    expect(screen.getByText("Delete Selected")).toBeInTheDocument();
  });

  it("handles select all functionality", () => {
    mockUseCandidatesQuery.mockReturnValue({
      data: {
        candidates: mockCandidates,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    } as any);

    renderWithQueryClient(<CandidateList filters={{}} />);

    const selectAllCheckbox = screen.getAllByRole("checkbox")[0];

    fireEvent.click(selectAllCheckbox);

    expect(screen.getByText("2 candidate(s) selected")).toBeInTheDocument();
  });

  it("renders pagination when multiple pages", () => {
    mockUseCandidatesQuery.mockReturnValue({
      data: {
        candidates: mockCandidates,
        total: 50,
        page: 1,
        limit: 20,
        totalPages: 3,
      },
      isLoading: false,
      error: null,
    } as any);

    renderWithQueryClient(<CandidateList filters={{}} />);

    expect(
      screen.getByText("Showing 1 to 20 of 50 candidates")
    ).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });
});
