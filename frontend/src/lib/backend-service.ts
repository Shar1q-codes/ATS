class BackendService {
  private static instance: BackendService;
  private healthCheckUrl = "http://localhost:3001/api/health";
  private isStarting = false;

  static getInstance(): BackendService {
    if (!BackendService.instance) {
      BackendService.instance = new BackendService();
    }
    return BackendService.instance;
  }

  async ensureBackendRunning(): Promise<boolean> {
    try {
      // Check if backend is already running
      if (await this.isBackendHealthy()) {
        return true;
      }

      // If not running and not already starting, attempt to start
      if (!this.isStarting) {
        console.log("Backend not detected, attempting to start...");
        return await this.startBackend();
      }

      return false;
    } catch (error) {
      console.error("Error ensuring backend is running:", error);
      return false;
    }
  }

  async isBackendHealthy(): Promise<boolean> {
    try {
      const response = await fetch(this.healthCheckUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getBackendStatus(): Promise<{
    running: boolean;
    healthy: boolean;
    details?: any;
  }> {
    try {
      const running = await this.isBackendHealthy();

      if (!running) {
        return { running: false, healthy: false };
      }

      // Get detailed health information
      try {
        const detailsResponse = await fetch(`${this.healthCheckUrl}/detailed`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(5000),
        });

        if (detailsResponse.ok) {
          const details = await detailsResponse.json();
          return {
            running: true,
            healthy: true,
            details,
          };
        }
      } catch (detailsError) {
        // Basic health check passed, detailed might not be available
      }

      return { running: true, healthy: true };
    } catch (error) {
      return { running: false, healthy: false };
    }
  }

  private async startBackend(): Promise<boolean> {
    if (this.isStarting) {
      return false;
    }

    this.isStarting = true;

    try {
      // In a browser environment, we can't directly start the backend
      // This would typically be handled by the development server or deployment
      console.log(
        "Backend startup should be handled by the development environment"
      );

      // Wait a bit and check if backend becomes available
      await this.waitForBackend(30000); // Wait up to 30 seconds

      const isHealthy = await this.isBackendHealthy();
      return isHealthy;
    } catch (error) {
      console.error("Failed to start backend:", error);
      return false;
    } finally {
      this.isStarting = false;
    }
  }

  private async waitForBackend(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < timeoutMs) {
      if (await this.isBackendHealthy()) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    throw new Error("Backend startup timeout");
  }

  async getServiceMetrics(): Promise<any> {
    try {
      const response = await fetch(
        "http://localhost:3001/api/monitoring/dashboard",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error("Failed to get service metrics:", error);
      return null;
    }
  }
}

export const backendService = BackendService.getInstance();
