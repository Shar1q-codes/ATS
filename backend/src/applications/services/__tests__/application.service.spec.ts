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
  let applicationRepository: jest.Mocked<Repository<Application>>;
  let stageHistoryRepository: jest.Mocked<Repository<StageHistoryEntry>>;
  let candidateRepository: jest.Mocked<Repository<Candidate>>;
  let jobVariantRepository: jest.Mocked<Repository<CompanyJobVariant>>;
  let matchingService: jest.Mocked<MatchingService>;
  let matchExplanationService: jest.Mocked<MatchExplanationService>;
  let matchingQueue: jest.Mocked<Queue>;

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

  const mockStageHistoryEntry: StageHistoryEntry = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    applicationId: mockApplication.id,
    fromStage: undefined,
    toStage: PipelineStage.APPLIED,
    changedById: 'user-id',
    changedAt: new Date('2024-01-01'),
    notes: undefined,
    automated: true,
    application: {} as any,
    changedBy: {} as any,
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
    applicationRepository = module.get(getRepositoryToken(Application));
    stageHistoryRepository = module.get(getRepositoryToken(StageHistoryEntry));
    candidateRepository = module.get(getRepositoryToken(Candidate));
    jobVariantRepository = module.get(getRepositoryToken(CompanyJobVariant));
    matchingService = module.get(MatchingService);
    matchExplanationService = module.get(MatchExplanationService);
    matchingQueue = module.get(getQueueToken('matching'));
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

    it('should create a new application successfully', async () => {
      applicationRepository.findOne.mockResolvedValue(null);
      applicationRepository.create.mockReturnValue(mockApplication);
      applicationRepository.save.mockResolvedValue(mockApplication);
      stageHistoryRepository.create.mockReturnValue(mockStageHistoryEntry);
      stageHistoryRepository.save.mockResolvedValue(mockStageHistoryEntry);
      matchingQueue.add.mockResolvedValue({} as any);

      const result = await service.create(createApplicationDto);

      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: {
          candidateId: createApplicationDto.candidateId,
          companyJobVariantId: createApplicationDto.companyJobVariantId,
        },
      });
      expect(applicationRepository.create).toHaveBeenCalledWith({
        ...createApplicationDto,
        status: PipelineStage.APPLIED,
      });
      expect(applicationRepository.save).toHaveBeenCalledWith(mockApplication);
      expect(stageHistoryRepository.create).toHaveBeenCalled();
      expect(stageHistoryRepository.save).toHaveBeenCalled();
      expect(matchingQueue.add).toHaveBeenCalledWith(
        'calculate-fit-score',
        { applicationId: mockApplication.id },
        expect.objectContaining({
          attempts: 3,
          backoff: expect.any(Object),
        }),
      );
      expect(result.id).toBe(mockApplication.id);
    });

    it('should throw ConflictException if application already exists', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication);

      await expect(service.create(createApplicationDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all applications with filters', async () => {
      const filterDto: ApplicationFilterDto = {
        status: PipelineStage.APPLIED,
        minFitScore: 80,
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockApplication]),
      };

      applicationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findAll(filterDto);

      expect(applicationRepository.createQueryBuilder).toHaveBeenCalledWith(
        'app',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'app.status = :status',
        {
          status: filterDto.status,
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'app.fitScore >= :minFitScore',
        { minFitScore: filterDto.minFitScore },
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockApplication.id);
    });
  });

  describe('findOne', () => {
    it('should return an application by id', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication);

      const result = await service.findOne(mockApplication.id);

      expect(applicationRepository.findOne).toHaveBeenCalledWith({
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
      applicationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCandidate', () => {
    it('should return applications for a candidate', async () => {
      applicationRepository.find.mockResolvedValue([mockApplication]);

      const result = await service.findByCandidate(mockApplication.candidateId);

      expect(applicationRepository.find).toHaveBeenCalledWith({
        where: { candidateId: mockApplication.candidateId },
        relations: [
          'candidate',
          'companyJobVariant',
          'matchExplanation',
          'notes',
          'stageHistory',
        ],
        order: { appliedAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].candidateId).toBe(mockApplication.candidateId);
    });
  });

  describe('findByJobVariant', () => {
    it('should return applications for a job variant', async () => {
      applicationRepository.find.mockResolvedValue([mockApplication]);

      const result = await service.findByJobVariant(
        mockApplication.companyJobVariantId,
      );

      expect(applicationRepository.find).toHaveBeenCalledWith({
        where: { companyJobVariantId: mockApplication.companyJobVariantId },
        relations: [
          'candidate',
          'companyJobVariant',
          'matchExplanation',
          'notes',
          'stageHistory',
        ],
        order: { fitScore: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].companyJobVariantId).toBe(
        mockApplication.companyJobVariantId,
      );
    });
  });

  describe('update', () => {
    const updateApplicationDto: UpdateApplicationDto = {
      fitScore: 90,
    };

    it('should update an application successfully', async () => {
      const updatedApplication = { ...mockApplication, fitScore: 90 };
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      applicationRepository.save.mockResolvedValue(updatedApplication);

      const result = await service.update(
        mockApplication.id,
        updateApplicationDto,
      );

      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockApplication.id },
      });
      expect(applicationRepository.save).toHaveBeenCalled();
      expect(result.fitScore).toBe(90);
    });

    it('should throw NotFoundException if application not found', async () => {
      applicationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateApplicationDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transitionStage', () => {
    const stageTransitionDto: StageTransitionDto = {
      toStage: PipelineStage.SCREENING,
      notes: 'Moving to screening',
    };

    it('should transition stage successfully', async () => {
      const updatedApplication = {
        ...mockApplication,
        status: PipelineStage.SCREENING,
      };
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      applicationRepository.save.mockResolvedValue(updatedApplication);
      stageHistoryRepository.create.mockReturnValue(mockStageHistoryEntry);
      stageHistoryRepository.save.mockResolvedValue(mockStageHistoryEntry);

      const result = await service.transitionStage(
        mockApplication.id,
        stageTransitionDto,
        'user-id',
      );

      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockApplication.id },
      });
      expect(applicationRepository.save).toHaveBeenCalled();
      expect(stageHistoryRepository.create).toHaveBeenCalled();
      expect(stageHistoryRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(PipelineStage.SCREENING);
    });

    it('should throw NotFoundException if application not found', async () => {
      applicationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.transitionStage(
          'non-existent-id',
          stageTransitionDto,
          'user-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid stage transition', async () => {
      const invalidTransitionDto: StageTransitionDto = {
        toStage: PipelineStage.HIRED, // Invalid from APPLIED
      };
      applicationRepository.findOne.mockResolvedValue(mockApplication);

      await expect(
        service.transitionStage(
          mockApplication.id,
          invalidTransitionDto,
          'user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove an application successfully', async () => {
      applicationRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.remove(mockApplication.id);

      expect(applicationRepository.delete).toHaveBeenCalledWith(
        mockApplication.id,
      );
    });

    it('should throw NotFoundException if application not found', async () => {
      applicationRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getApplicationsByStage', () => {
    it('should return applications by stage', async () => {
      const appliedApplication = {
        ...mockApplication,
        status: PipelineStage.APPLIED,
      };
      applicationRepository.find.mockResolvedValue([appliedApplication]);

      const result = await service.getApplicationsByStage(
        PipelineStage.APPLIED,
      );

      expect(applicationRepository.find).toHaveBeenCalledWith({
        where: { status: PipelineStage.APPLIED },
        relations: [
          'candidate',
          'companyJobVariant',
          'matchExplanation',
          'notes',
          'stageHistory',
        ],
        order: { lastUpdated: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(PipelineStage.APPLIED);
    });
  });

  describe('updateFitScore', () => {
    it('should update fit score successfully', async () => {
      const updatedApplication = { ...mockApplication, fitScore: 95 };
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      applicationRepository.save.mockResolvedValue(updatedApplication);

      const result = await service.updateFitScore(mockApplication.id, 95);

      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockApplication.id },
      });
      expect(applicationRepository.save).toHaveBeenCalled();
      expect(result.fitScore).toBe(95);
    });

    it('should throw BadRequestException for invalid fit score', async () => {
      await expect(
        service.updateFitScore(mockApplication.id, 150),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if application not found', async () => {
      applicationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateFitScore('non-existent-id', 95),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
