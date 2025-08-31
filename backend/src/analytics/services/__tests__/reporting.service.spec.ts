import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportingService } from '../reporting.service';
import { AnalyticsService } from '../analytics.service';
import { PipelineAnalyticsService } from '../pipeline-analytics.service';
import { SourceAnalyticsService } from '../source-analytics.service';
import { DiversityAnalyticsService } from '../diversity-analytics.service';
import { PipelineMetrics } from '../../../entities/pipeline-metrics.entity';
import { SourcePerformance } from '../../../entities/source-performance.entity';
import { DiversityMetrics } from '../../../entities/diversity-metrics.entity';
import { AnalyticsQueryDto } from '../../dto/analytics-query.dto';
import {
  ReportGenerationDto,
  ExportFormatDto,
  ReportSectionDto,
} from '../../dto/reporting.dto';

describe('ReportingService', () => {
  let service: ReportingService;
  let pipelineMetricsRepository: Repository<PipelineMetrics>;
  let sourcePerformanceRepository: Repository<SourcePerformance>;
  let diversityMetricsRepository: Repository<DiversityMetrics>;
  let analyticsService: AnalyticsService;
  let pipelineAnalyticsService: PipelineAnalyticsService;
  let sourceAnalyticsService: SourceAnalyticsService;
  let diversityAnalyticsService: DiversityAnalyticsService;

  const mockPipelineMetricsRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockSourcePerformanceRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockDiversityMetricsRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockAnalyticsService = {
    getAnalyticsSummary: jest.fn(),
    getTimeToFillMetrics: jest.fn(),
    getConversionRates: jest.fn(),
  };

  const mockPipelineAnalyticsService = {
    getBottlenecks: jest.fn(),
    getStagePerformance: jest.fn(),
  };

  const mockSourceAnalyticsService = {
    getSourcePerformance: jest.fn(),
  };

  const mockDiversityAnalyticsService = {
    getDiversityAnalytics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: getRepositoryToken(PipelineMetrics),
          useValue: mockPipelineMetricsRepository,
        },
        {
          provide: getRepositoryToken(SourcePerformance),
          useValue: mockSourcePerformanceRepository,
        },
        {
          provide: getRepositoryToken(DiversityMetrics),
          useValue: mockDiversityMetricsRepository,
        },
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: PipelineAnalyticsService,
          useValue: mockPipelineAnalyticsService,
        },
        {
          provide: SourceAnalyticsService,
          useValue: mockSourceAnalyticsService,
        },
        {
          provide: DiversityAnalyticsService,
          useValue: mockDiversityAnalyticsService,
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    pipelineMetricsRepository = module.get<Repository<PipelineMetrics>>(
      getRepositoryToken(PipelineMetrics),
    );
    sourcePerformanceRepository = module.get<Repository<SourcePerformance>>(
      getRepositoryToken(SourcePerformance),
    );
    diversityMetricsRepository = module.get<Repository<DiversityMetrics>>(
      getRepositoryToken(DiversityMetrics),
    );
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    pipelineAnalyticsService = module.get<PipelineAnalyticsService>(
      PipelineAnalyticsService,
    );
    sourceAnalyticsService = module.get<SourceAnalyticsService>(
      SourceAnalyticsService,
    );
    diversityAnalyticsService = module.get<DiversityAnalyticsService>(
      DiversityAnalyticsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardData', () => {
    it('should return comprehensive dashboard data', async () => {
      const query: AnalyticsQueryDto = {
        companyId: 'company-1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockSummary = {
        totalApplications: 100,
        totalHires: 10,
        activePositions: 5,
        timeToFill: { averageDays: 30 },
        conversionRates: { overallConversion: 10 },
        bottlenecks: [],
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
      };

      const mockBottlenecks = [
        {
          stage: 'screening',
          dropOffRate: 50,
          averageTimeInStage: 5,
          candidatesInStage: 25,
          isBottleneck: true,
        },
      ];

      const mockSourcePerformance = [
        {
          source: 'LinkedIn',
          totalCandidates: 50,
          hiredCandidates: 5,
          conversionRate: 10,
          qualityScore: 8.5,
          roi: 150,
        },
      ];

      const mockDiversityAnalytics = {
        totalApplicants: 100,
        totalHired: 10,
        diversityIndex: 0.75,
        genderBalance: { applicants: {}, hired: {}, bias: 0.05 },
        ethnicityBalance: { applicants: {}, hired: {}, bias: 0.1 },
        ageBalance: { applicants: {}, hired: {}, bias: 0.08 },
        educationBalance: { applicants: {}, hired: {}, bias: 0.03 },
        biasAlerts: [],
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            dateRange: '2024-01-01',
            totalApplications: 10,
            candidatesHired: 1,
            avgTimeToFillDays: 30,
          },
        ]),
      };

      mockAnalyticsService.getAnalyticsSummary.mockResolvedValue(mockSummary);
      mockPipelineAnalyticsService.getBottlenecks.mockResolvedValue(
        mockBottlenecks,
      );
      mockSourceAnalyticsService.getSourcePerformance.mockResolvedValue(
        mockSourcePerformance,
      );
      mockDiversityAnalyticsService.getDiversityAnalytics.mockResolvedValue(
        mockDiversityAnalytics,
      );
      mockPipelineMetricsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getDashboardData(query);

      expect(result).toBeDefined();
      expect(result.summary).toEqual(mockSummary);
      expect(result.pipelineBottlenecks).toEqual(mockBottlenecks);
      expect(result.sourcePerformance).toEqual(mockSourcePerformance);
      expect(result.diversityAnalytics).toEqual(mockDiversityAnalytics);
      expect(result.trendData).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const query: AnalyticsQueryDto = { companyId: 'company-1' };

      mockAnalyticsService.getAnalyticsSummary.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getDashboardData(query)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('generateReport', () => {
    it('should generate CSV report successfully', async () => {
      const reportConfig: ReportGenerationDto = {
        query: { companyId: 'company-1' },
        format: ExportFormatDto.CSV,
        sections: [ReportSectionDto.SUMMARY, ReportSectionDto.SOURCES],
        title: 'Test Report',
      };

      const mockSummary = {
        totalApplications: 100,
        totalHires: 10,
        activePositions: 5,
        timeToFill: { averageDays: 30 },
        conversionRates: { overallConversion: 10 },
        bottlenecks: [],
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
      };

      const mockSources = [
        {
          source: 'LinkedIn',
          totalCandidates: 50,
          hiredCandidates: 5,
          conversionRate: 10,
        },
      ];

      mockAnalyticsService.getAnalyticsSummary.mockResolvedValue(mockSummary);
      mockSourceAnalyticsService.getSourcePerformance.mockResolvedValue(
        mockSources,
      );

      const result = await service.generateReport(reportConfig);

      expect(result).toBeDefined();
      expect(result.reportId).toBeDefined();
      expect(result.downloadUrl).toContain('.csv');
      expect(mockAnalyticsService.getAnalyticsSummary).toHaveBeenCalledWith(
        reportConfig.query,
      );
      expect(
        mockSourceAnalyticsService.getSourcePerformance,
      ).toHaveBeenCalledWith(reportConfig.query);
    });

    it('should generate PDF report successfully', async () => {
      const reportConfig: ReportGenerationDto = {
        query: { companyId: 'company-1' },
        format: ExportFormatDto.PDF,
        sections: [ReportSectionDto.SUMMARY],
        title: 'Test PDF Report',
      };

      const mockSummary = {
        totalApplications: 100,
        totalHires: 10,
        activePositions: 5,
        timeToFill: { averageDays: 30 },
        conversionRates: { overallConversion: 10 },
        bottlenecks: [],
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
      };

      mockAnalyticsService.getAnalyticsSummary.mockResolvedValue(mockSummary);

      const result = await service.generateReport(reportConfig);

      expect(result).toBeDefined();
      expect(result.reportId).toBeDefined();
      expect(result.downloadUrl).toContain('.pdf');
    });

    it('should generate Excel report successfully', async () => {
      const reportConfig: ReportGenerationDto = {
        query: { companyId: 'company-1' },
        format: ExportFormatDto.EXCEL,
        sections: [ReportSectionDto.SUMMARY],
        title: 'Test Excel Report',
      };

      const mockSummary = {
        totalApplications: 100,
        totalHires: 10,
        activePositions: 5,
        timeToFill: { averageDays: 30 },
        conversionRates: { overallConversion: 10 },
        bottlenecks: [],
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
      };

      mockAnalyticsService.getAnalyticsSummary.mockResolvedValue(mockSummary);

      const result = await service.generateReport(reportConfig);

      expect(result).toBeDefined();
      expect(result.reportId).toBeDefined();
      expect(result.downloadUrl).toContain('.xlsx');
    });

    it('should throw error for unsupported format', async () => {
      const reportConfig: ReportGenerationDto = {
        query: { companyId: 'company-1' },
        format: 'unsupported' as ExportFormatDto,
        sections: [ReportSectionDto.SUMMARY],
      };

      await expect(service.generateReport(reportConfig)).rejects.toThrow(
        'Unsupported report format',
      );
    });

    it('should handle data collection errors', async () => {
      const reportConfig: ReportGenerationDto = {
        query: { companyId: 'company-1' },
        format: ExportFormatDto.CSV,
        sections: [ReportSectionDto.SUMMARY],
      };

      mockAnalyticsService.getAnalyticsSummary.mockRejectedValue(
        new Error('Data collection failed'),
      );

      await expect(service.generateReport(reportConfig)).rejects.toThrow(
        'Data collection failed',
      );
    });
  });

  describe('trend data aggregation', () => {
    it('should aggregate trend data correctly', async () => {
      const query: AnalyticsQueryDto = {
        companyId: 'company-1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockMetrics = [
        {
          dateRange: '2024-01-01',
          totalApplications: 10,
          candidatesHired: 1,
          avgTimeToFillDays: 30,
        },
        {
          dateRange: '2024-01-02',
          totalApplications: 15,
          candidatesHired: 2,
          avgTimeToFillDays: 25,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMetrics),
      };

      mockPipelineMetricsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockAnalyticsService.getAnalyticsSummary.mockResolvedValue({});
      mockPipelineAnalyticsService.getBottlenecks.mockResolvedValue([]);
      mockSourceAnalyticsService.getSourcePerformance.mockResolvedValue([]);
      mockDiversityAnalyticsService.getDiversityAnalytics.mockResolvedValue({});

      const result = await service.getDashboardData(query);

      expect(result.trendData).toBeDefined();
      expect(result.trendData.applications).toHaveLength(2);
      expect(result.trendData.hires).toHaveLength(2);
      expect(result.trendData.timeToFill).toHaveLength(2);
    });
  });
});
