// Performance monitoring utilities for Core Web Vitals and user experience metrics

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte

  // Custom metrics
  pageLoadTime?: number;
  apiResponseTime?: number;
  renderTime?: number;

  // User context
  url: string;
  userAgent: string;
  timestamp: number;
  sessionId: string;
}

export interface PerformanceThresholds {
  lcp: { good: number; needsImprovement: number };
  fid: { good: number; needsImprovement: number };
  cls: { good: number; needsImprovement: number };
  fcp: { good: number; needsImprovement: number };
  ttfb: { good: number; needsImprovement: number };
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private sessionId: string;
  private isSupported: boolean;

  // Core Web Vitals thresholds (Google recommendations)
  private thresholds: PerformanceThresholds = {
    lcp: { good: 2500, needsImprovement: 4000 },
    fid: { good: 100, needsImprovement: 300 },
    cls: { good: 0.1, needsImprovement: 0.25 },
    fcp: { good: 1800, needsImprovement: 3000 },
    ttfb: { good: 800, needsImprovement: 1800 },
  };

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isSupported = this.checkSupport();

    if (this.isSupported) {
      this.initializeObservers();
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkSupport(): boolean {
    return (
      typeof window !== "undefined" &&
      "PerformanceObserver" in window &&
      "performance" in window
    );
  }

  private initializeObservers(): void {
    // Largest Contentful Paint
    this.observeMetric("largest-contentful-paint", (entry: any) => {
      this.recordMetric("lcp", entry.startTime);
    });

    // First Input Delay
    this.observeMetric("first-input", (entry: any) => {
      this.recordMetric("fid", entry.processingStart - entry.startTime);
    });

    // Cumulative Layout Shift
    this.observeMetric("layout-shift", (entry: any) => {
      if (!entry.hadRecentInput) {
        this.recordMetric("cls", entry.value);
      }
    });

    // First Contentful Paint
    this.observeMetric("paint", (entry: any) => {
      if (entry.name === "first-contentful-paint") {
        this.recordMetric("fcp", entry.startTime);
      }
    });

    // Navigation timing for TTFB
    this.observeMetric("navigation", (entry: any) => {
      this.recordMetric("ttfb", entry.responseStart - entry.requestStart);
    });
  }

  private observeMetric(type: string, callback: (entry: any) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });

      observer.observe({ type, buffered: true });
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error);
    }
  }

  private recordMetric(name: keyof PerformanceMetrics, value: number): void {
    const existingMetric = this.metrics.find(
      (m) => m.url === window.location.href
    );

    if (existingMetric) {
      existingMetric[name] = value;
    } else {
      this.metrics.push({
        [name]: value,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        sessionId: this.sessionId,
      } as PerformanceMetrics);
    }
  }

  // Public methods
  public measurePageLoad(): void {
    if (!this.isSupported) return;

    const startTime = performance.now();

    window.addEventListener("load", () => {
      const loadTime = performance.now() - startTime;
      this.recordMetric("pageLoadTime", loadTime);
    });
  }

  public measureApiCall<T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> {
    if (!this.isSupported) return apiCall();

    const startTime = performance.now();

    return apiCall().finally(() => {
      const responseTime = performance.now() - startTime;
      this.recordMetric("apiResponseTime", responseTime);

      // Log slow API calls
      if (responseTime > 2000) {
        console.warn(
          `Slow API call detected: ${endpoint} took ${responseTime}ms`
        );
      }
    });
  }

  public measureRender(componentName: string): () => void {
    if (!this.isSupported) return () => {};

    const startTime = performance.now();

    return () => {
      const renderTime = performance.now() - startTime;
      this.recordMetric("renderTime", renderTime);

      // Log slow renders
      if (renderTime > 16) {
        // 60fps = 16.67ms per frame
        console.warn(
          `Slow render detected: ${componentName} took ${renderTime}ms`
        );
      }
    };
  }

  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0
      ? this.metrics[this.metrics.length - 1]
      : null;
  }

  public getMetricScore(
    metric: keyof PerformanceThresholds,
    value: number
  ): "good" | "needs-improvement" | "poor" {
    const threshold = this.thresholds[metric];
    if (!threshold) return "good";

    if (value <= threshold.good) return "good";
    if (value <= threshold.needsImprovement) return "needs-improvement";
    return "poor";
  }

  public getOverallScore(): number {
    const latest = this.getLatestMetrics();
    if (!latest) return 0;

    let totalScore = 0;
    let metricCount = 0;

    // Score each Core Web Vital (0-100 scale)
    if (latest.lcp) {
      const score = this.getMetricScore("lcp", latest.lcp);
      totalScore +=
        score === "good" ? 100 : score === "needs-improvement" ? 50 : 0;
      metricCount++;
    }

    if (latest.fid) {
      const score = this.getMetricScore("fid", latest.fid);
      totalScore +=
        score === "good" ? 100 : score === "needs-improvement" ? 50 : 0;
      metricCount++;
    }

    if (latest.cls) {
      const score = this.getMetricScore("cls", latest.cls);
      totalScore +=
        score === "good" ? 100 : score === "needs-improvement" ? 50 : 0;
      metricCount++;
    }

    return metricCount > 0 ? Math.round(totalScore / metricCount) : 0;
  }

  public sendMetrics(endpoint: string): void {
    if (this.metrics.length === 0) return;

    // Send metrics to analytics endpoint
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metrics: this.metrics,
        sessionId: this.sessionId,
      }),
    }).catch((error) => {
      console.warn("Failed to send performance metrics:", error);
    });

    // Clear sent metrics
    this.metrics = [];
  }

  public startResourceMonitoring(): void {
    if (!this.isSupported) return;

    // Monitor resource loading
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.duration > 1000) {
          // Resources taking > 1s
          console.warn(`Slow resource: ${entry.name} took ${entry.duration}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ["resource"] });
  }

  public measureMemoryUsage(): any {
    if (!this.isSupported || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: Math.round(
        (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      ),
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    measureRender: performanceMonitor.measureRender.bind(performanceMonitor),
    measureApiCall: performanceMonitor.measureApiCall.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getOverallScore:
      performanceMonitor.getOverallScore.bind(performanceMonitor),
    sendMetrics: performanceMonitor.sendMetrics.bind(performanceMonitor),
  };
}
