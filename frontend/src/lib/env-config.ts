/**
 * Environment configuration validation and utilities
 */

export interface EnvConfig {
  apiUrl: string;
  nodeEnv: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

/**
 * Validates and returns environment configuration
 * Throws error if required environment variables are missing
 */
export function getEnvConfig(): EnvConfig {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const nodeEnv = process.env.NODE_ENV || "development";

  // Validate required environment variables
  if (!apiUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is required. Please check your environment configuration."
    );
  }

  // Validate API URL format
  try {
    new URL(apiUrl);
  } catch (error) {
    throw new Error(
      `NEXT_PUBLIC_API_URL must be a valid URL. Received: ${apiUrl}`
    );
  }

  return {
    apiUrl,
    nodeEnv,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

/**
 * Gets the API base URL with validation
 */
export function getApiUrl(): string {
  return getEnvConfig().apiUrl;
}

/**
 * Checks if we're in development mode
 */
export function isDevelopment(): boolean {
  return getEnvConfig().nodeEnv === "development";
}

/**
 * Checks if we're in production mode
 */
export function isProduction(): boolean {
  return getEnvConfig().nodeEnv === "production";
}

/**
 * Validates environment configuration on app startup
 * Should be called early in the application lifecycle
 */
export function validateEnvironment(): void {
  try {
    const config = getEnvConfig();

    if (isDevelopment()) {
      console.log("[Environment] Configuration validated:", {
        apiUrl: config.apiUrl,
        nodeEnv: config.nodeEnv,
        hasSupabaseConfig: !!(config.supabaseUrl && config.supabaseAnonKey),
      });
    }
  } catch (error) {
    console.error("[Environment] Configuration error:", error);
    throw error;
  }
}
