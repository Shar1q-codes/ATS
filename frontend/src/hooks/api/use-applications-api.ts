import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type PipelineStage =
  | "applied"
  | "screening"
  | "shortlisted"
  | "interview_scheduled"
  | "interview_completed"
  | "offer_extended"
  | "offer_accepted"
  | "hired"
  | "rejected";

export interface Application {
  id: string;
  candidateId: string;
  companyJobVariantId: string;
  status: PipelineStage;
  fitScore: number;
  matchExplanation: MatchExplanation;
  appliedAt: string;
  lastUpdated: string;
  notes: ApplicationNote[];
  stageHistory: StageHistoryEntry[];
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    resumeUrl?: string;
  };
  job?: {
    id: string;
    title: string;
    company: string;
  };
}

export interface MatchExplanation {
  overallScore: number;
  breakdown: {
    mustHaveScore: number;
    shouldHaveScore: number;
    niceToHaveScore: number;
  };
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  detailedAnalysis: RequirementMatch[];
}

export interface RequirementMatch {
  requirement: {
    id: string;
    type: string;
    category: string;
    description: string;
    weight: number;
  };
  matched: boolean;
  confidence: number;
  evidence: string[];
  explanation: string;
}

export interface ApplicationNote {
  id: string;
  applicationId: string;
  authorId: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  author?: {
    firstName: string;
    lastName: string;
  };
}

export interface StageHistoryEntry {
  id: string;
  applicationId: string;
  fromStage?: PipelineStage;
  toStage: PipelineStage;
  changedBy: string;
  changedAt: string;
  notes?: string;
  automated: boolean;
  changedByUser?: {
    firstName: string;
    lastName: string;
  };
}

export interface ApplicationFilters {
  status?: PipelineStage[];
  companyJobVariantId?: string;
  candidateId?: string;
  fitScoreMin?: number;
  fitScoreMax?: number;
  appliedAfter?: string;
  appliedBefore?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "appliedAt" | "fitScore" | "lastUpdated";
  sortOrder?: "asc" | "desc";
}

export interface ApplicationsResponse {
  applications: Application[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts: Record<PipelineStage, number>;
}

export interface CreateApplicationData {
  candidateId: string;
  companyJobVariantId: string;
}

export interface UpdateApplicationStatusData {
  id: string;
  status: PipelineStage;
  notes?: string;
}

export interface CreateApplicationNoteData {
  applicationId: string;
  content: string;
  isPrivate?: boolean;
}

export interface BulkUpdateApplicationsData {
  applicationIds: string[];
  status: PipelineStage;
  notes?: string;
}

// Applications API hooks
export const useApplicationsQuery = (filters: ApplicationFilters = {}) => {
  return useQuery({
    queryKey: ["applications", filters],
    queryFn: () =>
      apiClient.get<ApplicationsResponse>("/applications", { params: filters }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useApplicationQuery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ["applications", id],
    queryFn: () => apiClient.get<Application>(`/applications/${id}`),
    enabled: enabled && !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateApplicationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<Application, Error, CreateApplicationData>({
    mutationFn: (data) => apiClient.post("/applications", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
};

export const useUpdateApplicationStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<Application, Error, UpdateApplicationStatusData>({
    mutationFn: ({ id, ...data }) =>
      apiClient.patch(`/applications/${id}/status`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.setQueryData(["applications", data.id], data);
    },
  });
};

export const useBulkUpdateApplicationsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ updated: number }, Error, BulkUpdateApplicationsData>({
    mutationFn: (data) => apiClient.patch("/applications/bulk-update", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
};

export const useDeleteApplicationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.delete(`/applications/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.removeQueries({ queryKey: ["applications", id] });
    },
  });
};

// Application Notes API hooks
export const useApplicationNotesQuery = (
  applicationId: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["application-notes", applicationId],
    queryFn: () =>
      apiClient.get<ApplicationNote[]>(`/applications/${applicationId}/notes`),
    enabled: enabled && !!applicationId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateApplicationNoteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<ApplicationNote, Error, CreateApplicationNoteData>({
    mutationFn: ({ applicationId, ...data }) =>
      apiClient.post(`/applications/${applicationId}/notes`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["application-notes", data.applicationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["applications", data.applicationId],
      });
    },
  });
};

export const useUpdateApplicationNoteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ApplicationNote,
    Error,
    { id: string; content: string; isPrivate?: boolean }
  >({
    mutationFn: ({ id, ...data }) =>
      apiClient.put(`/application-notes/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["application-notes", data.applicationId],
      });
    },
  });
};

export const useDeleteApplicationNoteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; applicationId: string }>({
    mutationFn: ({ id }) => apiClient.delete(`/application-notes/${id}`),
    onSuccess: (_, { applicationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["application-notes", applicationId],
      });
    },
  });
};

// Pipeline Analytics
export const usePipelineAnalyticsQuery = (
  companyJobVariantId?: string,
  dateRange?: { start: string; end: string }
) => {
  return useQuery({
    queryKey: ["pipeline-analytics", companyJobVariantId, dateRange],
    queryFn: () =>
      apiClient.get("/applications/analytics/pipeline", {
        params: { companyJobVariantId, ...dateRange },
      }),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Matching API hooks
export const useRunMatchingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { matched: number; updated: number },
    Error,
    { companyJobVariantId: string; candidateIds?: string[] }
  >({
    mutationFn: (data) => apiClient.post("/applications/run-matching", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
};

export const useRegenerateMatchExplanationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<MatchExplanation, Error, string>({
    mutationFn: (applicationId) =>
      apiClient.post(`/applications/${applicationId}/regenerate-match`),
    onSuccess: (_, applicationId) => {
      queryClient.invalidateQueries({
        queryKey: ["applications", applicationId],
      });
    },
  });
};
