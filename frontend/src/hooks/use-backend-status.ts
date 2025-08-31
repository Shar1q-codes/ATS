import { useState, useEffect, useCallback } from "react";
import { backendService } from "@/lib/backend-service";

interface BackendStatus {
  running: boolean;
  healthy: boolean;
  details?: any;
  lastCheck: Date;
}

interface ServiceMetrics {
  overview: {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    overallHealth: "healthy" | "degraded" | "unhealthy";
  };
  services: Array<{
    name: string;
    status: "healthy" | "degraded" | "unhealthy";
    lastCheck: Date;
    responseTime?: number;
    errorCount: number;
    uptime: number;
  }>;
  lastUpdate: string;
}

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>({
    running: false,
    healthy: false,
    lastCheck: new Date(),
  });
  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      setError(null);
      const backendStatus = await backendService.getBackendStatus();

      setStatus({
        ...backendStatus,
        lastCheck: new Date(),
      });

      // If backend is running, get metrics
      if (backendStatus.running && backendStatus.healthy) {
        const serviceMetrics = await backendService.getServiceMetrics();
        setMetrics(serviceMetrics);
      } else {
        setMetrics(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus((prev) => ({
        ...prev,
        running: false,
        healthy: false,
        lastCheck: new Date(),
      }));
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ensureBackendRunning = useCallback(async () => {
    setIsLoading(true);
    try {
      const success = await backendService.ensureBackendRunning();
      if (success) {
        await checkStatus();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start backend");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkStatus]);

  useEffect(() => {
    // Initial check
    checkStatus();

    // Set up periodic health checks
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    status,
    metrics,
    isLoading,
    error,
    checkStatus,
    ensureBackendRunning,
    refresh: checkStatus,
  };
}
