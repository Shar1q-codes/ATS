import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JobTemplateController } from '../job-template.controller';
import { JobTemplateService } from '../../services/job-template.service';
import { CreateJobTemplateDto } from '../../dto/create-job-template.dto';
import { UpdateJobTemplateDto } from '../../dto/update-job-template.dto';
import { JobTemplateResponseDto } from '../../dto/job-template-response.dto';
import { JobLevel } from '../../../entities/job-template.entity';
import {
  RequirementType,
  RequirementCategory,
} from '../../../entities/requirement-item.entity';

describe('JobTemplateController', () => {
  let controller: JobTemplateController;
  let service: JobTemplateService;

  const mockJobTemplateResponse: JobTemplateResponseDto = {
    id: 'job-template-id',
    jobFamilyId: 'job-family-id',
    name: 'Senior Software Engineer',
    level: JobLevel.SENIOR,
    experienceRangeMin: 5,
    experienceRangeMax: 8,
    salaryRangeMin: 80000,
    salaryRangeMax: 120000,
    salaryCurrency: 'USD',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    requirements: [],
  };

  const mockJobTemplateService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByJobFamily: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobTemplateController],
      providers: [
        {
          provide: JobTemplateService,
          useValue: mockJobTemplateService,
        },
      ],
    }).compile();

    controller = module.get<JobTemplateController>(JobTemplateController);
    service = module.get<JobTemplateService>(JobTemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new job template', async () => {
      const createDto: CreateJobTemplateDto = {
        jobFamilyId: 'job-family-id',
        name: 'Senior Software Engineer',
        level: JobLevel.SENIOR,
        experienceRangeMin: 5,
        experienceRangeMax: 8,
        requirements: [
          {
            type: RequirementType.SKILL,
            category: RequirementCategory.MUST,
            description: 'JavaScript proficiency',
            weight: 8,
          },
        ],
      };

      mockJobTemplateService.create.mockResolvedValue(mockJobTemplateResponse);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockJobTemplateResponse);
    });

    it('should handle validation errors', async () => {
      const createDto: CreateJobTemplateDto = {
        jobFamilyId: 'job-family-id',
        name: 'Senior Software Engineer',
        experienceRangeMin: 10,
        experienceRangeMax: 5,
      };

      mockJobTemplateService.create.mockRejectedValue(
        new BadRequestException(
          'Experience range minimum cannot be greater than maximum',
        ),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all job templates', async () => {
      mockJobTemplateService.findAll.mockResolvedValue([
        mockJobTemplateResponse,
      ]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockJobTemplateResponse]);
    });

    it('should return job templates filtered by job family', async () => {
      const jobFamilyId = 'job-family-id';
      mockJobTemplateService.findByJobFamily.mockResolvedValue([
        mockJobTemplateResponse,
      ]);

      const result = await controller.findAll(jobFamilyId);

      expect(service.findByJobFamily).toHaveBeenCalledWith(jobFamilyId);
      expect(result).toEqual([mockJobTemplateResponse]);
    });
  });

  describe('findOne', () => {
    it('should return a job template by id', async () => {
      const id = 'job-template-id';
      mockJobTemplateService.findOne.mockResolvedValue(mockJobTemplateResponse);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockJobTemplateResponse);
    });

    it('should throw NotFoundException when job template not found', async () => {
      const id = 'non-existent-id';
      mockJobTemplateService.findOne.mockRejectedValue(
        new NotFoundException(`JobTemplate with ID ${id} not found`),
      );

      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a job template', async () => {
      const id = 'job-template-id';
      const updateDto: UpdateJobTemplateDto = {
        name: 'Updated Senior Software Engineer',
        experienceRangeMin: 6,
      };

      const updatedResponse = { ...mockJobTemplateResponse, ...updateDto };
      mockJobTemplateService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(id, updateDto);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(updatedResponse);
    });

    it('should throw NotFoundException when job template not found', async () => {
      const id = 'non-existent-id';
      const updateDto: UpdateJobTemplateDto = { name: 'Updated' };

      mockJobTemplateService.update.mockRejectedValue(
        new NotFoundException(`JobTemplate with ID ${id} not found`),
      );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a job template', async () => {
      const id = 'job-template-id';
      mockJobTemplateService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException when job template not found', async () => {
      const id = 'non-existent-id';
      mockJobTemplateService.remove.mockRejectedValue(
        new NotFoundException(`JobTemplate with ID ${id} not found`),
      );

      await expect(controller.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
