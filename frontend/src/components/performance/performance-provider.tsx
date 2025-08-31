"use client";

import React from "react";
import { performanceMonitor } from "@/lib/performance-monitor";
import { serviceWorkerManager } from "@/lib/service-worker";

interface PerformanceProviderProps {
  children: React.ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  React.useEffect(() => {
    // Initialize performance monitoring
    performanceMonitor.measurePageLoad();
    performanceMonitor.startResourceMonitoring();

    // Register service worker
    if (typeof window !== "undefined") {
      serviceWorkerManager.register({
        onUpdate: (registration) => {
          console.log("Service Worker update available");
          // You could show a toast notification here
        },
        onSuccess: (registration) => {
          console.log("Service Worker registered successfully");
        },
        onError: (error) => {
          console.error("Service Worker registration failed:", error);
        },
      });
    }

    // Send performance metrics periodically
    const metricsInterval = setInterval(() => {
      if (typeof window !== "undefined" && navigator.onLine) {
        performanceMonitor.sendMetrics("/api/analytics/performance");
      }
    }, 60000); // Send every minute

    // Cleanup
    return () => {
      clearInterval(metricsInterval);
    };
  }, []);

  // Monitor memory usage and warn if high
  React.useEffect(() => {
    const memoryInterval = setInterval(() => {
      const memoryInfo = performanceMonitor.measureMemoryUsage();
      if (memoryInfo && memoryInfo.usagePercentage > 80) {
        console.warn("High memory usage detected:", memoryInfo);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(memoryInterval);
  }, []);

  return <>{children}</>;
}
