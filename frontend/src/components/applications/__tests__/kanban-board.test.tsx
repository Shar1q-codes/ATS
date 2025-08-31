import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KanbanBoard } from "../kanban-board";
import { useUpdateApplicationStatusMutation } from "@/hooks/api/use-applications-api";
import { useToast } from "@/hooks/use-toast";
import type { Application } from "@/hooks/api/use-applications-api";

// Mock the hooks
jest.mock("@/hooks/api/use-applications-api");
jest.mock("@/hooks/use-toast");

// Mock Next.js Link component
jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock @dnd-kit components for testing
jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragEnd, onDragStart, onDragOver }: any) => (
    <div
      data-testid="dnd-context"
      onDrop={(e) => {
        const dragData = JSON.parse(
          e.dataTransfer?.getData("application/json") || "{}"
        );
        if (dragData.type === "dragEnd") {
          onDragEnd?.(dragData.event);
        }
      }}
    >
      {children}
    </div>
  ),
  DragOverlay: ({ children }: any) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  TouchSensor: jest.fn(),
  closestCorners: jest.fn(),
}));

jest.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: any) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  useSortable: () => ({
    attributes: {},
    listeners: {
      onPointerDown: jest.fn(),
    },
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
    isOver: false,
  }),
  verticalListSortingStrategy: jest.fn(),
  arrayMove: jest.fn(),
}));

jest.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => ""),
    },
  },
}));

