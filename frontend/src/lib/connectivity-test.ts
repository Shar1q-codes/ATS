/**
 * API connectivity testing utilities
 */

import axios from "axios";
import { getApiUrl, isDevelopment } from "./env-config";

export interface ConnectivityTestResult {
  success: boolean;
  apiUrl: string;
  responseTime: number;
  error?: string;
  details?: {
    status?: number;
    message?: string;
    timestamp: string;
  };
}

/**
 * Tests connectivity to the backend API
 */
export async function testApiConnectivity(): Promise<ConnectivityTestResult> {
  const apiUrl = getApiUrl();
  const startTime = Date.now();

  try {
    const response = await axios.get(`${apiUrl}/health`, {
      timeout: 10000, // 10 second timeout
      headers: {
        Accept: "application/json",
      },
    });

    const responseTime = Date.now() - startTime;

    if (isDevelopment()) {
      console.log("[Connectivity Test] API health check successful:", {
        url: `${apiUrl}/health`,
        status: response.status,
        responseTime: `${responseTime}ms`,
        data: response.data,
      });
    }

    return {
      success: true,
      apiUrl,
      responseTime,
      details: {
        status: response.status,
        message: "API is reachable and responding",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    let errorMessage = "Unknown error occurred";
    let status: number | undefined;

    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED" || error.code === "NETWORK_ERROR") {
        errorMessage = `Cannot connect to API server at ${apiUrl}. Please ensure the backend is running.`;
      } else if (error.code === "ENOTFOUND") {
        errorMessage = `API server not found at ${apiUrl}. Please check the API URL configuration.`;
      } else if (error.code === "TIMEOUT" || error.code === "ECONNABORTED") {
        errorMessage = `API server at ${apiUrl} is not responding (timeout after 10s).`;
      } else if (error.response) {
        status = error.response.status;
        errorMessage = `API server responded with error ${status}: ${
          error.response.data?.message || error.message
        }`;
      } else {
        errorMessage = `Network error: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    if (isDevelopment()) {
      console.error("[Connectivity Test] API health check failed:", {
        url: `${apiUrl}/health`,
        error: errorMessage,
        responseTime: `${responseTime}ms`,
        details: error,
      });
    }

    return {
      success: false,
      apiUrl,
      responseTime,
      error: errorMessage,
      details: {
        status,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Tests CORS configuration by making a preflight request
 */
export async function testCorsConfiguration(): Promise<ConnectivityTestResult> {
  const apiUrl = getApiUrl();
  const startTime = Date.now();

  try {
    // Make an OPTIONS request to test CORS preflight
    const response = await axios.options(`${apiUrl}/auth/login`, {
      timeout: 5000,
      headers: {
        Origin: window.location.origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
      },
    });

    const responseTime = Date.now() - startTime;

    if (isDevelopment()) {
      console.log("[CORS Test] Preflight request successful:", {
        url: `${apiUrl}/auth/login`,
        status: response.status,
        responseTime: `${responseTime}ms`,
        headers: response.headers,
      });
    }

    return {
      success: true,
      apiUrl,
      responseTime,
      details: {
        status: response.status,
        message: "CORS is properly configured",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    let errorMessage = "CORS configuration test failed";

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        // 404 is acceptable for OPTIONS request - means CORS is working
        return {
          success: true,
          apiUrl,
          responseTime,
          details: {
            status: 404,
            message: "CORS is working (404 on OPTIONS is expected)",
            timestamp: new Date().toISOString(),
          },
        };
      } else if (error.response) {
        errorMessage = `CORS preflight failed with status ${error.response.status}`;
      } else {
        errorMessage = `CORS test failed: ${error.message}`;
      }
    }

    if (isDevelopment()) {
      console.warn("[CORS Test] CORS configuration test failed:", {
        url: `${apiUrl}/auth/login`,
        error: errorMessage,
        responseTime: `${responseTime}ms`,
        details: error,
      });
    }

    return {
      success: false,
      apiUrl,
      responseTime,
      error: errorMessage,
      details: {
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Runs a comprehensive connectivity test
 */
export async function runConnectivityTests(): Promise<{
  apiTest: ConnectivityTestResult;
  corsTest: ConnectivityTestResult;
  overall: boolean;
}> {
  const [apiTest, corsTest] = await Promise.all([
    testApiConnectivity(),
    testCorsConfiguration(),
  ]);

  const overall = apiTest.success && corsTest.success;

  if (isDevelopment()) {
    console.log("[Connectivity Tests] Results:", {
      api: apiTest.success ? "PASS" : "FAIL",
      cors: corsTest.success ? "PASS" : "FAIL",
      overall: overall ? "PASS" : "FAIL",
    });
  }

  return {
    apiTest,
    corsTest,
    overall,
  };
}
