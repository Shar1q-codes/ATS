import axios from "axios";
import { apiClient } from "../api-client";
import { useAuthStore } from "../auth-store";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock auth store
jest.mock("../auth-store");
const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>;

describe("ApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock axios.create to return a mock instance
    const mockInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockInstance as any);

    // Mock auth store
    mockUseAuthStore.mockReturnValue({
      getState: () => ({
        tokens: {
          accessToken: "test-token",
          refreshToken: "refresh-token",
          expiresAt: Date.now() + 3600000,
        },
        user: null,
        isAuthenticated: true,
        isLoading: false,
        setUser: jest.fn(),
        setTokens: jest.fn(),
        login: jest.fn(),
        logout: jest.fn(),
        setLoading: jest.fn(),
        clearAuth: jest.fn(),
      }),
    } as any);
  });

  it("should create axios instance with correct config", () => {
    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: "http://localhost:3001",
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  it("should set up request and response interceptors", () => {
    const mockInstance = mockedAxios.create.mock.results[0].value;

    expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
  });

  it("should have all HTTP methods", () => {
    expect(typeof apiClient.get).toBe("function");
    expect(typeof apiClient.post).toBe("function");
    expect(typeof apiClient.put).toBe("function");
    expect(typeof apiClient.patch).toBe("function");
    expect(typeof apiClient.delete).toBe("function");
    expect(typeof apiClient.upload).toBe("function");
    expect(typeof apiClient.download).toBe("function");
  });

  it("should have utility methods", () => {
    expect(typeof apiClient.healthCheck).toBe("function");
    expect(typeof apiClient.getInstance).toBe("function");
  });
});
