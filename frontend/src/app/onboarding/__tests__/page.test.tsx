import { render, screen, fireEvent } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import OnboardingPage from "../page";

// Mock the hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/hooks/use-auth", () => ({
  useAuth: jest.fn(),
}));

// Mock the ProtectedRoute component
jest.mock("@/components/auth/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("Onboarding Page", () => {
  const mockUser = {
    id: "1",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    role: "recruiter" as const,
    companyId: "1",
  };

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as unknown);

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });

    mockPush.mockClear();
  });

  it("renders welcome message with user name", () => {
    render(<OnboardingPage />);

    expect(screen.getByText("Welcome, John!")).toBeInTheDocument();
    expect(screen.getByText("Welcome to AI-Native ATS")).toBeInTheDocument();
  });

  it("displays onboarding steps", () => {
    render(<OnboardingPage />);

    expect(screen.getByText("Upload Your First Resume")).toBeInTheDocument();
    expect(screen.getByText("Create a Job Posting")).toBeInTheDocument();
    expect(screen.getByText("Explore Candidates")).toBeInTheDocument();
    expect(screen.getByText("View Analytics")).toBeInTheDocument();
  });

  it("displays step descriptions", () => {
    render(<OnboardingPage />);

    expect(
      screen.getByText("Experience our AI-powered resume parsing")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Set up your first job with our variation model")
    ).toBeInTheDocument();
    expect(
      screen.getByText("See how our AI matching works")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Check out your recruitment insights")
    ).toBeInTheDocument();
  });

  it("has clickable step cards that navigate to correct routes", () => {
    render(<OnboardingPage />);

    const uploadStep = screen
      .getByText("Upload Your First Resume")
      .closest("a");
    const jobStep = screen.getByText("Create a Job Posting").closest("a");
    const candidatesStep = screen.getByText("Explore Candidates").closest("a");
    const analyticsStep = screen.getByText("View Analytics").closest("a");

    expect(uploadStep).toHaveAttribute("href", "/candidates/upload");
    expect(jobStep).toHaveAttribute("href", "/jobs");
    expect(candidatesStep).toHaveAttribute("href", "/candidates");
    expect(analyticsStep).toHaveAttribute("href", "/analytics");
  });

  it("displays features overview section", () => {
    render(<OnboardingPage />);

    expect(screen.getByText("What Makes Us Different")).toBeInTheDocument();
    expect(screen.getByText("Explainable AI")).toBeInTheDocument();
    expect(screen.getByText("Zero Duplication")).toBeInTheDocument();
    expect(screen.getByText("Advanced Analytics")).toBeInTheDocument();
  });

  it("has action buttons", () => {
    render(<OnboardingPage />);

    expect(screen.getByText("Start with Resume Upload")).toBeInTheDocument();
    expect(screen.getByText("Skip to Dashboard")).toBeInTheDocument();
  });

  it("navigates to dashboard when skip button is clicked", () => {
    render(<OnboardingPage />);

    const skipButton = screen.getByText("Skip to Dashboard");
    fireEvent.click(skipButton);

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("has proper link to resume upload", () => {
    render(<OnboardingPage />);

    const startButton = screen
      .getByText("Start with Resume Upload")
      .closest("a");
    expect(startButton).toHaveAttribute("href", "/candidates/upload");
  });

  it("displays feature descriptions correctly", () => {
    render(<OnboardingPage />);

    expect(
      screen.getByText(
        "Get detailed explanations for every candidate match with transparent scoring"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create job templates once, customize for multiple companies effortlessly"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track performance, identify bias, and optimize your hiring process"
      )
    ).toBeInTheDocument();
  });

  it("has proper styling and responsive design", () => {
    render(<OnboardingPage />);

    // Check that the page has responsive container classes
    const mainContainer = screen
      .getByText("Welcome, John!")
      .closest(".container");
    expect(mainContainer).toBeInTheDocument();
  });

  it("displays welcome description", () => {
    render(<OnboardingPage />);

    expect(
      screen.getByText(
        "Let's get you started with the most advanced recruitment platform. Follow these steps to explore our key features."
      )
    ).toBeInTheDocument();
  });
});
