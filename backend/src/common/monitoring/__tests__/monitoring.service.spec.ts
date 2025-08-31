import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from '../monitoring.service';
import { StartupService } from '../../startup/startup.service';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let startupService: StartupService;

  const mockStartupService = {
    getHealthStatus: jest.fn(),
    restartService: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        {
          provide: StartupService,
          useValue: mockStartupService,
        },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    startupService = module.get<StartupService>(StartupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return service metrics', () => {
      const metrics = service.getMetrics();

      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);

      metrics.forEach((metric) => {
        expect(metric).toHaveProperty('name');
        expect(metric).toHaveProperty('status');
        expect(metric).toHaveProperty('lastCheck');
        expect(metric).toHaveProperty('errorCount');
        expect(metric).toHaveProperty('uptime');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(metric.status);
      });
    });
  });

  describe('getServiceMetric', () => {
    it('should return specific service metric', () => {
      const metric = service.getServiceMetric('database');

      expect(metric).toBeDefined();
      expect(metric?.name).toBe('database');
    });

    it('should return undefined for non-existent service', () => {
      const metric = service.getServiceMetric('nonexistent');

      expect(metric).toBeUndefined();
    });
  });

  describe('getDashboardData', () => {
    it('should return dashboard data', () => {
      const dashboardData = service.getDashboardData();

      expect(dashboardData).toHaveProperty('overview');
      expect(dashboardData).toHaveProperty('services');
      expect(dashboardData).toHaveProperty('lastUpdate');

      expect(dashboardData.overview).toHaveProperty('totalServices');
      expect(dashboardData.overview).toHaveProperty('healthyServices');
      expect(dashboardData.overview).toHaveProperty('unhealthyServices');
      expect(dashboardData.overview).toHaveProperty('overallHealth');

      expect(['healthy', 'degraded']).toContain(
        dashboardData.overview.overallHealth,
      );
    });
  });

  describe('restartUnhealthyServices', () => {
    it('should restart unhealthy services', async () => {
      // Mock some unhealthy services
      const metrics = service.getMetrics();
      if (metrics.length > 0) {
        metrics[0].status = 'unhealthy';
      }

      mockStartupService.restartService.mockResolvedValue(true);

      const result = await service.restartUnhealthyServices();

      expect(result).toHaveProperty('restarted');
      expect(result).toHaveProperty('failed');
      expect(Array.isArray(result.restarted)).toBe(true);
      expect(Array.isArray(result.failed)).toBe(true);
    });

    it('should handle restart failures', async () => {
      // Mock some unhealthy services
      const metrics = service.getMetrics();
      if (metrics.length > 0) {
        metrics[0].status = 'unhealthy';
      }

      mockStartupService.restartService.mockResolvedValue(false);

      const result = await service.restartUnhealthyServices();

      expect(result.failed.length).toBeGreaterThan(0);
    });
  });

  describe('performHealthChecks', () => {
    it('should perform health checks', async () => {
      mockStartupService.getHealthStatus.mockReturnValue({
        healthy: true,
        startupTime: new Date(),
        uptime: 1000,
        services: {
          database: true,
          redis: true,
          openai: true,
          storage: true,
        },
      });

      await service.performHealthChecks();

      expect(mockStartupService.getHealthStatus).toHaveBeenCalled();
    });
  });
});
