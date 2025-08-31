import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationController } from '../application.controller';
import { ApplicationService } from '../../services/application.service';
import { PipelineStage } from '../../../entities/application.entity';
import { CreateApplicationDto } from '../../dto/create-application.dto';
import { UpdateApplicationDto } from '../../dto/update-application.dto';
import { StageTransitionDto } from '../../dto/stage-transition.dto';
import { ApplicationFilterDto } from '../../dto/application-filter.dto';
import { ApplicationResponseDto } from '../../dto/application-response.dto';

describe('ApplicationController', () => {
  let controller: ApplicationController;
  let service: jest.Mocked<ApplicationService>;

  const mockApplicationResponse: ApplicationResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    candidateId: '123e4567-e89b-12d3-a456-426614174001',
    companyJobVariantId: '123e4567-e89b-12d3-a456-426614174002',
    status: PipelineStage.APPLIED,
    fitScore: 85,
    appliedAt: new Date('2024-01-01'),
    lastUpdated: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationController],
      providers: [
        {
          provide: ApplicationService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findByCandidate: jest.fn(),
            findByJobVariant: jest.fn(),
            update: jest.fn(),
            transitionStage: jest.fn(),
            updateFitScore: jest.fn(),
            remove: jest.fn(),
            getApplicationsByStage: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ApplicationController>(ApplicationController);
    service = module.get(ApplicationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new application', async () => {
      const createApplicationDto: CreateApplicationDto = {
        candidateId: '123e4567-e89b-12d3-a456-426614174001',
        companyJobVariantId: '123e4567-e89b-12d3-a456-426614174002',
        fitScore: 85,
      };

      service.create.mockResolvedValue(mockApplicationResponse);

      const result = await controller.create(createApplicationDto);

      expect(service.create).toHaveBeenCalledWith(createApplicationDto);
      expect(result).toEqual(mockApplicationResponse);
    });
  });

  describe('findAll', () => {
    it('should return all applications with filters', async () => {
      const filterDto: ApplicationFilterDto = {
        status: PipelineStage.APPLIED,
        minFitScore: 80,
      };

      service.findAll.mockResolvedValue([mockApplicationResponse]);

      const result = await controller.findAll(filterDto);

      expect(service.findAll).toHaveBeenCalledWith(filterDto);
      expect(result).toEqual([mockApplicationResponse]);
    });
  });

  describe('findByStage', () => {
    it('should return applications by stage', async () => {
      service.getApplicationsByStage.mockResolvedValue([
        mockApplicationResponse,
      ]);

      const result = await controller.findByStage(PipelineStage.APPLIED);

      expect(service.getApplicationsByStage).toHaveBeenCalledWith(
        PipelineStage.APPLIED,
      );
      expect(result).toEqual([mockApplicationResponse]);
    });
  });

  describe('findByCandidate', () => {
    it('should return applications for a candidate', async () => {
      const candidateId = '123e4567-e89b-12d3-a456-426614174001';
      service.findByCandidate.mockResolvedValue([mockApplicationResponse]);

      const result = await controller.findByCandidate(candidateId);

      expect(service.findByCandidate).toHaveBeenCalledWith(candidateId);
      expect(result).toEqual([mockApplicationResponse]);
    });
  });

  describe('findByJobVariant', () => {
    it('should return applications for a job variant', async () => {
      const jobVariantId = '123e4567-e89b-12d3-a456-426614174002';
      service.findByJobVariant.mockResolvedValue([mockApplicationResponse]);

      const result = await controller.findByJobVariant(jobVariantId);

      expect(service.findByJobVariant).toHaveBeenCalledWith(jobVariantId);
      expect(result).toEqual([mockApplicationResponse]);
    });
  });

  describe('findOne', () => {
    it('should return an application by id', async () => {
      const applicationId = '123e4567-e89b-12d3-a456-426614174000';
      service.findOne.mockResolvedValue(mockApplicationResponse);

      const result = await controller.findOne(applicationId);

      expect(service.findOne).toHaveBeenCalledWith(applicationId);
      expect(result).toEqual(mockApplicationResponse);
    });
  });

  describe('update', () => {
    it('should update an application', async () => {
      const applicationId = '123e4567-e89b-12d3-a456-426614174000';
      const updateApplicationDto: UpdateApplicationDto = {
        fitScore: 90,
      };
      const updatedResponse = { ...mockApplicationResponse, fitScore: 90 };

      service.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(
        applicationId,
        updateApplicationDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        applicationId,
        updateApplicationDto,
      );
      expect(result).toEqual(updatedResponse);
    });
  });

  describe('transitionStage', () => {
    it('should transition application stage', async () => {
      const applicationId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123';
      const stageTransitionDto: StageTransitionDto = {
        toStage: PipelineStage.SCREENING,
        notes: 'Moving to screening',
      };
      const updatedResponse = {
        ...mockApplicationResponse,
        status: PipelineStage.SCREENING,
      };

      service.transitionStage.mockResolvedValue(updatedResponse);

      const result = await controller.transitionStage(
        applicationId,
        stageTransitionDto,
        userId,
      );

      expect(service.transitionStage).toHaveBeenCalledWith(
        applicationId,
        stageTransitionDto,
        userId,
      );
      expect(result).toEqual(updatedResponse);
    });
  });

  describe('updateFitScore', () => {
    it('should update application fit score', async () => {
      const applicationId = '123e4567-e89b-12d3-a456-426614174000';
      const fitScore = 95;
      const updatedResponse = { ...mockApplicationResponse, fitScore: 95 };

      service.updateFitScore.mockResolvedValue(updatedResponse);

      const result = await controller.updateFitScore(applicationId, fitScore);

      expect(service.updateFitScore).toHaveBeenCalledWith(
        applicationId,
        fitScore,
      );
      expect(result).toEqual(updatedResponse);
    });
  });

  describe('remove', () => {
    it('should remove an application', async () => {
      const applicationId = '123e4567-e89b-12d3-a456-426614174000';
      service.remove.mockResolvedValue(undefined);

      await controller.remove(applicationId);

      expect(service.remove).toHaveBeenCalledWith(applicationId);
    });
  });
});
