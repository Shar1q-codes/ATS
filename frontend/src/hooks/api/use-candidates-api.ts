import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Candidate {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  parsedData?: ParsedResumeData;
  skillEmbeddings?: number[];
  createdAt: string;
  updatedAt: string;
  consentGiven: boolean;
  consentDate?: string;
}

export interface ParsedResumeData {
  skills: Skill[];
  experience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  summary?: string;
  totalExperience: number;
}

export interface Skill {
  name: string;
  category: string;
  yearsOfExperience?: number;
  proficiency?: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
  skills: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: number;
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
}

export interface CreateCandidateData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  consentGiven: boolean;
}

export interface UpdateCandidateData extends Partial<CreateCandidateData> {
  id: string;
}

export interface CandidateFilters {
  search?: string;
  skills?: string[];
  location?: string;
  experienceMin?: number;
  experienceMax?: number;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "firstName" | "lastName" | "totalExperience";
  sortOrder?: "asc" | "desc";
}

export interface CandidatesResponse {
  candidates: Candidate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Candidates API hooks
export const useCandidatesQuery = (filters: CandidateFilters = {}) => {
  return useQuery({
    queryKey: ["candidates", filters],
    queryFn: () =>
      apiClient.get<CandidatesResponse>("/candidates", { params: filters }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCandidateQuery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ["candidates", id],
    queryFn: () => apiClient.get<Candidate>(`/candidates/${id}`),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateCandidateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<Candidate, Error, CreateCandidateData>({
    mutationFn: (data) => apiClient.post("/candidates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
};

export const useUpdateCandidateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<Candidate, Error, UpdateCandidateData>({
    mutationFn: ({ id, ...data }) => apiClient.put(`/candidates/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.setQueryData(["candidates", data.id], data);
    },
  });
};

export const useDeleteCandidateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.delete(`/candidates/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.removeQueries({ queryKey: ["candidates", id] });
    },
  });
};

export const useUploadResumeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { candidate: Candidate; parsedData: ParsedResumeData },
    Error,
    { candidateId: string; file: File; onProgress?: (progress: number) => void }
  >({
    mutationFn: ({ candidateId, file, onProgress }) =>
      apiClient.upload(`/candidates/${candidateId}/resume`, file, onProgress),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.setQueryData(
        ["candidates", data.candidate.id],
        data.candidate
      );
    },
  });
};

export const useBulkImportCandidatesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { imported: number; failed: number; errors: string[] },
    Error,
    File
  >({
    mutationFn: (file) => apiClient.upload("/candidates/bulk-import", file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
};
