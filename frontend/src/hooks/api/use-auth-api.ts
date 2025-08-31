import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { LoginFormData, RegisterFormData } from "@/lib/auth-schemas";
import { User } from "@/lib/auth-store";

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Auth API hooks
export const useLoginMutation = () => {
  return useMutation<LoginResponse, Error, LoginFormData>({
    mutationFn: (credentials) => apiClient.post("/auth/login", credentials),
    retry: false,
  });
};

export const useRegisterMutation = () => {
  return useMutation<RegisterResponse, Error, RegisterFormData>({
    mutationFn: (userData) => apiClient.post("/auth/register", userData),
    retry: false,
  });
};

export const useLogoutMutation = () => {
  return useMutation<void, Error, { refreshToken: string }>({
    mutationFn: ({ refreshToken }) =>
      apiClient.post("/auth/logout", { refreshToken }),
    retry: false,
  });
};

export const useRefreshTokenMutation = () => {
  return useMutation<
    { accessToken: string; refreshToken: string; expiresIn: number },
    Error,
    { refreshToken: string }
  >({
    mutationFn: ({ refreshToken }) =>
      apiClient.post("/auth/refresh", { refreshToken }),
    retry: false,
  });
};

export const useVerifyTokenQuery = (token: string, enabled = true) => {
  return useQuery({
    queryKey: ["auth", "verify", token],
    queryFn: () => apiClient.get("/auth/verify"),
    enabled: enabled && !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useForgotPasswordMutation = () => {
  return useMutation<void, Error, { email: string }>({
    mutationFn: ({ email }) =>
      apiClient.post("/auth/forgot-password", { email }),
    retry: false,
  });
};

export const useResetPasswordMutation = () => {
  return useMutation<void, Error, { token: string; password: string }>({
    mutationFn: ({ token, password }) =>
      apiClient.post("/auth/reset-password", { token, password }),
    retry: false,
  });
};
