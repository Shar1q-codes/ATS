"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { validateEnvironment, getEnvConfig, EnvConfig } from "@/lib/env-config";

interface EnvContextType {
  config: EnvConfig | null;
  isValid: boolean;
  error: string | null;
}

const EnvContext = createContext<EnvContextType>({
  config: null,
  isValid: false,
  error: null,
});

export const useEnv = () => {
  const context = useContext(EnvContext);
  if (!context) {
    throw new Error("useEnv must be used within an EnvProvider");
  }
  return context;
};

interface EnvProviderProps {
  children: React.ReactNode;
}

export function EnvProvider({ children }: EnvProviderProps) {
  const [config, setConfig] = useState<EnvConfig | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      validateEnvironment();
      const envConfig = getEnvConfig();
      setConfig(envConfig);
      setIsValid(true);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Environment validation failed";
      setError(errorMessage);
      setIsValid(false);
      setConfig(null);
      console.error("[EnvProvider] Environment validation failed:", err);
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">
                Configuration Error
              </h3>
            </div>
          </div>
          <div className="text-sm text-red-700">
            <p className="mb-2">{error}</p>
            <p className="text-xs text-red-600">
              Please check your environment configuration and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValid || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">
            Validating configuration...
          </p>
        </div>
      </div>
    );
  }

  return (
    <EnvContext.Provider value={{ config, isValid, error }}>
      {children}
    </EnvContext.Provider>
  );
}
