import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface JobFamily {
  id: string;
  name: string;
  description: string;
  baseRequirements: RequirementItem[];
  skillCategories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JobTemplate {
  id: string;
  jobFamilyId: string;
  name: string;
  level: "junior" | "mid" | "senior" | "lead" | "principal";
  baseRequirements: RequirementItem[];
  experienceRange: { min: number; max: number };
  salaryRange?: { min: number; max: number; currency: string };
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  industry: string;
  size: "startup" | "small" | "medium" | "large" | "enterprise";
  culture: string[];
  benefits: string[];
  workArrangement: "remote" | "hybrid" | "onsite";
  location: string;
  preferences: {
    prioritySkills: string[];
    dealBreakers: string[];
    niceToHave: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CompanyJobVariant {
  id: string;
  jobTemplateId: string;
  companyProfileId: string;
  customTitle?: string;
  additionalRequirements: RequirementItem[];
  modifiedRequirements: RequirementItem[];
  customDescription?: string;
  isActive: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementItem {
  id: string;
  type: "skill" | "experience" | "education" | "certification" | "other";
  category: "must" | "should" | "nice";
  description: string;
  weight: number;
  alternatives?: string[];
}

export interface ResolvedJobSpec {
  title: string;
  description: string;
  requirements: RequirementItem[];
  company: CompanyProfile;
  salaryRange?: { min: number; max: number; currency: string };
  benefits: string[];
  workArrangement: string;
  location: string;
}

export interface JDVersion {
  id: string;
  companyJobVariantId: string;
  version: number;
  resolvedSpec: ResolvedJobSpec;
  publishedContent: string;
  createdBy: string;
  createdAt: string;
}

// Job Families API hooks
export const useJobFamiliesQuery = () => {
  return useQuery({
    queryKey: ["job-families"],
    queryFn: () => apiClient.get<JobFamily[]>("/job-families"),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useJobFamilyQuery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ["job-families", id],
    queryFn: () => apiClient.get<JobFamily>(`/job-families/${id}`),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
};

export const useCreateJobFamilyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    JobFamily,
    Error,
    Omit<JobFamily, "id" | "createdAt" | "updatedAt">
  >({
    mutationFn: (data) => apiClient.post("/job-families", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-families"] });
    },
  });
};

export const useUpdateJobFamilyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<JobFamily, Error, JobFamily>({
    mutationFn: ({ id, ...data }) => apiClient.put(`/job-families/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["job-families"] });
      queryClient.setQueryData(["job-families", data.id], data);
    },
  });
};

export const useDeleteJobFamilyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.delete(`/job-families/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["job-families"] });
      queryClient.removeQueries({ queryKey: ["job-families", id] });
    },
  });
};

// Job Templates API hooks
export const useJobTemplatesQuery = (jobFamilyId?: string) => {
  return useQuery({
    queryKey: ["job-templates", jobFamilyId],
    queryFn: () =>
      apiClient.get<JobTemplate[]>("/job-templates", {
        params: jobFamilyId ? { jobFamilyId } : undefined,
      }),
    staleTime: 10 * 60 * 1000,
  });
};

export const useJobTemplateQuery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ["job-templates", id],
    queryFn: () => apiClient.get<JobTemplate>(`/job-templates/${id}`),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
};

export const useCreateJobTemplateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    JobTemplate,
    Error,
    Omit<JobTemplate, "id" | "createdAt" | "updatedAt">
  >({
    mutationFn: (data) => apiClient.post("/job-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-templates"] });
    },
  });
};

export const useUpdateJobTemplateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<JobTemplate, Error, JobTemplate>({
    mutationFn: ({ id, ...data }) =>
      apiClient.put(`/job-templates/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["job-templates"] });
      queryClient.setQueryData(["job-templates", data.id], data);
    },
  });
};

export const useDeleteJobTemplateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.delete(`/job-templates/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["job-templates"] });
      queryClient.removeQueries({ queryKey: ["job-templates", id] });
    },
  });
};

