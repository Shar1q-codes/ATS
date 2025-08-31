import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataAggregationService } from '../data-aggregation.service';
import { PipelineMetrics } from '../../../entities/pipeline-metrics.entity';
import { SourcePerformance } from '../../../entities/source-performance.entity';
import { DiversityMetrics } from '../../../entities/diversity-metrics.entity';
import { Application } from '../../../entities/application.entity';
import { Candidate } from '../../../entities/candidate.entity';
import { CompanyJobVariant } from '../../../entities/company-job-variant.entity';

describe('DataAggregationService', () => {
  let service: DataAggregationService;
  let pipelineMetricsRepository: Repository<PipelineMetrics>;
  let sourcePerformanceRepository: Repository<SourcePerformance>;
  let diversityMetricsRepository: Repository<DiversityMetrics>;
  let applicationRepository: Repository<Application>;
  let candidateRepository: Repository<Candidate>;
  let companyJobVariantRepository: Repository<CompanyJobVariant>;

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataAggregationService,
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
          provide: getRepositoryToken(Application),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Candidate),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(CompanyJobVariant),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DataAggregationService>(DataAggregationService);
    pipelineMetricsRepository = module.get<Repository<PipelineMetrics>>(
      getRepositoryToken(PipelineMetrics),
    );
    sourcePerformanceRepository = module.get<Repository<SourcePerformance>>(
      getRepositoryToken(SourcePerformance),
    );
    diversityMetricsRepository = module.get<Repository<DiversityMetrics>>(
      getRepositoryToken(DiversityMetrics),
    );
    applicationRepository = module.get<Repository<Application>>(
      getRepositoryToken(Application),
    );
    candidateRepository = module.get<Repository<Candidate>>(
      getRepositoryToken(Candidate),
    );
    companyJobVariantRepository = module.get<Repository<CompanyJobVariant>>(
      getRepositoryToken(CompanyJobVariant),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset the mock query builder
    mockQueryBuilder.getMany.mockResolvedValue([]);
    mockQueryBuilder.getRawMany.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('aggregatePipelineMetrics', () => {
    it('should aggregate pipeline metrics for all companies', async () => {
      // Mock the repositories to return empty results
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      jest.spyOn(pipelineMetricsRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(pipelineMetricsRepository, 'create')
        .mockReturnValue({} as any);
      jest
        .spyOn(pipelineMetricsRepository, 'save')
        .mockResolvedValue({} as any);

      // Should not throw an error
      await expect(service.aggregatePipelineMetrics()).resolves.not.toThrow();
    });

    it('should aggregate pipeline metrics for specific company', async () => {
      const companyId = 'company-1';

      // Mock the repositories to return empty results
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      jest.spyOn(pipelineMetricsRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(pipelineMetricsRepository, 'create')
        .mockReturnValue({} as any);
      jest
        .spyOn(pipelineMetricsRepository, 'save')
        .mockResolvedValue({} as any);

      // Should not throw an error
      await expect(
        service.aggregatePipelineMetrics(companyId),
      ).resolves.not.toThrow();
    });
  });

  describe('aggregateSourcePerformance', () => {
    it('should aggregate source performance metrics', async () => {
      const mockCandidates = [
        {
          id: 'candidate-1',
          source: 'linkedin',
          applications: [
            {
              status: 'hired',
              fitScore: 85,
              companyJobVariant: {
                companyProfileId: 'company-1',
              },
            },
          ],
        },
        {
          id: 'candidate-2',
          source: 'indeed',
          applications: [
            {
              status: 'screening',
              fitScore: 70,
              companyJobVariant: {
                companyProfileId: 'company-1',
              },
            },
          ],
        },
      ];

      const queryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockCandidates),
      };

      jest
        .spyOn(candidateRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);
      jest
        .spyOn(sourcePerformanceRepository, 'findOne')
        .mockResolvedValue(null);
      jest
        .spyOn(sourcePerformanceRepository, 'create')
        .mockReturnValue({} as any);
      jest
        .spyOn(sourcePerformanceRepository, 'save')
        .mockResolvedValue({} as any);

      await service.aggregateSourcePerformance();

      expect(candidateRepository.createQueryBuilder).toHaveBeenCalled();
      expect(sourcePerformanceRepository.save).toHaveBeenCalled();
    });
  });

  describe('aggregateDiversityMetrics', () => {
    it('should aggregate diversity metrics', async () => {
      const mockApplications = [
        {
          status: 'hired',
          candidate: {
            gender: 'female',
            ethnicity: 'asian',
            age: 28,
            education: 'bachelors',
          },
          companyJobVariant: {
            companyProfileId: 'company-1',
            id: 'job-1',
          },
        },
        {
          status: 'screening',
          candidate: {
            gender: 'male',
            ethnicity: 'white',
            age: 32,
            education: 'masters',
          },
          companyJobVariant: {
            companyProfileId: 'company-1',
            id: 'job-1',
          },
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
      jest.spyOn(diversityMetricsRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(diversityMetricsRepository, 'create')
        .mockReturnValue({} as any);
      jest
        .spyOn(diversityMetricsRepository, 'save')
        .mockResolvedValue({} as any);

      await service.aggregateDiversityMetrics();

      expect(applicationRepository.createQueryBuilder).toHaveBeenCalled();
      expect(diversityMetricsRepository.save).toHaveBeenCalled();
    });
  });

  describe('categorizeAge', () => {
    it('should categorize ages correctly', () => {
      expect(service['categorizeAge'](22)).toBe('under25');
      expect(service['categorizeAge'](28)).toBe('25-34');
      expect(service['categorizeAge'](38)).toBe('35-44');
      expect(service['categorizeAge'](48)).toBe('45-54');
      expect(service['categorizeAge'](58)).toBe('over55');
      expect(service['categorizeAge'](undefined)).toBe('unknown');
    });
  });

  describe('calculateBiasIndicators', () => {
    it('should calculate bias indicators correctly', () => {
      const stats = {
        genderDistribution: { male: 60, female: 40 },
        hiredDiversity: {
          gender: { male: 8, female: 2 },
          ethnicity: {},
          age: {},
          education: {},
        },
        ethnicityDistribution: {},
        ageDistribution: {},
        educationDistribution: {},
      };

      const result = service['calculateBiasIndicators'](stats);

      expect(result.genderBias).toBeGreaterThan(0); // Should detect bias
      expect(result.ethnicityBias).toBe(0);
      expect(result.ageBias).toBe(0);
      expect(result.educationBias).toBe(0);
    });
  });
});
