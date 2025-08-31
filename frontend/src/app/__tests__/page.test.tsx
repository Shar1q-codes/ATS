import { render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Home from "../page";

// Mock the hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/hooks/use-auth", () => ({
  useAuth: jest.fn(),
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("Landing Page", () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as unknown);

    mockPush.mockClear();
  });

  it("renders landing page for unauthenticated users", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });

    render(<Home />);

    // Check main heading
    expect(screen.getByText("Revolutionize Your")).toBeInTheDocument();
    expect(screen.getByText("Hiring Process")).toBeInTheDocument();

    // Check value proposition
    expect(
      screen.getByText(
        /The world's first AI-native ATS with explainable matching/
      )
    ).toBeInTheDocument();

    // Check CTA buttons
    expect(screen.getAllByText("Start Free Trial")).toHaveLength(2);
    expect(screen.getByText("See How It Works")).toBeInTheDocument();
  });

  it("shows loading state while checking authentication", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });

    render(<Home />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("redirects authenticated users to dashboard", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "recruiter",
        companyId: "1",
      },
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });

    render(<Home />);

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("displays key features section", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });

    render(<Home />);

    // Check features
    expect(screen.getByText("Explainable AI Matching")).toBeInTheDocument();
    expect(screen.getByText("Zero Job Duplication")).toBeInTheDocument();
    expect(screen.getByText("Enterprise Security")).toBeInTheDocument();
    expect(screen.getByText("Advanced Analytics")).toBeInTheDocument();
    expect(screen.getByText("Real-Time Collaboration")).toBeInTheDocument();
    expect(screen.getByText("Mobile-First Design")).toBeInTheDocument();
  });

  it("displays testimonials section", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });

    render(<Home />);

    expect(
      screen.getByText("Trusted by Leading Companies")
    ).toBeInTheDocument();
    expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
    expect(screen.getByText("Mike Rodriguez")).toBeInTheDocument();
    expect(screen.getByText("Anna Lee")).toBeInTheDocument();
  });

  it("has proper navigation links", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });

    render(<Home />);

    // Check navigation
    expect(screen.getAllByText("AI-Native ATS")).toHaveLength(2);
    expect(screen.getAllByText("Sign In")).toHaveLength(2);
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("displays call-to-action section", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });

    render(<Home />);

    expect(
      screen.getByText("Ready to Transform Your Hiring?")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Join thousands of companies using AI-Native ATS/)
    ).toBeInTheDocument();
  });

  it("has responsive design elements", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });

    render(<Home />);

    // Check for responsive classes (these would be in the DOM)
    const heroSection = screen
      .getByText("Revolutionize Your")
      .closest("section");
    expect(heroSection).toHaveClass(
      "pt-20",
      "pb-16",
      "px-4",
      "sm:px-6",
      "lg:px-8"
    );
  });

  it("includes proper footer information", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });

    render(<Home />);

    expect(
      screen.getByText(
        "The future of recruitment is here. Intelligent, transparent, and fair."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("© 2024 AI-Native ATS. All rights reserved.")
    ).toBeInTheDocument();
  });
});
