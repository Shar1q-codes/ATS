import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  type: "startup" | "smb" | "agency" | "enterprise";
  subscriptionPlan: "free" | "basic" | "professional" | "enterprise";
  isActive: boolean;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "recruiter" | "hiring_manager";
  isActive: boolean;
  createdAt: string;
}

export interface OrganizationStats {
  userCount: number;
}

export interface CreateOrganizationData {
  name: string;
  domain?: string;
  type?: Organization["type"];
  subscriptionPlan?: Organization["subscriptionPlan"];
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationData
  extends Partial<CreateOrganizationData> {}

export interface UpdateUserRoleData {
  role: OrganizationUser["role"];
}

// Organization queries
export const useOrganization = (id: string) => {
  return useQuery({
    queryKey: ["organization", id],
    queryFn: async (): Promise<Organization> => {
      const response = await apiClient.get(`/organizations/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useOrganizationUsers = (organizationId: string) => {
  return useQuery({
    queryKey: ["organization", organizationId, "users"],
    queryFn: async (): Promise<OrganizationUser[]> => {
      const response = await apiClient.get(
        `/organizations/${organizationId}/users`
      );
      return response.data;
    },
    enabled: !!organizationId,
  });
};

export const useOrganizationStats = (organizationId: string) => {
  return useQuery({
    queryKey: ["organization", organizationId, "stats"],
    queryFn: async (): Promise<OrganizationStats> => {
      const response = await apiClient.get(
        `/organizations/${organizationId}/stats`
      );
      return response.data;
    },
    enabled: !!organizationId,
  });
};

// Organization mutations
export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrganizationData): Promise<Organization> => {
      const response = await apiClient.post("/organizations", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateOrganizationData;
    }): Promise<Organization> => {
      const response = await apiClient.patch(`/organizations/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["organization", id] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/organizations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
};

// User management mutations
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
      role,
    }: {
      organizationId: string;
      userId: string;
      role: OrganizationUser["role"];
    }): Promise<OrganizationUser> => {
      const response = await apiClient.patch(
        `/organizations/${organizationId}/users/${userId}/role`,
        { role }
      );
      return response.data;
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["organization", organizationId, "users"],
      });
    },
  });
};

export const useRemoveUserFromOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
    }: {
      organizationId: string;
      userId: string;
    }): Promise<void> => {
      await apiClient.delete(
        `/organizations/${organizationId}/users/${userId}`
      );
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["organization", organizationId, "users"],
      });
      queryClient.invalidateQueries({
        queryKey: ["organization", organizationId, "stats"],
      });
    },
  });
};
