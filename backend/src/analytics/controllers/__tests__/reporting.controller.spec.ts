import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ReportingController } from '../reporting.controller';
import { ReportingService } from '../../services/reporting.service';
import { ExportService } from '../../services/export.service';
import { AnalyticsCacheService } from '../../services/analytics-cache.service';
import { DiversityAnalyticsService } from '../../services/diversity-analytics.service';
import { AnalyticsQueryDto } from '../../dto/analytics-query.dto';
import {
  ReportGenerationDto,
  ExportFormatDto,
  ReportSectionDto,
  DashboardDataDto,
} from '../../dto/reporting.dto';

describe('ReportingController', () => {
  let controller: ReportingController;
  let reportingService: ReportingService;
  let exportService: ExportService;
  let cacheService: AnalyticsCacheService;
  let diversityAnalyticsService: DiversityAnalyticsService;

  const mockReportingService = {
    getDashboardData: jest.fn(),
    generateReport: jest.fn(),
  };

  const mockExportService = {
    exportToCSV: jest.fn(),
    exportToPDF: jest.fn(),
    exportToExcel: jest.fn(),
  };

  const mockCacheService = {
    getDashboardData: jest.fn(),
    setDashboardData: jest.fn(),
    clear: jest.fn(),
    invalidateCompanyCache: jest.fn(),
    getCacheStats: jest.fn(),
  };

  const mockDiversityAnalyticsService = {
    getDiversityAnalytics: jest.fn(),
    calculateBiasIndicators: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportingController],
      providers: [
        {
          provide: ReportingService,
          useValue: mockReportingService,
        },
        {
          provide: ExportService,
          useValue: mockExportService,
        },
        {
          provide: AnalyticsCacheService,
          useValue: mockCacheService,
        },
        {
          provide: DiversityAnalyticsService,
          useValue: mockDiversityAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<ReportingController>(ReportingController);
    reportingService = module.get<ReportingService>(ReportingService);
    exportService = module.get<ExportService>(ExportService);
    cacheService = module.get<AnalyticsCacheService>(AnalyticsCacheService);
    diversityAnalyticsService = module.get<DiversityAnalyticsService>(
      DiversityAnalyticsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardData', () => {
    it('should return cached dashboard data when available', async () => {
      const query: AnalyticsQueryDto = { companyId: 'company-1' };
      const mockDashboardData: DashboardDataDto = {
        summary: {
          totalApplications: 100,
          totalHires: 10,
          activePositions: 5,
          timeToFill: {
            averageDays: 30,
            medianDays: 28,
            minDays: 15,
            maxDays: 60,
            totalPositions: 5,
            filledPositions: 3,
            openPositions: 2,
          },
          conversionRates: {
            applicationToScreening: 80,
            screeningToShortlist: 60,
            shortlistToInterview: 75,
            interviewToOffer: 50,
            offerToHire: 90,
            overallConversion: 10,
          },
          bottlenecks: [],
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
          },
        },
        pipelineBottlenecks: [],
        sourcePerformance: [],
        diversityAnalytics: {
          totalApplicants: 100,
          totalHired: 10,
          diversityIndex: 0.75,
          genderBalance: { applicants: {}, hired: {}, bias: 0 },
          ethnicityBalance: { applicants: {}, hired: {}, bias: 0 },
          ageBalance: { applicants: {}, hired: {}, bias: 0 },
          educationBalance: { applicants: {}, hired: {}, bias: 0 },
          biasAlerts: [],
        },
        trendData: {
          applications: [],
          hires: [],
          timeToFill: [],
        },
        lastUpdated: new Date().toISOString(),
      };

      mockCacheService.getDashboardData.mockResolvedValue(mockDashboardData);

      const result = await controller.getDashboardData(query);

      expect(result).toEqual(mockDashboardData);
      expect(mockCacheService.getDashboardData).toHaveBeenCalledWith(query);
      expect(mockReportingService.getDashboardData).not.toHaveBeenCalled();
    });

    it('should fetch fresh data when cache miss occurs', async () => {
      const query: AnalyticsQueryDto = { companyId: 'company-1' };
      const mockDashboardData: DashboardDataDto = {
        summary: {
          totalApplications: 100,
          totalHires: 10,
          activePositions: 5,
          timeToFill: {
            averageDays: 30,
            medianDays: 28,
            minDays: 15,
            maxDays: 60,
            totalPositions: 5,
            filledPositions: 3,
            openPositions: 2,
          },
          conversionRates: {
            applicationToScreening: 80,
            screeningToShortlist: 60,
            shortlistToInterview: 75,
            interviewToOffer: 50,
            offerToHire: 90,
            overallConversion: 10,
          },
          bottlenecks: [],
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
          },
        },
        pipelineBottlenecks: [],
        sourcePerformance: [],
        diversityAnalytics: {
          totalApplicants: 100,
          totalHired: 10,
          diversityIndex: 0.75,
          genderBalance: { applicants: {}, hired: {}, bias: 0 },
          ethnicityBalance: { applicants: {}, hired: {}, bias: 0 },
          ageBalance: { applicants: {}, hired: {}, bias: 0 },
          educationBalance: { applicants: {}, hired: {}, bias: 0 },
          biasAlerts: [],
        },
        trendData: {
          applications: [],
          hires: [],
          timeToFill: [],
        },
        lastUpdated: new Date().toISOString(),
      };

      mockCacheService.getDashboardData.mockResolvedValue(null);
      mockReportingService.getDashboardData.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getDashboardData(query);

      expect(result).toEqual(mockDashboardData);
      expect(mockCacheService.getDashboardData).toHaveBeenCalledWith(query);
      expect(mockReportingService.getDashboardData).toHaveBeenCalledWith(query);
      expect(mockCacheService.setDashboardData).toHaveBeenCalledWith(
        query,
        mockDashboardData,
      );
    });

    it('should handle errors gracefully', async () => {
      const query: AnalyticsQueryDto = { companyId: 'company-1' };

      mockCacheService.getDashboardData.mockResolvedValue(null);
      mockReportingService.getDashboardData.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.getDashboardData(query)).rejects.toThrow(
        HttpException,
      );
      await expect(controller.getDashboardData(query)).rejects.toThrow(
        'Failed to retrieve dashboard data',
      );
    });
  });

  describe('generateReport', () => {
    it('should generate report successfully', async () => {
      const reportConfig: ReportGenerationDto = {
        query: { companyId: 'company-1' },
        format: ExportFormatDto.CSV,
        sections: [ReportSectionDto.SUMMARY],
        title: 'Test Report',
      };

      const mockReportResult = {
        reportId: 'report-123',
        downloadUrl: '/api/reports/download/report-123.csv',
      };

      mockReportingService.generateReport.mockResolvedValue(mockReportResult);

      const result = await controller.generateReport(reportConfig);

      expect(result).toBeDefined();
      expect(result.reportId).toBe('report-123');
      expect(result.downloadUrl).toBe('/api/reports/download/report-123.csv');
      expect(result.format).toBe(ExportFormatDto.CSV);
      expect(result.generatedAt).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should handle report generation errors', async () => {
      const reportConfig: ReportGenerationDto = {
        query: { companyId: 'company-1' },
        format: ExportFormatDto.PDF,
        sections: [ReportSectionDto.SUMMARY],
      };

      mockReportingService.generateReport.mockRejectedValue(
        new Error('Report generation failed'),
      );

      await expect(controller.generateReport(reportConfig)).rejects.toThrow(
        HttpException,
      );
      await expect(controller.generateReport(reportConfig)).rejects.toThrow(
        'Failed to generate report',
      );
    });
  });

  describe('export methods', () => {
    const mockQuery: AnalyticsQueryDto = { companyId: 'company-1' };
    const mockDashboardData: DashboardDataDto = {
      summary: {
        totalApplications: 100,
        totalHires: 10,
        activePositions: 5,
        timeToFill: {
          averageDays: 30,
          medianDays: 28,
          minDays: 15,
          maxDays: 60,
          totalPositions: 5,
          filledPositions: 3,
          openPositions: 2,
        },
        conversionRates: {
          applicationToScreening: 80,
          screeningToShortlist: 60,
          shortlistToInterview: 75,
          interviewToOffer: 50,
          offerToHire: 90,
          overallConversion: 10,
        },
        bottlenecks: [],
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      },
      pipelineBottlenecks: [],
      sourcePerformance: [],
      diversityAnalytics: {
        totalApplicants: 100,
        totalHired: 10,
        diversityIndex: 0.75,
        genderBalance: { applicants: {}, hired: {}, bias: 0 },
        ethnicityBalance: { applicants: {}, hired: {}, bias: 0 },
        ageBalance: { applicants: {}, hired: {}, bias: 0 },
        educationBalance: { applicants: {}, hired: {}, bias: 0 },
        biasAlerts: [],
      },
      trendData: {
        applications: [],
        hires: [],
        timeToFill: [],
      },
      lastUpdated: new Date().toISOString(),
    };

    it('should export to CSV successfully', async () => {
      const mockDownloadUrl = '/api/reports/download/report.csv';

      mockReportingService.getDashboardData.mockResolvedValue(
        mockDashboardData,
      );
      mockExportService.exportToCSV.mockResolvedValue(mockDownloadUrl);

      const result = await controller.exportToCSV(mockQuery);

      expect(result.downloadUrl).toBe(mockDownloadUrl);
      expect(mockReportingService.getDashboardData).toHaveBeenCalledWith(
        mockQuery,
      );
      expect(mockExportService.exportToCSV).toHaveBeenCalled();
    });

    it('should export to PDF successfully', async () => {
      const mockDownloadUrl = '/api/reports/download/report.pdf';

      mockReportingService.getDashboardData.mockResolvedValue(
        mockDashboardData,
      );
      mockExportService.exportToPDF.mockResolvedValue(mockDownloadUrl);

      const result = await controller.exportToPDF(mockQuery);

      expect(result.downloadUrl).toBe(mockDownloadUrl);
      expect(mockReportingService.getDashboardData).toHaveBeenCalledWith(
        mockQuery,
      );
      expect(mockExportService.exportToPDF).toHaveBeenCalled();
    });

    it('should export to Excel successfully', async () => {
      const mockDownloadUrl = '/api/reports/download/report.xlsx';

      mockReportingService.getDashboardData.mockResolvedValue(
        mockDashboardData,
      );
      mockExportService.exportToExcel.mockResolvedValue(mockDownloadUrl);

      const result = await controller.exportToExcel(mockQuery);

      expect(result.downloadUrl).toBe(mockDownloadUrl);
      expect(mockReportingService.getDashboardData).toHaveBeenCalledWith(
        mockQuery,
      );
      expect(mockExportService.exportToExcel).toHaveBeenCalled();
    });

    it('should handle export errors', async () => {
      mockReportingService.getDashboardData.mockRejectedValue(
        new Error('Data fetch failed'),
      );

      await expect(controller.exportToCSV(mockQuery)).rejects.toThrow(
        HttpException,
      );
      await expect(controller.exportToCSV(mockQuery)).rejects.toThrow(
        'Failed to export data to CSV',
      );
    });
  });

  describe('bias detection', () => {
    it('should get bias detection successfully', async () => {
      const companyId = 'company-1';
      const jobVariantId = 'job-1';
      const mockBiasIndicators = {
        genderBias: 0.15,
        ethnicityBias: 0.08,
        ageBias: 0.12,
      };

      mockDiversityAnalyticsService.calculateBiasIndicators.mockResolvedValue(
        mockBiasIndicators,
      );

      const result = await controller.getBiasDetection(companyId, jobVariantId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(
        mockDiversityAnalyticsService.calculateBiasIndicators,
      ).toHaveBeenCalledWith(companyId, jobVariantId);
    });

    it('should handle bias detection errors', async () => {
      const companyId = 'company-1';

      mockDiversityAnalyticsService.calculateBiasIndicators.mockRejectedValue(
        new Error('Bias calculation failed'),
      );

      await expect(controller.getBiasDetection(companyId)).rejects.toThrow(
        HttpException,
      );
      await expect(controller.getBiasDetection(companyId)).rejects.toThrow(
        'Failed to retrieve bias detection data',
      );
    });
  });

  describe('diversity report', () => {
    it('should get diversity report successfully', async () => {
      const companyId = 'company-1';
      const query: AnalyticsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

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

      const mockBiasIndicators = {
        genderBias: 0.05,
        ethnicityBias: 0.1,
        ageBias: 0.08,
      };

      mockDiversityAnalyticsService.getDiversityAnalytics.mockResolvedValue(
        mockDiversityAnalytics,
      );
      mockDiversityAnalyticsService.calculateBiasIndicators.mockResolvedValue(
        mockBiasIndicators,
      );

      const result = await controller.getDiversityReport(companyId, query);

      expect(result).toBeDefined();
      expect(result.companyId).toBe(companyId);
      expect(result.overallDiversityIndex).toBe(0.75);
      expect(result.biasIndicators).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.complianceStatus).toBeDefined();
    });

    it('should handle diversity report errors', async () => {
      const companyId = 'company-1';
      const query: AnalyticsQueryDto = {};

      mockDiversityAnalyticsService.getDiversityAnalytics.mockRejectedValue(
        new Error('Diversity analytics failed'),
      );

      await expect(
        controller.getDiversityReport(companyId, query),
      ).rejects.toThrow(HttpException);
      await expect(
        controller.getDiversityReport(companyId, query),
      ).rejects.toThrow('Failed to retrieve diversity report');
    });
  });

  describe('cache management', () => {
    it('should clear cache successfully', async () => {
      mockCacheService.clear.mockResolvedValue(undefined);

      const result = await controller.clearCache();

      expect(result.message).toBe('Analytics cache cleared successfully');
      expect(mockCacheService.clear).toHaveBeenCalled();
    });

    it('should invalidate company cache successfully', async () => {
      const companyId = 'company-1';
      mockCacheService.invalidateCompanyCache.mockResolvedValue(undefined);

      const result = await controller.invalidateCompanyCache(companyId);

      expect(result.message).toBe(`Cache invalidated for company ${companyId}`);
      expect(mockCacheService.invalidateCompanyCache).toHaveBeenCalledWith(
        companyId,
      );
    });

    it('should get cache stats successfully', async () => {
      const mockStats = {
        size: 10,
        keys: ['key1', 'key2', 'key3'],
      };

      mockCacheService.getCacheStats.mockReturnValue(mockStats);

      const result = await controller.getCacheStats();

      expect(result).toEqual(mockStats);
      expect(mockCacheService.getCacheStats).toHaveBeenCalled();
    });

    it('should handle cache management errors', async () => {
      mockCacheService.clear.mockRejectedValue(new Error('Cache clear failed'));

      await expect(controller.clearCache()).rejects.toThrow(HttpException);
      await expect(controller.clearCache()).rejects.toThrow(
        'Failed to clear cache',
      );
    });
  });
});
