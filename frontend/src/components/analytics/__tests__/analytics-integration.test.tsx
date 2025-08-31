import { render, screen } from "@testing-library/react";
import AnalyticsPage from "@/app/analytics/page";
import PipelineMetricsPage from "@/app/analytics/pipeline/page";
import SourcePerformancePage from "@/app/analytics/sources/page";
import DiversityReportsPage from "@/app/analytics/diversity/page";
import ReportsPage from "@/app/analytics/reports/page";

// Mock all the analytics API hooks
jest.mock("@/hooks/api/use-analytics-api", () => ({
  useRecruitmentMetricsQuery: () => ({
    data: {
      totalApplications: 150,
      totalCandidates: 120,
      averageFitScore: 85.5,
      averageTimeToFill: 14,
      conversionRates: {
        appliedToScreening: 0.8,
        screeningToInterview: 0.6,
        interviewToOffer: 0.4,
        offerToHired: 0.9,
      },
      topPerformingJobs: [
        {
          jobId: "1",
          jobTitle: "Senior Software Engineer",
          applications: 50,
          averageFitScore: 90,
          timeToFill: 12,
        },
      ],
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
  useDashboardDataQuery: () => ({
    data: {},
    isLoading: false,
    refetch: jest.fn(),
  }),
  useRealTimeMetricsQuery: () => ({
    data: {},
    isLoading: false,
  }),
  usePipelineMetricsQuery: () => ({
    data: {
      stageDistribution: {
        applied: 100,
        screening: 80,
        interview: 40,
        offer: 20,
        hired: 15,
      },
      stageConversionRates: {
        applied: 0.8,
        screening: 0.5,
        interview: 0.5,
        offer: 0.75,
      },
      averageTimeInStage: {
        applied: 1,
        screening: 3,
        interview: 5,
        offer: 2,
      },
      bottlenecks: [],
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
  useTimeToFillMetricsQuery: () => ({
    data: {
      overall: {
        average: 14,
        median: 12,
        min: 5,
        max: 30,
      },
      byJob: [],
      byStage: [],
      trend: [],
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
  useSourcePerformanceQuery: () => ({
    data: {
      sources: [
        {
          source: "LinkedIn",
          candidates: 50,
          applications: 40,
          hired: 10,
          conversionRate: 0.25,
          averageFitScore: 85,
        },
      ],
      totalCandidates: 100,
      totalApplications: 80,
      totalHired: 20,
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
  useCandidateSourceMetricsQuery: () => ({
    data: {
      sources: [
        {
          name: "LinkedIn",
          count: 50,
          percentage: 50,
          qualityScore: 85,
          conversionRate: 0.25,
        },
      ],
      trends: [],
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
  useDiversityMetricsQuery: () => ({
    data: {
      genderDistribution: {
        male: 60,
        female: 40,
      },
      locationDistribution: {
        "New York": 30,
        "San Francisco": 25,
        Remote: 45,
      },
      experienceDistribution: {
        junior: 20,
        mid: 50,
        senior: 30,
      },
      skillsDistribution: [
        {
          skill: "JavaScript",
          count: 80,
          averageFitScore: 85,
        },
      ],
      biasIndicators: [
        {
          metric: "Gender Balance",
          value: 0.6,
          threshold: 0.5,
          status: "warning" as const,
          description: "Gender distribution shows slight imbalance",
        },
      ],
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
  useReportsQuery: () => ({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
  }),
  useGenerateReportMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useExportReportMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useReportQuery: () => ({
    data: null,
    isLoading: false,
  }),
}));

// Mock toast
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

describe("Analytics Integration", () => {
  it("renders analytics overview page", () => {
    render(<AnalyticsPage />);

    expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Total Applications")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("renders pipeline metrics page", () => {
    render(<PipelineMetricsPage />);

    expect(screen.getByText("Pipeline Metrics")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Analyze your recruitment pipeline performance and identify bottlenecks"
      )
    ).toBeInTheDocument();
  });

  it("renders source performance page", () => {
    render(<SourcePerformancePage />);

    expect(screen.getByText("Source Performance")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track and analyze candidate source effectiveness and ROI"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument(); // Total candidates
  });

  it("renders diversity reports page", () => {
    render(<DiversityReportsPage />);

    expect(screen.getByText("Diversity & Bias Reports")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Monitor diversity metrics and detect potential bias in your recruitment process"
      )
    ).toBeInTheDocument();
  });

  it("renders reports page", () => {
    render(<ReportsPage />);

    expect(screen.getByText("Report Generator")).toBeInTheDocument();
    expect(
      screen.getByText("Generate and export custom analytics reports")
    ).toBeInTheDocument();
  });
});