// Company Profiles API hooks
export const useCompanyProfilesQuery = () => {
  return useQuery({
    queryKey: ["company-profiles"],
    queryFn: () => apiClient.get<CompanyProfile[]>("/company-profiles"),
    staleTime: 10 * 60 * 1000,
  });
};

export const useCompanyProfileQuery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ["company-profiles", id],
    queryFn: () => apiClient.get<CompanyProfile>(`/company-profiles/${id}`),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
};

export const useCreateCompanyProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CompanyProfile,
    Error,
    Omit<CompanyProfile, "id" | "createdAt" | "updatedAt">
  >({
    mutationFn: (data) => apiClient.post("/company-profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-profiles"] });
    },
  });
};

export const useUpdateCompanyProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<CompanyProfile, Error, CompanyProfile>({
    mutationFn: ({ id, ...data }) =>
      apiClient.put(`/company-profiles/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["company-profiles"] });
      queryClient.setQueryData(["company-profiles", data.id], data);
    },
  });
};

export const useDeleteCompanyProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.delete(`/company-profiles/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["company-profiles"] });
      queryClient.removeQueries({ queryKey: ["company-profiles", id] });
    },
  });
};

// Company Job Variants API hooks
export const useCompanyJobVariantsQuery = (
  companyProfileId?: string,
  jobTemplateId?: string
) => {
  return useQuery({
    queryKey: ["company-job-variants", companyProfileId, jobTemplateId],
    queryFn: () =>
      apiClient.get<CompanyJobVariant[]>("/company-job-variants", {
        params: { companyProfileId, jobTemplateId },
      }),
    staleTime: 10 * 60 * 1000,
  });
};

export const useCompanyJobVariantQuery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ["company-job-variants", id],
    queryFn: () =>
      apiClient.get<CompanyJobVariant>(`/company-job-variants/${id}`),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
};

export const useCreateCompanyJobVariantMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CompanyJobVariant,
    Error,
    Omit<CompanyJobVariant, "id" | "createdAt" | "updatedAt">
  >({
    mutationFn: (data) => apiClient.post("/company-job-variants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-job-variants"] });
    },
  });
};

export const useUpdateCompanyJobVariantMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<CompanyJobVariant, Error, CompanyJobVariant>({
    mutationFn: ({ id, ...data }) =>
      apiClient.put(`/company-job-variants/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["company-job-variants"] });
      queryClient.setQueryData(["company-job-variants", data.id], data);
    },
  });
};

export const useDeleteCompanyJobVariantMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.delete(`/company-job-variants/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["company-job-variants"] });
      queryClient.removeQueries({ queryKey: ["company-job-variants", id] });
    },
  });
};

// Job Description Versions API hooks
export const useJDVersionsQuery = (
  companyJobVariantId: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["jd-versions", companyJobVariantId],
    queryFn: () =>
      apiClient.get<JDVersion[]>(
        `/company-job-variants/${companyJobVariantId}/versions`
      ),
    enabled: enabled && !!companyJobVariantId,
    staleTime: 10 * 60 * 1000,
  });
};

export const useJDVersionQuery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ["jd-versions", id],
    queryFn: () => apiClient.get<JDVersion>(`/jd-versions/${id}`),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
};

export const useCreateJDVersionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<JDVersion, Error, { companyJobVariantId: string }>({
    mutationFn: ({ companyJobVariantId }) =>
      apiClient.post(`/company-job-variants/${companyJobVariantId}/versions`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["jd-versions", data.companyJobVariantId],
      });
    },
  });
};

export const usePublishJobMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { published: boolean; jobBoardUrls: string[] },
    Error,
    { jdVersionId: string; jobBoards: string[] }
  >({
    mutationFn: ({ jdVersionId, jobBoards }) =>
      apiClient.post(`/jd-versions/${jdVersionId}/publish`, { jobBoards }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jd-versions"] });
      queryClient.invalidateQueries({ queryKey: ["company-job-variants"] });
    },
  });
};
