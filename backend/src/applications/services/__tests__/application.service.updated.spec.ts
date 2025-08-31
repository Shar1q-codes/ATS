import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getQueueToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationService } from '../application.service';
import {
  Application,
  PipelineStage,
} from '../../../entities/application.entity';
import { StageHistoryEntry } from '../../../entities/stage-history-entry.entity';
import { Candidate } from '../../../entities/candidate.entity';
import { CompanyJobVariant } from '../../../entities/company-job-variant.entity';
import { MatchingService } from '../../../matching/services/matching.service';
import { MatchExplanationService } from '../../../matching/services/match-explanation.service';
import { CreateApplicationDto } from '../../dto/create-application.dto';
import { UpdateApplicationDto } from '../../dto/update-application.dto';
import { StageTransitionDto } from '../../dto/stage-transition.dto';
import { ApplicationFilterDto } from '../../dto/application-filter.dto';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let mockApplicationRepository: jest.Mocked<Repository<Application>>;
  let mockStageHistoryRepository: jest.Mocked<Repository<StageHistoryEntry>>;
  let mockCandidateRepository: jest.Mocked<Repository<Candidate>>;
  let mockJobVariantRepository: jest.Mocked<Repository<CompanyJobVariant>>;
  let mockMatchingService: jest.Mocked<MatchingService>;
  let mockMatchExplanationService: jest.Mocked<MatchExplanationService>;
  let mockMatchingQueue: jest.Mocked<Queue>;

  const mockApplication: Application = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    candidateId: '123e4567-e89b-12d3-a456-426614174001',
    companyJobVariantId: '123e4567-e89b-12d3-a456-426614174002',
    status: PipelineStage.APPLIED,
    fitScore: 85,
    appliedAt: new Date('2024-01-01'),
    lastUpdated: new Date('2024-01-01'),
    candidate: {} as any,
    companyJobVariant: {} as any,
    matchExplanation: {} as any,
    notes: [],
    stageHistory: [],
  };

  const mockCandidate = {
    id: 'candidate-1',
    parsedData: {
      skills: [{ name: 'JavaScript', yearsOfExperience: 5 }],
    },
  };

  const mockJobVariant = {
    id: 'job-1',
    requirements: [],
    jobTemplate: { requirements: [] },
    companyProfile: {},
  };

  const mockMatchResult = {
    fitScore: 85,
    breakdown: { mustHaveScore: 90, shouldHaveScore: 80, niceToHaveScore: 75 },
    strengths: ['JavaScript'],
    gaps: [],
    recommendations: [],
    detailedAnalysis: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: getRepositoryToken(Application),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StageHistoryEntry),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Candidate),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CompanyJobVariant),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: MatchingService,
          useValue: {
            matchCandidateToJob: jest.fn(),
          },
        },
        {
          provide: MatchExplanationService,
          useValue: {
            generateMatchExplanation: jest.fn(),
          },
        },
        {
          provide: getQueueToken('matching'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
    mockApplicationRepository = module.get(getRepositoryToken(Application));
    mockStageHistoryRepository = module.get(
      getRepositoryToken(StageHistoryEntry),
    );
    mockCandidateRepository = module.get(getRepositoryToken(Candidate));
    mockJobVariantRepository = module.get(
      getRepositoryToken(CompanyJobVariant),
    );
    mockMatchingService = module.get(MatchingService);
    mockMatchExplanationService = module.get(MatchExplanationService);
    mockMatchingQueue = module.get(getQueueToken('matching'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createApplicationDto: CreateApplicationDto = {
      candidateId: '123e4567-e89b-12d3-a456-426614174001',
      companyJobVariantId: '123e4567-e89b-12d3-a456-426614174002',
      fitScore: 85,
    };

    it('should create a new application and queue matching job', async () => {
      mockApplicationRepository.findOne.mockResolvedValue(null);
      mockApplicationRepository.create.mockReturnValue(mockApplication);
      mockApplicationRepository.save.mockResolvedValue(mockApplication);
      mockStageHistoryRepository.create.mockReturnValue({} as any);
      mockStageHistoryRepository.save.mockResolvedValue({} as any);
      mockMatchingQueue.add.mockResolvedValue({} as any);

      const result = await service.create(createApplicationDto);

      expect(mockApplicationRepository.findOne).toHaveBeenCalledWith({
        where: {
          candidateId: createApplicationDto.candidateId,
          companyJobVariantId: createApplicationDto.companyJobVariantId,
        },
      });
      expect(mockApplicationRepository.create).toHaveBeenCalledWith({
        ...createApplicationDto,
        status: PipelineStage.APPLIED,
      });
      expect(mockApplicationRepository.save).toHaveBeenCalledWith(
        mockApplication,
      );
      expect(mockMatchingQueue.add).toHaveBeenCalledWith(
        'calculate-fit-score',
        { applicationId: mockApplication.id },
        expect.objectContaining({
          attempts: 3,
          backoff: expect.any(Object),
        }),
      );
      expect(result.id).toBe(mockApplication.id);
    });

    it('should not fail if queue fails', async () => {
      mockApplicationRepository.findOne.mockResolvedValue(null);
      mockApplicationRepository.create.mockReturnValue(mockApplication);
      mockApplicationRepository.save.mockResolvedValue(mockApplication);
      mockStageHistoryRepository.create.mockReturnValue({} as any);
      mockStageHistoryRepository.save.mockResolvedValue({} as any);
      mockMatchingQueue.add.mockRejectedValue(new Error('Queue error'));

      const result = await service.create(createApplicationDto);

      expect(result.id).toBe(mockApplication.id);
    });

    it('should throw ConflictException if application already exists', async () => {
      mockApplicationRepository.findOne.mockResolvedValue(mockApplication);

      await expect(service.create(createApplicationDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('calculateAndUpdateFitScore', () => {
    beforeEach(() => {
      mockCandidateRepository.findOne.mockResolvedValue(mockCandidate as any);
      mockJobVariantRepository.findOne.mockResolvedValue(mockJobVariant as any);
      mockMatchingService.matchCandidateToJob.mockResolvedValue(
        mockMatchResult as any,
      );
      mockMatchExplanationService.generateMatchExplanation.mockResolvedValue(
        {} as any,
      );
    });

    it('should calculate and update fit score', async () => {
      mockApplicationRepository.findOne.mockResolvedValue(mockApplication);
      mockApplicationRepository.save.mockResolvedValue({
        ...mockApplication,
        fitScore: 85,
      });

      await service.calculateAndUpdateFitScore('app-1');

      expect(mockApplicationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          fitScore: 85,
        }),
      );
      expect(mockMatchingService.matchCandidateToJob).toHaveBeenCalledWith(
        mockCandidate.id,
        mockJobVariant.id,
        { includeExplanation: true },
      );
      expect(
        mockMatchExplanationService.generateMatchExplanation,
      ).toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing application', async () => {
      mockApplicationRepository.findOne.mockResolvedValue(null);

      await expect(service.calculateAndUpdateFitScore('app-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for missing candidate', async () => {
      mockApplicationRepository.findOne.mockResolvedValue(mockApplication);
      mockCandidateRepository.findOne.mockResolvedValue(null);

      await expect(service.calculateAndUpdateFitScore('app-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for missing job variant', async () => {
      mockApplicationRepository.findOne.mockResolvedValue(mockApplication);
      mockJobVariantRepository.findOne.mockResolvedValue(null);

      await expect(service.calculateAndUpdateFitScore('app-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('batchCalculateFitScores', () => {
    it('should queue jobs for all applications', async () => {
      const mockApplications = [{ id: 'app-1' }, { id: 'app-2' }];

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockApplications),
      };

      mockApplicationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      mockMatchingQueue.add.mockResolvedValue({} as any);

      await service.batchCalculateFitScores('job-1');

      expect(mockMatchingQueue.add).toHaveBeenCalledTimes(2);
      expect(mockMatchingQueue.add).toHaveBeenCalledWith(
        'calculate-fit-score',
        { applicationId: 'app-1' },
        expect.any(Object),
      );
      expect(mockMatchingQueue.add).toHaveBeenCalledWith(
        'calculate-fit-score',
        { applicationId: 'app-2' },
        expect.any(Object),
      );
    });

    it('should filter by candidate IDs when provided', async () => {
      const mockApplications = [{ id: 'app-1' }];

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockApplications),
      };

      mockApplicationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      mockMatchingQueue.add.mockResolvedValue({} as any);

      await service.batchCalculateFitScores('job-1', ['candidate-1']);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'app.candidateId IN (:...candidateIds)',
        { candidateIds: ['candidate-1'] },
      );
    });
  });

  describe('recalculateFitScore', () => {
    it('should recalculate and return updated application', async () => {
      const updatedApplication = { ...mockApplication, fitScore: 85 };

      jest
        .spyOn(service, 'calculateAndUpdateFitScore')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(updatedApplication as any);

      const result = await service.recalculateFitScore('app-1');

      expect(service.calculateAndUpdateFitScore).toHaveBeenCalledWith('app-1');
      expect(service.findOne).toHaveBeenCalledWith('app-1');
      expect(result).toEqual(updatedApplication);
    });
  });

  // Keep existing tests for other methods...
  describe('findOne', () => {
    it('should return an application by id', async () => {
      mockApplicationRepository.findOne.mockResolvedValue(mockApplication);

      const result = await service.findOne(mockApplication.id);

      expect(mockApplicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockApplication.id },
        relations: [
          'candidate',
          'companyJobVariant',
          'matchExplanation',
          'notes',
          'stageHistory',
        ],
      });
      expect(result.id).toBe(mockApplication.id);
    });

    it('should throw NotFoundException if application not found', async () => {
      mockApplicationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateFitScore', () => {
    it('should update fit score successfully', async () => {
      const updatedApplication = { ...mockApplication, fitScore: 95 };
      mockApplicationRepository.findOne.mockResolvedValue(mockApplication);
      mockApplicationRepository.save.mockResolvedValue(updatedApplication);

      const result = await service.updateFitScore(mockApplication.id, 95);

      expect(mockApplicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockApplication.id },
      });
      expect(mockApplicationRepository.save).toHaveBeenCalled();
      expect(result.fitScore).toBe(95);
    });

    it('should throw BadRequestException for invalid fit score', async () => {
      await expect(
        service.updateFitScore(mockApplication.id, 150),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if application not found', async () => {
      mockApplicationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateFitScore('non-existent-id', 95),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
