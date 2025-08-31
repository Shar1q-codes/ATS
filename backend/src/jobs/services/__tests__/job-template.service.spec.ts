import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JobTemplateService } from '../job-template.service';
import { JobTemplate } from '../../../entities/job-template.entity';
import { RequirementItem } from '../../../entities/requirement-item.entity';
import { JobFamily } from '../../../entities/job-family.entity';
import { CreateJobTemplateDto } from '../../dto/create-job-template.dto';
import { UpdateJobTemplateDto } from '../../dto/update-job-template.dto';
import { JobLevel } from '../../../entities/job-template.entity';

describe('JobTemplateService', () => {
  let service: JobTemplateService;
  let jobTemplateRepository: Repository<JobTemplate>;
  let requirementItemRepository: Repository<RequirementItem>;
  let jobFamilyRepository: Repository<JobFamily>;

  const mockJobFamily = {
    id: 'job-family-id',
    name: 'Software Engineer',
    description: 'Software engineering roles',
  };

  const mockJobTemplate = {
    id: 'job-template-id',
    jobFamilyId: 'job-family-id',
    name: 'Senior Software Engineer',
    level: JobLevel.SENIOR,
    experienceRangeMin: 3,
    experienceRangeMax: 7,
    salaryRangeMin: 80000,
    salaryRangeMax: 120000,
    salaryCurrency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
    jobFamily: mockJobFamily,
    requirements: [],
  };

  const mockRequirement = {
    id: 'requirement-id',
    type: 'skill',
    category: 'must',
    description: 'JavaScript proficiency',
    weight: 8,
    alternatives: ['TypeScript'],
  };

  const mockJobTemplateRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockRequirementItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockJobFamilyRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobTemplateService,
        {
          provide: getRepositoryToken(JobTemplate),
          useValue: mockJobTemplateRepository,
        },
        {
          provide: getRepositoryToken(RequirementItem),
          useValue: mockRequirementItemRepository,
        },
        {
          provide: getRepositoryToken(JobFamily),
          useValue: mockJobFamilyRepository,
        },
      ],
    }).compile();

    service = module.get<JobTemplateService>(JobTemplateService);
    jobTemplateRepository = module.get<Repository<JobTemplate>>(
      getRepositoryToken(JobTemplate),
    );
    requirementItemRepository = module.get<Repository<RequirementItem>>(
      getRepositoryToken(RequirementItem),
    );
    jobFamilyRepository = module.get<Repository<JobFamily>>(
      getRepositoryToken(JobFamily),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new job template with requirements', async () => {
      const createDto: CreateJobTemplateDto = {
        jobFamilyId: 'job-family-id',
        name: 'Senior Software Engineer',
        level: JobLevel.SENIOR,
        experienceRangeMin: 3,
        experienceRangeMax: 7,
        requirements: [mockRequirement],
      };

      mockJobFamilyRepository.findOne.mockResolvedValue(mockJobFamily);
      mockJobTemplateRepository.create.mockReturnValue(mockJobTemplate);
      mockJobTemplateRepository.save.mockResolvedValue(mockJobTemplate);
      mockRequirementItemRepository.create.mockReturnValue(mockRequirement);
      mockRequirementItemRepository.save.mockResolvedValue([mockRequirement]);

      // Mock findOne for the final return
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...mockJobTemplate,
        requirements: [mockRequirement],
      } as any);

      const result = await service.create(createDto);

      expect(mockJobFamilyRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'job-family-id' },
      });
      expect(mockJobTemplateRepository.create).toHaveBeenCalledWith({
        jobFamilyId: 'job-family-id',
        name: 'Senior Software Engineer',
        level: JobLevel.SENIOR,
        experienceRangeMin: 3,
        experienceRangeMax: 7,
      });
      expect(mockRequirementItemRepository.save).toHaveBeenCalled();
      expect(result.requirements).toHaveLength(1);
    });

    it('should throw NotFoundException when job family not found', async () => {
      const createDto: CreateJobTemplateDto = {
        jobFamilyId: 'non-existent-id',
        name: 'Senior Software Engineer',
        level: JobLevel.SENIOR,
      };

      mockJobFamilyRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        new NotFoundException('JobFamily with ID non-existent-id not found'),
      );
    });

    it('should throw BadRequestException for invalid experience range', async () => {
      const createDto: CreateJobTemplateDto = {
        jobFamilyId: 'job-family-id',
        name: 'Senior Software Engineer',
        level: JobLevel.SENIOR,
        experienceRangeMin: 7,
        experienceRangeMax: 3,
      };

      mockJobFamilyRepository.findOne.mockResolvedValue(mockJobFamily);

      await expect(service.create(createDto)).rejects.toThrow(
        new BadRequestException(
          'Experience range minimum cannot be greater than maximum',
        ),
      );
    });

    it('should throw BadRequestException for invalid salary range', async () => {
      const createDto: CreateJobTemplateDto = {
        jobFamilyId: 'job-family-id',
        name: 'Senior Software Engineer',
        level: JobLevel.SENIOR,
        salaryRangeMin: 120000,
        salaryRangeMax: 80000,
      };

      mockJobFamilyRepository.findOne.mockResolvedValue(mockJobFamily);

      await expect(service.create(createDto)).rejects.toThrow(
        new BadRequestException(
          'Salary range minimum cannot be greater than maximum',
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all job templates', async () => {
      const jobTemplates = [mockJobTemplate];
      mockJobTemplateRepository.find.mockResolvedValue(jobTemplates);

      const result = await service.findAll();

      expect(mockJobTemplateRepository.find).toHaveBeenCalledWith({
        relations: ['jobFamily', 'requirements'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockJobTemplate.id);
    });
  });

  describe('findOne', () => {
    it('should return a job template by id', async () => {
      mockJobTemplateRepository.findOne.mockResolvedValue(mockJobTemplate);

      const result = await service.findOne('job-template-id');

      expect(mockJobTemplateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'job-template-id' },
        relations: ['jobFamily', 'requirements'],
      });
      expect(result.id).toBe(mockJobTemplate.id);
    });

    it('should throw NotFoundException when job template not found', async () => {
      mockJobTemplateRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('JobTemplate with ID non-existent-id not found'),
      );
    });
  });

  describe('findByJobFamily', () => {
    it('should return job templates by job family id', async () => {
      const jobTemplates = [mockJobTemplate];
      mockJobTemplateRepository.find.mockResolvedValue(jobTemplates);

      const result = await service.findByJobFamily('job-family-id');

      expect(mockJobTemplateRepository.find).toHaveBeenCalledWith({
        where: { jobFamilyId: 'job-family-id' },
        relations: ['jobFamily', 'requirements'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update a job template', async () => {
      const updateDto: UpdateJobTemplateDto = {
        name: 'Updated Senior Software Engineer',
        experienceRangeMin: 4,
        experienceRangeMax: 8,
      };

      const updatedJobTemplate = { ...mockJobTemplate, ...updateDto };

      mockJobTemplateRepository.findOne.mockResolvedValue(mockJobTemplate);
      mockJobTemplateRepository.save.mockResolvedValue(updatedJobTemplate);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(updatedJobTemplate as any);

      const result = await service.update('job-template-id', updateDto);

      expect(mockJobTemplateRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
    });

    it('should throw NotFoundException when job template not found', async () => {
      const updateDto: UpdateJobTemplateDto = { name: 'Updated Name' };
      mockJobTemplateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(
        new NotFoundException('JobTemplate with ID non-existent-id not found'),
      );
    });

    it('should throw BadRequestException for invalid experience range update', async () => {
      const updateDto: UpdateJobTemplateDto = {
        experienceRangeMin: 8,
        experienceRangeMax: 3,
      };

      mockJobTemplateRepository.findOne.mockResolvedValue(mockJobTemplate);

      await expect(
        service.update('job-template-id', updateDto),
      ).rejects.toThrow(
        new BadRequestException(
          'Experience range minimum cannot be greater than maximum',
        ),
      );
    });

    it('should update requirements when provided', async () => {
      const updateDto: UpdateJobTemplateDto = {
        requirements: [mockRequirement],
      };

      mockJobTemplateRepository.findOne.mockResolvedValue(mockJobTemplate);
      mockJobTemplateRepository.save.mockResolvedValue(mockJobTemplate);
      mockRequirementItemRepository.delete.mockResolvedValue({ affected: 1 });
      mockRequirementItemRepository.create.mockReturnValue(mockRequirement);
      mockRequirementItemRepository.save.mockResolvedValue([mockRequirement]);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockJobTemplate as any);

      await service.update('job-template-id', updateDto);

      expect(mockRequirementItemRepository.delete).toHaveBeenCalledWith({
        jobTemplateId: 'job-template-id',
      });
      expect(mockRequirementItemRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a job template', async () => {
      mockJobTemplateRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('job-template-id');

      expect(mockJobTemplateRepository.delete).toHaveBeenCalledWith(
        'job-template-id',
      );
    });

    it('should throw NotFoundException when job template not found', async () => {
      mockJobTemplateRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException('JobTemplate with ID non-existent-id not found'),
      );
    });
  });
});
