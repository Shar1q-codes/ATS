import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineAnalyticsService } from '../pipeline-analytics.service';
import { PipelineMetrics } from '../../../entities/pipeline-metrics.entity';
import { Application } from '../../../entities/application.entity';
import { AnalyticsQueryDto } from '../../dto/analytics-query.dto';

describe('PipelineAnalyticsService', () => {
  let service: PipelineAnalyticsService;
  let pipelineMetricsRepository: Repository<PipelineMetrics>;
  let applicationRepository: Repository<Application>;

  const mockRepository = {
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawOne: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineAnalyticsService,
        {
          provide: getRepositoryToken(PipelineMetrics),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Application),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PipelineAnalyticsService>(PipelineAnalyticsService);
    pipelineMetricsRepository = module.get<Repository<PipelineMetrics>>(
      getRepositoryToken(PipelineMetrics),
    );
    applicationRepository = module.get<Repository<Application>>(
      getRepositoryToken(Application),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBottlenecks', () => {
    it('should identify pipeline bottlenecks correctly', async () => {
      const query: AnalyticsQueryDto = {
        companyId: 'company-1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockResult = {
        totalApplications: '1000',
        applicationsScreened: '800',
        applicationsShortlisted: '200', // High drop-off here (75%)
        interviewsScheduled: '180',
        interviewsCompleted: '160',
        offersExtended: '80',
        candidatesHired: '40',
        avgTimeToScreen: '2',
        avgTimeToInterview: '5',
        avgTimeToOffer: '3',
      };

      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockResult),
      };

      jest
        .spyOn(pipelineMetricsRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const result = await service.getBottlenecks(query);

      expect(result).toHaveLength(6);
      expect(result[0].stage).toBe('screening'); // Should be the biggest bottleneck
      expect(result[0].dropOffRate).toBe(75); // (800-200)/800 * 100
      expect(result[0].isBottleneck).toBe(true);

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

    it('should handle empty data gracefully', async () => {
      const query: AnalyticsQueryDto = {
        companyId: 'company-1',
      };

      const mockResult = {
        totalApplications: '0',
        applicationsScreened: '0',
        applicationsShortlisted: '0',
        interviewsScheduled: '0',
        interviewsCompleted: '0',
        offersExtended: '0',
        candidatesHired: '0',
        avgTimeToScreen: null,
        avgTimeToInterview: null,
        avgTimeToOffer: null,
      };

      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockResult),
      };

      jest
        .spyOn(pipelineMetricsRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const result = await service.getBottlenecks(query);

      expect(result).toHaveLength(6);
      result.forEach((bottleneck) => {
        expect(bottleneck.dropOffRate).toBe(0);
        expect(bottleneck.candidatesInStage).toBe(0);
        expect(bottleneck.isBottleneck).toBe(false);
      });
    });
  });

  describe('getStagePerformance', () => {
    it('should return stage performance metrics', async () => {
      const query: AnalyticsQueryDto = {
        companyId: 'company-1',
      };

      const mockApplications = [
        {
          id: 'app-1',
          status: 'hired',
          appliedAt: new Date('2024-01-01'),
          lastUpdated: new Date('2024-01-15'),
          stageHistory: [
            {
              toStage: 'screening',
              changedAt: new Date('2024-01-03'),
            },
            {
              toStage: 'shortlisted',
              changedAt: new Date('2024-01-05'),
            },
          ],
        },
        {
          id: 'app-2',
          status: 'rejected',
          appliedAt: new Date('2024-01-02'),
          lastUpdated: new Date('2024-01-10'),
          stageHistory: [
            {
              toStage: 'screening',
              changedAt: new Date('2024-01-04'),
            },
          ],
        },
      ];

      const queryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockApplications),
      };

      jest
        .spyOn(applicationRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const result = await service.getStagePerformance(query);

      expect(result).toBeInstanceOf(Array);
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'app.companyJobVariant',
        'cjv',
      );
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'app.stageHistory',
        'sh',
      );
    });
  });

  describe('calculateTimeToFill', () => {
    it('should calculate average time to fill for hired candidates', async () => {
      const companyId = 'company-1';
      const jobVariantId = 'job-1';

      const mockApplications = [
        {
          appliedAt: new Date('2024-01-01'),
          lastUpdated: new Date('2024-01-15'), // 14 days
        },
        {
          appliedAt: new Date('2024-01-05'),
          lastUpdated: new Date('2024-01-25'), // 20 days
        },
      ];

      const queryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockApplications),
      };

      jest
        .spyOn(applicationRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const result = await service.calculateTimeToFill(companyId, jobVariantId);

      expect(result).toBe(17); // (14 + 20) / 2
      expect(queryBuilder.where).toHaveBeenCalledWith('app.status = :status', {
        status: 'hired',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'cjv.companyProfileId = :companyId',
        { companyId },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'app.companyJobVariantId = :jobVariantId',
        { jobVariantId },
      );
    });

    it('should return 0 when no hired applications exist', async () => {
      const companyId = 'company-1';

      const queryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(applicationRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const result = await service.calculateTimeToFill(companyId);

      expect(result).toBe(0);
    });
  });
});