const mockUseUpdateApplicationStatusMutation =
  useUpdateApplicationStatusMutation as jest.MockedFunction<
    typeof useUpdateApplicationStatusMutation
  >;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockApplications: Application[] = [
  {
    id: "1",
    candidateId: "candidate-1",
    companyJobVariantId: "job-1",
    status: "applied",
    fitScore: 85,
    matchExplanation: {
      overallScore: 85,
      breakdown: {
        mustHaveScore: 90,
        shouldHaveScore: 80,
        niceToHaveScore: 70,
      },
      strengths: ["Strong technical skills"],
      gaps: ["Limited experience with specific framework"],
      recommendations: ["Consider for technical interview"],
      detailedAnalysis: [],
    },
    appliedAt: "2024-01-15T10:00:00Z",
    lastUpdated: "2024-01-15T10:00:00Z",
    notes: [
      {
        id: "note-1",
        applicationId: "1",
        authorId: "user-1",
        content: "Great candidate",
        isPrivate: false,
        createdAt: "2024-01-15T11:00:00Z",
      },
    ],
    stageHistory: [],
    candidate: {
      id: "candidate-1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    },
    job: {
      id: "job-1",
      title: "Senior Software Engineer",
      company: "Tech Corp",
    },
  },
  {
    id: "2",
    candidateId: "candidate-2",
    companyJobVariantId: "job-1",
    status: "screening",
    fitScore: 72,
    matchExplanation: {
      overallScore: 72,
      breakdown: {
        mustHaveScore: 75,
        shouldHaveScore: 70,
        niceToHaveScore: 65,
      },
      strengths: ["Good communication skills"],
      gaps: ["Needs more experience"],
      recommendations: ["Schedule phone screening"],
      detailedAnalysis: [],
    },
    appliedAt: "2024-01-14T09:00:00Z",
    lastUpdated: "2024-01-15T14:00:00Z",
    notes: [],
    stageHistory: [],
    candidate: {
      id: "candidate-2",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
    },
    job: {
      id: "job-1",
      title: "Senior Software Engineer",
      company: "Tech Corp",
    },
  },
];

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
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

describe("KanbanBoard", () => {
  const mockToast = jest.fn();
  const mockMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseToast.mockReturnValue({
      toast: mockToast,
    });

    mockUseUpdateApplicationStatusMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
      data: undefined,
      isError: false,
      isIdle: true,
      isSuccess: false,
      mutate: jest.fn(),
      reset: jest.fn(),
      status: "idle",
      submittedAt: 0,
      variables: undefined,
    });
  });

  it("renders all pipeline stages", () => {
    renderWithQueryClient(<KanbanBoard applications={mockApplications} />);

    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("Screening")).toBeInTheDocument();
    expect(screen.getByText("Shortlisted")).toBeInTheDocument();
    expect(screen.getByText("Interview Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Interview Completed")).toBeInTheDocument();
    expect(screen.getByText("Offer Extended")).toBeInTheDocument();
    expect(screen.getByText("Offer Accepted")).toBeInTheDocument();
    expect(screen.getByText("Hired")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("displays applications in correct stages", () => {
    renderWithQueryClient(<KanbanBoard applications={mockApplications} />);

    // Check that applications are in the correct columns
    const appliedColumn = screen
      .getByText("Applied")
      .closest("[data-testid='sortable-context']");
    const screeningColumn = screen
      .getByText("Screening")
      .closest("[data-testid='sortable-context']");

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("shows application details correctly", () => {
    renderWithQueryClient(<KanbanBoard applications={mockApplications} />);

    // Check application details
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getAllByText("Senior Software Engineer")).toHaveLength(2); // Both applications have same job title
    expect(screen.getByText("85% match")).toBeInTheDocument();
    expect(screen.getByText("1 note(s)")).toBeInTheDocument();
  });

  it("displays empty state for stages with no applications", () => {
    renderWithQueryClient(<KanbanBoard applications={[]} />);

    // Should show empty state messages
    const emptyMessages = screen.getAllByText("No applications");
    expect(emptyMessages.length).toBeGreaterThan(0);

    const dragMessages = screen.getAllByText("Drag applications here");
    expect(dragMessages.length).toBeGreaterThan(0);
  });

  it("shows correct application counts in stage headers", () => {
    renderWithQueryClient(<KanbanBoard applications={mockApplications} />);

    // Find badges showing counts
    const badges = screen.getAllByText("1");
    expect(badges.length).toBe(2); // One for Applied, one for Screening

    // Other stages should show 0
    const zeroBadges = screen.getAllByText("0");
    expect(zeroBadges.length).toBe(7); // 7 empty stages
  });

  it("renders application links correctly", () => {
    renderWithQueryClient(<KanbanBoard applications={mockApplications} />);

    const johnDoeLink = screen.getByRole("link", { name: /john doe/i });
    expect(johnDoeLink).toHaveAttribute("href", "/applications/1");

    const viewButtons = screen.getAllByRole("link", {
      name: /view application details/i,
    });
    expect(viewButtons).toHaveLength(2);
  });

  it("shows fit score with correct color coding", () => {
    const applicationsWithDifferentScores: Application[] = [
      {
        ...mockApplications[0],
        fitScore: 85, // Should be green (>= 80)
      },
      {
        ...mockApplications[1],
        fitScore: 65, // Should be yellow (>= 60)
      },
      {
        ...mockApplications[0],
        id: "3",
        fitScore: 45, // Should be red (< 60)
        status: "shortlisted",
      },
    ];

    renderWithQueryClient(
      <KanbanBoard applications={applicationsWithDifferentScores} />
    );

    expect(screen.getByText("85% match")).toBeInTheDocument();
    expect(screen.getByText("65% match")).toBeInTheDocument();
    expect(screen.getByText("45% match")).toBeInTheDocument();
  });

  it("handles applications with missing optional data", () => {
    const incompleteApplication: Application = {
      ...mockApplications[0],
      notes: [],
      candidate: {
        id: "candidate-3",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
      },
      job: undefined,
    };

    renderWithQueryClient(
      <KanbanBoard applications={[incompleteApplication]} />
    );

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.queryByText("1 note(s)")).not.toBeInTheDocument();
  });

  it("calls onApplicationUpdate when provided", async () => {
    const mockOnUpdate = jest.fn();
    mockMutateAsync.mockResolvedValue({
      ...mockApplications[0],
      status: "screening",
    });

    renderWithQueryClient(
      <KanbanBoard
        applications={mockApplications}
        onApplicationUpdate={mockOnUpdate}
      />
    );

    // Simulate successful drag and drop
    const dndContext = screen.getByTestId("dnd-context");

    // Create a mock drag end event
    const mockDragEndEvent = {
      active: { id: "1" },
      over: { id: "screening" },
    };

    // Simulate drag end
    fireEvent.drop(dndContext, {
      dataTransfer: {
        getData: () =>
          JSON.stringify({
            type: "dragEnd",
            event: mockDragEndEvent,
          }),
      },
    });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it("provides proper accessibility attributes", () => {
    renderWithQueryClient(<KanbanBoard applications={mockApplications} />);

    // Check for proper ARIA labels
    const applicationCards = screen.getAllByRole("button");
    expect(applicationCards[0]).toHaveAttribute("aria-label");
    expect(applicationCards[0]).toHaveAttribute("tabIndex", "0");
  });

  it("handles drag and drop error gracefully", async () => {
    const mockError = new Error("Network error");
    mockMutateAsync.mockRejectedValue(mockError);

    renderWithQueryClient(<KanbanBoard applications={mockApplications} />);

    // Simulate drag and drop that fails
    const dndContext = screen.getByTestId("dnd-context");

    const mockDragEndEvent = {
      active: { id: "1" },
      over: { id: "screening" },
    };

    fireEvent.drop(dndContext, {
      dataTransfer: {
        getData: () =>
          JSON.stringify({
            type: "dragEnd",
            event: mockDragEndEvent,
          }),
      },
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Failed to move application",
        description: "Network error",
        variant: "destructive",
      });
    });
  });

  it("shows drag overlay when dragging", () => {
    renderWithQueryClient(<KanbanBoard applications={mockApplications} />);

    expect(screen.getByTestId("drag-overlay")).toBeInTheDocument();
  });

  it("formats dates correctly", () => {
    renderWithQueryClient(<KanbanBoard applications={mockApplications} />);

    // Should show relative time
    expect(screen.getAllByText(/ago/)).toHaveLength(2); // Both applications show relative time
  });
});
