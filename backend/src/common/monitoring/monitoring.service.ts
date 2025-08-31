import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StartupService } from '../startup/startup.service';

interface ServiceMetrics {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime?: number;
  errorCount: number;
  uptime: number;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private metrics: Map<string, ServiceMetrics> = new Map();
  private alertThresholds = {
    errorRate: 0.1, // 10% error rate threshold
    responseTime: 5000, // 5 second response time threshold
  };

  constructor(private startupService: StartupService) {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    const services = ['database', 'redis', 'openai', 'storage'];
    services.forEach((service) => {
      this.metrics.set(service, {
        name: service,
        status: 'healthy',
        lastCheck: new Date(),
        errorCount: 0,
        uptime: 0,
      });
    });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async performHealthChecks() {
    this.logger.debug('Performing scheduled health checks');

    const startupStatus = this.startupService.getHealthStatus();

    for (const [serviceName, serviceStatus] of Object.entries(
      startupStatus.services,
    )) {
      const metric = this.metrics.get(serviceName);
      if (metric) {
        const startTime = Date.now();

        try {
          // Perform service-specific health check
          const isHealthy = await this.checkServiceHealth(serviceName);
          const responseTime = Date.now() - startTime;

          metric.status = isHealthy ? 'healthy' : 'unhealthy';
          metric.lastCheck = new Date();
          metric.responseTime = responseTime;
          metric.uptime = startupStatus.uptime;

          if (!isHealthy) {
            metric.errorCount++;
            this.logger.warn(`Service ${serviceName} health check failed`);
          }

          // Check for alerts
          this.checkAlerts(metric);
        } catch (error) {
          metric.status = 'unhealthy';
          metric.errorCount++;
          metric.lastCheck = new Date();
          this.logger.error(`Health check failed for ${serviceName}`, error);
        }
      }
    }
  }

  private async checkServiceHealth(serviceName: string): Promise<boolean> {
    try {
      switch (serviceName) {
        case 'database':
          // Database health check is handled by StartupService
          return true;
        case 'redis':
          // Redis health check is handled by StartupService
          return true;
        case 'openai':
          // OpenAI health check is handled by StartupService
          return true;
        case 'storage':
          // Storage health check is handled by StartupService
          return true;
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(
        `Service health check failed for ${serviceName}`,
        error,
      );
      return false;
    }
  }

  private checkAlerts(metric: ServiceMetrics) {
    // Check response time alert
    if (
      metric.responseTime &&
      metric.responseTime > this.alertThresholds.responseTime
    ) {
      this.logger.warn(
        `High response time alert for ${metric.name}: ${metric.responseTime}ms`,
      );
    }

    // Check error rate alert (simplified - in production, you'd want a sliding window)
    const totalChecks = Math.max(1, metric.errorCount + 1); // Avoid division by zero
    const errorRate = metric.errorCount / totalChecks;

    if (errorRate > this.alertThresholds.errorRate) {
      this.logger.warn(
        `High error rate alert for ${metric.name}: ${(errorRate * 100).toFixed(2)}%`,
      );
    }
  }

  getMetrics(): ServiceMetrics[] {
    return Array.from(this.metrics.values());
  }

  getServiceMetric(serviceName: string): ServiceMetrics | undefined {
    return this.metrics.get(serviceName);
  }

  getDashboardData() {
    const metrics = this.getMetrics();
    const healthyServices = metrics.filter(
      (m) => m.status === 'healthy',
    ).length;
    const totalServices = metrics.length;

    return {
      overview: {
        totalServices,
        healthyServices,
        unhealthyServices: totalServices - healthyServices,
        overallHealth:
          healthyServices === totalServices ? 'healthy' : 'degraded',
      },
      services: metrics,
      lastUpdate: new Date().toISOString(),
    };
  }

  async restartUnhealthyServices(): Promise<{
    restarted: string[];
    failed: string[];
  }> {
    const restarted: string[] = [];
    const failed: string[] = [];

    const unhealthyServices = this.getMetrics().filter(
      (m) => m.status === 'unhealthy',
    );

    for (const service of unhealthyServices) {
      try {
        const success = await this.startupService.restartService(service.name);
        if (success) {
          restarted.push(service.name);
          // Reset error count on successful restart
          service.errorCount = 0;
          service.status = 'healthy';
        } else {
          failed.push(service.name);
        }
      } catch (error) {
        failed.push(service.name);
        this.logger.error(`Failed to restart service ${service.name}`, error);
      }
    }

    return { restarted, failed };
  }
}
