import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from '../analytics.service';
import { PipelineAnalyticsService } from '../pipeline-analytics.service';
import { SourceAnalyticsService } from '../source-analytics.service';
import { DiversityAnalyticsService } from '../diversity-analytics.service';
import { DataAggregationService } from '../data-aggregation.service';
import { PipelineMetrics } from '../../../entities/pipeline-metrics.entity';
import { SourcePerformance } from '../../../entities/source-performance.entity';
import { DiversityMetrics } from '../../../entities/diversity-metrics.entity';
import { AnalyticsQueryDto } from '../../dto/analytics-query.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let pipelineMetricsRepository: Repository<PipelineMetrics>;
  let sourcePerformanceRepository: Repository<SourcePerformance>;
  let diversityMetricsRepository: Repository<DiversityMetrics>;
  let pipelineAnalyticsService: PipelineAnalyticsService;
  let sourceAnalyticsService: SourceAnalyticsService;
  let diversityAnalyticsService: DiversityAnalyticsService;
  let dataAggregationService: DataAggregationService;

  const mockRepository = {
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawOne: jest.fn(),
    })),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockPipelineAnalyticsService = {
    getBottlenecks: jest.fn(),
  };

  const mockSourceAnalyticsService = {
    getSourcePerformance: jest.fn(),
  };

  const mockDiversityAnalyticsService = {
    getDiversityAnalytics: jest.fn(),
  };

  const mockDataAggregationService = {
    aggregatePipelineMetrics: jest.fn(),
    aggregateSourcePerformance: jest.fn(),
    aggregateDiversityMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(PipelineMetrics),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(SourcePerformance),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(DiversityMetrics),
          useValue: mockRepository,
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
        {
          provide: DataAggregationService,
          useValue: mockDataAggregationService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    pipelineMetricsRepository = module.get<Repository<PipelineMetrics>>(
      getRepositoryToken(PipelineMetrics),
    );
    sourcePerformanceRepository = module.get<Repository<SourcePerformance>>(
      getRepositoryToken(SourcePerformance),
    );
    diversityMetricsRepository = module.get<Repository<DiversityMetrics>>(
      getRepositoryToken(DiversityMetrics),
    );
    pipelineAnalyticsService = module.get<PipelineAnalyticsService>(
      PipelineAnalyticsService,
    );
    sourceAnalyticsService = module.get<SourceAnalyticsService>(
      SourceAnalyticsService,
    );
    diversityAnalyticsService = module.get<DiversityAnalyticsService>(
      DiversityAnalyticsService,
    );
    dataAggregationService = module.get<DataAggregationService>(
      DataAggregationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTimeToFillMetrics', () => {
    it('should return time-to-fill metrics for given query', async () => {
      const query: AnalyticsQueryDto = {
        companyId: 'company-1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockMetrics = [
        {
          id: '1',
          companyId: 'company-1',
          avgTimeToFillDays: 15,
          totalApplications: 100,
          candidatesHired: 10,
        },
        {
          id: '2',
          companyId: 'company-1',
          avgTimeToFillDays: 20,
          totalApplications: 80,
          candidatesHired: 8,
        },
      ];

      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMetrics),
      };

      jest
        .spyOn(pipelineMetricsRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const result = await service.getTimeToFillMetrics(query);

      expect(result).toEqual({
        averageDays: 17.5,
        medianDays: 17.5,
        minDays: 15,
        maxDays: 20,
        totalPositions: 180,
        filledPositions: 18,
        openPositions: 162,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'pm.companyId = :companyId',
        { companyId: 'company-1' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'pm.dateRange BETWEEN :startDate AND :endDate',
        {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      );
    });

    it('should return zero metrics when no data is available', async () => {
      const query: AnalyticsQueryDto = {
        companyId: 'company-1',
      };

      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(pipelineMetricsRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const result = await service.getTimeToFillMetrics(query);

      expect(result).toEqual({
        averageDays: 0,
        medianDays: 0,
        minDays: 0,
        maxDays: 0,
        totalPositions: 0,
        filledPositions: 0,
        openPositions: 0,
      });
    });
  });

  describe('getConversionRates', () => {
    it('should return conversion rates for given query', async () => {
      const query: AnalyticsQueryDto = {
        companyId: 'company-1',
      };

      const mockResult = {
        totalApplications: '1000',
        applicationsScreened: '800',
        applicationsShortlisted: '400',
        interviewsScheduled: '200',
        offersExtended: '100',
        candidatesHired: '50',
      };

      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockResult),
      };

      jest
        .spyOn(pipelineMetricsRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const result = await service.getConversionRates(query);

      expect(result).toEqual({
        applicationToScreening: 80,
        screeningToShortlist: 50,
        shortlistToInterview: 50,
        interviewToOffer: 50,
        offerToHire: 50,
        overallConversion: 5,
      });
    });

    it('should handle zero values gracefully', async () => {
      const query: AnalyticsQueryDto = {};

      const mockResult = {
        totalApplications: '0',
        applicationsScreened: '0',
        applicationsShortlisted: '0',
        interviewsScheduled: '0',
        offersExtended: '0',
        candidatesHired: '0',
      };

      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockResult),
      };

      jest
        .spyOn(pipelineMetricsRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const result = await service.getConversionRates(query);

      expect(result).toEqual({
        applicationToScreening: 0,
        screeningToShortlist: 0,
        shortlistToInterview: 0,
        interviewToOffer: 0,
        offerToHire: 0,
        overallConversion: 0,
      });
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should return complete analytics summary', async () => {
      const query: AnalyticsQueryDto = {
        companyId: 'company-1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockTimeToFill = {
        averageDays: 15,
        medianDays: 15,
        minDays: 10,
        maxDays: 20,
        totalPositions: 100,
        filledPositions: 10,
        openPositions: 90,
      };

      const mockConversionRates = {
        applicationToScreening: 80,
        screeningToShortlist: 50,
        shortlistToInterview: 50,
        interviewToOffer: 50,
        offerToHire: 50,
        overallConversion: 5,
      };

      const mockBottlenecks = [
        {
          stage: 'screening',
          dropOffRate: 20,
          averageTimeInStage: 3,
          candidatesInStage: 80,
          isBottleneck: false,
        },
      ];

      // Mock the individual method calls
      jest
        .spyOn(service, 'getTimeToFillMetrics')
        .mockResolvedValue(mockTimeToFill);
      jest
        .spyOn(service, 'getConversionRates')
        .mockResolvedValue(mockConversionRates);
      mockPipelineAnalyticsService.getBottlenecks.mockResolvedValue(
        mockBottlenecks,
      );

      // Mock private methods
      jest
        .spyOn(service as any, 'getTotalApplications')
        .mockResolvedValue(1000);
      jest.spyOn(service as any, 'getTotalHires').mockResolvedValue(50);
      jest.spyOn(service as any, 'getActivePositions').mockResolvedValue(25);

      const result = await service.getAnalyticsSummary(query);

      expect(result).toEqual({
        timeToFill: mockTimeToFill,
        conversionRates: mockConversionRates,
        bottlenecks: mockBottlenecks,
        totalApplications: 1000,
        totalHires: 50,
        activePositions: 25,
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      });
    });
  });

  describe('refreshMetrics', () => {
    it('should refresh all metrics successfully', async () => {
      const companyId = 'company-1';

      mockDataAggregationService.aggregatePipelineMetrics.mockResolvedValue(
        undefined,
      );
      mockDataAggregationService.aggregateSourcePerformance.mockResolvedValue(
        undefined,
      );
      mockDataAggregationService.aggregateDiversityMetrics.mockResolvedValue(
        undefined,
      );

      await service.refreshMetrics(companyId);

      expect(
        mockDataAggregationService.aggregatePipelineMetrics,
      ).toHaveBeenCalledWith(companyId);
      expect(
        mockDataAggregationService.aggregateSourcePerformance,
      ).toHaveBeenCalledWith(companyId);
      expect(
        mockDataAggregationService.aggregateDiversityMetrics,
      ).toHaveBeenCalledWith(companyId);
    });

    it('should handle errors during metrics refresh', async () => {
      const error = new Error('Aggregation failed');
      mockDataAggregationService.aggregatePipelineMetrics.mockRejectedValue(
        error,
      );

      await expect(service.refreshMetrics()).rejects.toThrow(
        'Aggregation failed',
      );
    });
  });
});
