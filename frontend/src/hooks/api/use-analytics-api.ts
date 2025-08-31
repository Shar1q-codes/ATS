import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface AnalyticsDateRange {
  start: string;
  end: string;
}

export interface RecruitmentMetrics {
  totalApplications: number;
  totalCandidates: number;
  totalJobs: number;
  averageFitScore: number;
  averageTimeToFill: number; // in days
  conversionRates: {
    appliedToScreening: number;
    screeningToInterview: number;
    interviewToOffer: number;
    offerToHired: number;
  };
  topPerformingJobs: Array<{
    jobId: string;
    jobTitle: string;
    applications: number;
    averageFitScore: number;
    timeToFill: number;
  }>;
}

export interface PipelineMetrics {
  stageDistribution: Record<string, number>;
  stageConversionRates: Record<string, number>;
  averageTimeInStage: Record<string, number>; // in days
  bottlenecks: Array<{
    stage: string;
    averageTime: number;
    candidateCount: number;
  }>;
}

export interface SourcePerformance {
  sources: Array<{
    source: string;
    candidates: number;
    applications: number;
    hired: number;
    conversionRate: number;
    averageFitScore: number;
    costPerHire?: number;
  }>;
  totalCandidates: number;
  totalApplications: number;
  totalHired: number;
}

export interface DiversityMetrics {
  genderDistribution: Record<string, number>;
  locationDistribution: Record<string, number>;
  experienceDistribution: Record<string, number>;
  skillsDistribution: Array<{
    skill: string;
    count: number;
    averageFitScore: number;
  }>;
  biasIndicators: Array<{
    metric: string;
    value: number;
    threshold: number;
    status: "good" | "warning" | "critical";
    description: string;
  }>;
}

export interface TimeToFillMetrics {
  overall: {
    average: number;
    median: number;
    min: number;
    max: number;
  };
  byJob: Array<{
    jobId: string;
    jobTitle: string;
    average: number;
    median: number;
    count: number;
  }>;
  byStage: Array<{
    stage: string;
    average: number;
    median: number;
  }>;
  trend: Array<{
    date: string;
    average: number;
    count: number;
  }>;
}

export interface CandidateSourceMetrics {
  sources: Array<{
    name: string;
    count: number;
    percentage: number;
    qualityScore: number;
    conversionRate: number;
  }>;
  trends: Array<{
    date: string;
    sources: Record<string, number>;
  }>;
}

export interface ReportData {
  id: string;
  name: string;
  type: "recruitment" | "pipeline" | "diversity" | "performance";
  data: any;
  generatedAt: string;
  generatedBy: string;
  parameters: Record<string, any>;
}

// Analytics API hooks
export const useRecruitmentMetricsQuery = (
  dateRange?: AnalyticsDateRange,
  companyId?: string
) => {
  return useQuery({
    queryKey: ["analytics", "recruitment-metrics", dateRange, companyId],
    queryFn: () =>
      apiClient.get<RecruitmentMetrics>("/analytics/recruitment-metrics", {
        params: { ...dateRange, companyId },
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePipelineMetricsQuery = (
  dateRange?: AnalyticsDateRange,
  jobId?: string
) => {
  return useQuery({
    queryKey: ["analytics", "pipeline-metrics", dateRange, jobId],
    queryFn: () =>
      apiClient.get<PipelineMetrics>("/analytics/pipeline-metrics", {
        params: { ...dateRange, jobId },
      }),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSourcePerformanceQuery = (dateRange?: AnalyticsDateRange) => {
  return useQuery({
    queryKey: ["analytics", "source-performance", dateRange],
    queryFn: () =>
      apiClient.get<SourcePerformance>("/analytics/source-performance", {
        params: dateRange,
      }),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useDiversityMetricsQuery = (
  dateRange?: AnalyticsDateRange,
  jobId?: string
) => {
  return useQuery({
    queryKey: ["analytics", "diversity-metrics", dateRange, jobId],
    queryFn: () =>
      apiClient.get<DiversityMetrics>("/analytics/diversity-metrics", {
        params: { ...dateRange, jobId },
      }),
    staleTime: 10 * 60 * 1000,
  });
};

export const useTimeToFillMetricsQuery = (
  dateRange?: AnalyticsDateRange,
  jobId?: string
) => {
  return useQuery({
    queryKey: ["analytics", "time-to-fill", dateRange, jobId],
    queryFn: () =>
      apiClient.get<TimeToFillMetrics>("/analytics/time-to-fill", {
        params: { ...dateRange, jobId },
      }),
    staleTime: 10 * 60 * 1000,
  });
};

export const useCandidateSourceMetricsQuery = (
  dateRange?: AnalyticsDateRange
) => {
  return useQuery({
    queryKey: ["analytics", "candidate-sources", dateRange],
    queryFn: () =>
      apiClient.get<CandidateSourceMetrics>("/analytics/candidate-sources", {
        params: dateRange,
      }),
    staleTime: 10 * 60 * 1000,
  });
};

// Reports API hooks
export const useReportsQuery = (type?: string, limit = 20) => {
  return useQuery({
    queryKey: ["reports", type, limit],
    queryFn: () =>
      apiClient.get<ReportData[]>("/analytics/reports", {
        params: { type, limit },
      }),
    staleTime: 5 * 60 * 1000,
  });
};

export const useReportQuery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ["reports", id],
    queryFn: () => apiClient.get<ReportData>(`/analytics/reports/${id}`),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
};

export const useGenerateReportMutation = () => {
  return useMutation<
    ReportData,
    Error,
    {
      name: string;
      type: "recruitment" | "pipeline" | "diversity" | "performance";
      parameters: Record<string, any>;
      format?: "json" | "csv" | "pdf";
    }
  >({
    mutationFn: (data) => apiClient.post("/analytics/reports/generate", data),
  });
};

export const useExportReportMutation = () => {
  return useMutation<
    { downloadUrl: string },
    Error,
    {
      reportId: string;
      format: "csv" | "pdf" | "xlsx";
    }
  >({
    mutationFn: ({ reportId, format }) =>
      apiClient.post(`/analytics/reports/${reportId}/export`, { format }),
  });
};

export const useShareReportMutation = () => {
  return useMutation<
    { shareUrl: string; shareId: string },
    Error,
    {
      reportId: string;
      permissions: "view" | "edit";
      expiresAt?: string;
      password?: string;
    }
  >({
    mutationFn: (data) =>
      apiClient.post(`/analytics/reports/${data.reportId}/share`, data),
  });
};

export const useDeleteReportMutation = () => {
  return useMutation<void, Error, string>({
    mutationFn: (reportId) =>
      apiClient.delete(`/analytics/reports/${reportId}`),
  });
};

export const useDuplicateReportMutation = () => {
  return useMutation<
    ReportData,
    Error,
    {
      reportId: string;
      name?: string;
    }
  >({
    mutationFn: ({ reportId, name }) =>
      apiClient.post(`/analytics/reports/${reportId}/duplicate`, { name }),
  });
};

// Dashboard API hooks
export const useDashboardDataQuery = (dateRange?: AnalyticsDateRange) => {
  return useQuery({
    queryKey: ["dashboard", dateRange],
    queryFn: () => apiClient.get("/analytics/dashboard", { params: dateRange }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

// Real-time metrics (for live dashboard updates)
export const useRealTimeMetricsQuery = (enabled = true) => {
  return useQuery({
    queryKey: ["real-time-metrics"],
    queryFn: () => apiClient.get("/analytics/real-time"),
    enabled,
    staleTime: 0, // Always fresh
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
};
