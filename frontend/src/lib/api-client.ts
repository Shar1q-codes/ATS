import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { useAuthStore } from "./auth-store";
import { authService } from "./auth-service";
import { getApiUrl } from "./env-config";

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.instance = axios.create({
      baseURL: getApiUrl(),
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const { tokens } = useAuthStore.getState();

        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }

        // Add request ID for tracking
        config.headers["X-Request-ID"] = this.generateRequestId();

        // Log request in development
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
            {
              headers: config.headers,
              data: config.data,
            }
          );
        }

        return config;
      },
      (error) => {
        console.error("[API Request Error]", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and token refresh
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response in development
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[API Response] ${response.status} ${response.config.url}`,
            {
              data: response.data,
            }
          );
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue the request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.instance(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const { tokens } = useAuthStore.getState();
            if (tokens?.refreshToken) {
              const response = await authService.refreshToken(
                tokens.refreshToken
              );
              const newTokens = authService.getTokensWithExpiration(
                response.access_token,
                response.refresh_token || tokens.refreshToken,
                response.expires_in
              );

              useAuthStore.getState().setTokens(newTokens);

              // Process failed queue
              this.processQueue(null, newTokens.accessToken);

              // Retry original request
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              }
              return this.instance(originalRequest);
            }
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            useAuthStore.getState().clearAuth();

            // Redirect to login if we're in the browser
            if (typeof window !== "undefined") {
              window.location.href = "/auth/login";
            }

            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other errors
        const apiError = this.handleError(error);

        // Log error in development
        if (process.env.NODE_ENV === "development") {
          console.error("[API Error]", apiError);
        }

        return Promise.reject(apiError);
      }
    );
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private handleError(error: AxiosError): ApiError {
    const apiError: ApiError = {
      message: "An unexpected error occurred",
      status: error.response?.status,
    };

    if (error.response) {
      // Server responded with error status
      const responseData = error.response.data as any;

      apiError.message =
        responseData?.message ||
        responseData?.error ||
        `HTTP ${error.response.status}`;
      apiError.code = responseData?.code;
      apiError.details = responseData?.details;
      apiError.status = error.response.status;
    } else if (error.request) {
      // Request was made but no response received
      if (error.code === "ECONNABORTED") {
        apiError.message = "Request timeout. Please try again.";
      } else if (error.code === "ERR_NETWORK") {
        apiError.message = "Network error. Please check your connection.";
      } else {
        apiError.message = "Unable to connect to server. Please try again.";
      }
      apiError.code = error.code;
    } else {
      // Something else happened
      apiError.message = error.message || "An unexpected error occurred";
    }

    return apiError;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.post<ApiResponse<T>>(
      url,
      data,
      config
    );
    return response.data.data;
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.patch<ApiResponse<T>>(
      url,
      data,
      config
    );
    return response.data.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  // File upload method
  async upload<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);

    const config: AxiosRequestConfig = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    };

    const response = await this.instance.post<ApiResponse<T>>(
      url,
      formData,
      config
    );
    return response.data.data;
  }

  // Download method
  async download(url: string, filename?: string): Promise<void> {
    const response = await this.instance.get(url, {
      responseType: "blob",
    });

    // Create download link
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get("/health");
  }

  // Get the underlying axios instance for advanced usage
  getInstance(): AxiosInstance {
    return this.instance;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
