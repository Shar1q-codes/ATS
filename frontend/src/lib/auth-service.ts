import axios from "axios";
import { User, AuthTokens } from "./auth-store";
import { LoginFormData, RegisterFormData } from "./auth-schemas";
import { getApiUrl } from "./env-config";

const API_BASE_URL = getApiUrl();

// ApiError class for proper error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Backend response interfaces matching the actual backend structure
export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

class AuthService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/auth`;
  }

  async login(credentials: LoginFormData): Promise<LoginResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/login`, credentials);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response?.status || 500;
        const message = this.getErrorMessage(error, "Login failed");
        const code = error.response?.data?.code;
        throw new ApiError(message, status, code, error.response?.data);
      }
      if (
        error.code === "NETWORK_ERROR" ||
        error.message?.includes("Network Error")
      ) {
        throw new Error("Network Error");
      }
      throw new Error("An unexpected error occurred");
    }
  }

  async register(userData: RegisterFormData): Promise<RegisterResponse> {
    try {
      // Transform frontend form data to match backend RegisterDto structure
      const payload = {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        companyName: userData.companyName, // Backend expects companyName, not company
      };

      const response = await axios.post(`${this.baseURL}/register`, payload);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response?.status || 500;
        const message = this.getErrorMessage(error, "Registration failed");
        const code = error.response?.data?.code;
        throw new ApiError(message, status, code, error.response?.data);
      }
      if (
        error.code === "NETWORK_ERROR" ||
        error.message?.includes("Network Error")
      ) {
        throw new Error("Network Error");
      }
      throw new Error("An unexpected error occurred");
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      // Validate refresh token format before sending
      if (!this.isValidTokenFormat(refreshToken)) {
        throw new ApiError("Invalid refresh token format", 400);
      }

      // Backend expects { refreshToken } in the request body
      const response = await axios.post(`${this.baseURL}/refresh`, {
        refreshToken,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response?.status || 500;
        const message = this.getErrorMessage(error, "Token refresh failed");
        const code = error.response?.data?.code;
        throw new ApiError(message, status, code, error.response?.data);
      }
      if (
        error.code === "NETWORK_ERROR" ||
        error.message?.includes("Network Error")
      ) {
        throw new Error("Network Error");
      }
      throw new Error("An unexpected error occurred");
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/logout`, {
        refreshToken,
      });
    } catch (error) {
      // Logout should succeed even if the server request fails
      console.warn("Logout request failed:", error);
    }
  }

  async verifyToken(token: string): Promise<User> {
    try {
      // Validate token format before sending
      if (!this.isValidTokenFormat(token)) {
        throw new ApiError("Invalid token format", 400);
      }

      const response = await axios.get(`${this.baseURL}/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data.user;
    } catch (error: any) {
      if (error.response) {
        const status = error.response?.status || 500;
        const message = this.getErrorMessage(
          error,
          "Token verification failed"
        );
        const code = error.response?.data?.code;
        throw new ApiError(message, status, code, error.response?.data);
      }
      if (
        error.code === "NETWORK_ERROR" ||
        error.message?.includes("Network Error")
      ) {
        throw new Error("Network Error");
      }
      throw new Error("An unexpected error occurred");
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/forgot-password`, { email });
    } catch (error: any) {
      if (error.response) {
        const status = error.response?.status || 500;
        const message =
          error.response?.data?.message || "Failed to send reset email";
        const code = error.response?.data?.code;
        throw new ApiError(message, status, code, error.response?.data);
      }
      throw new Error("An unexpected error occurred");
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/reset-password`, {
        token,
        password,
      });
    } catch (error: any) {
      if (error.response) {
        const status = error.response?.status || 500;
        const message =
          error.response?.data?.message || "Password reset failed";
        const code = error.response?.data?.code;
        throw new ApiError(message, status, code, error.response?.data);
      }
      throw new Error("An unexpected error occurred");
    }
  }

  // Helper method to check if token is expired
  isTokenExpired(expiresAt: number): boolean {
    return Date.now() >= expiresAt;
  }

  // Helper method to check if token is about to expire (within threshold)
  isTokenExpiringSoon(
    expiresAt: number,
    thresholdMinutes: number = 5
  ): boolean {
    const threshold = thresholdMinutes * 60 * 1000;
    return expiresAt - Date.now() <= threshold;
  }

  // Helper method to validate tokens structure
  validateTokens(tokens: AuthTokens): boolean {
    if (!tokens) return false;

    const now = Date.now();

    // Check required fields
    if (!tokens.accessToken || !tokens.refreshToken) {
      return false;
    }

    // Check token format
    if (
      !this.isValidTokenFormat(tokens.accessToken) ||
      !this.isValidTokenFormat(tokens.refreshToken)
    ) {
      return false;
    }

    // Check if access token is not expired
    if (tokens.expiresAt <= now) {
      return false;
    }

    // Check if refresh token is not expired (if we have that info)
    if (tokens.refreshExpiresAt && tokens.refreshExpiresAt <= now) {
      return false;
    }

    return true;
  }

  // Helper method to check if refresh is needed
  shouldRefreshToken(
    tokens: AuthTokens,
    thresholdMinutes: number = 5
  ): boolean {
    if (!tokens) return false;

    // If token is expired, definitely need refresh
    if (this.isTokenExpired(tokens.expiresAt)) {
      return true;
    }

    // If token is expiring soon, need refresh
    return this.isTokenExpiringSoon(tokens.expiresAt, thresholdMinutes);
  }

  // Helper method to get tokens with expiration
  getTokensWithExpiration(
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    refreshExpiresIn?: number
  ): AuthTokens {
    const now = Date.now();
    return {
      accessToken,
      refreshToken,
      expiresAt: now + expiresIn * 1000,
      issuedAt: now,
      refreshExpiresAt: refreshExpiresIn
        ? now + refreshExpiresIn * 1000
        : undefined,
    };
  }

  // Helper method to validate token format
  isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== "string") return false;

    // Basic JWT format check (three parts separated by dots)
    const parts = token.split(".");
    return parts.length === 3;
  }

  // Helper method to get error message from response
  private getErrorMessage(error: any, defaultMessage: string): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return defaultMessage;
  }
}

export const authService = new AuthService();
