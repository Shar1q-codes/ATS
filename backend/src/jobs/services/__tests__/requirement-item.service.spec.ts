import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RequirementItemService } from '../requirement-item.service';
import {
  RequirementItem,
  RequirementType,
  RequirementCategory,
} from '../../../entities/requirement-item.entity';
import { JobFamily } from '../../../entities/job-family.entity';
import { JobTemplate } from '../../../entities/job-template.entity';
import { CompanyJobVariant } from '../../../entities/company-job-variant.entity';
import { CreateRequirementItemDto } from '../../dto/create-requirement-item.dto';
import { UpdateRequirementItemDto } from '../../dto/update-requirement-item.dto';

describe('RequirementItemService', () => {
  let service: RequirementItemService;
  let requirementItemRepository: Repository<RequirementItem>;
  let jobFamilyRepository: Repository<JobFamily>;
  let jobTemplateRepository: Repository<JobTemplate>;
  let companyJobVariantRepository: Repository<CompanyJobVariant>;

  const mockRequirementItem = {
    id: 'requirement-id',
    type: RequirementType.SKILL,
    category: RequirementCategory.MUST,
    description: 'JavaScript proficiency',
    weight: 8,
    alternatives: ['TypeScript'],
    jobFamilyId: 'job-family-id',
    jobTemplateId: null,
    companyJobVariantId: null,
    createdAt: new Date(),
  };

  const mockJobFamily = {
    id: 'job-family-id',
    name: 'Software Engineer',
  };

  const mockJobTemplate = {
    id: 'job-template-id',
    name: 'Senior Software Engineer',
  };

  const mockCompanyJobVariant = {
    id: 'variant-id',
    customTitle: 'Senior JavaScript Developer',
  };

  const mockRequirementItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockJobFamilyRepository = {
    findOne: jest.fn(),
  };

  const mockJobTemplateRepository = {
    findOne: jest.fn(),
  };

  const mockCompanyJobVariantRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementItemService,
        {
          provide: getRepositoryToken(RequirementItem),
          useValue: mockRequirementItemRepository,
        },
        {
          provide: getRepositoryToken(JobFamily),
          useValue: mockJobFamilyRepository,
        },
        {
          provide: getRepositoryToken(JobTemplate),
          useValue: mockJobTemplateRepository,
        },
        {
          provide: getRepositoryToken(CompanyJobVariant),
          useValue: mockCompanyJobVariantRepository,
        },
      ],
    }).compile();

    service = module.get<RequirementItemService>(RequirementItemService);
    requirementItemRepository = module.get<Repository<RequirementItem>>(
      getRepositoryToken(RequirementItem),
    );
    jobFamilyRepository = module.get<Repository<JobFamily>>(
      getRepositoryToken(JobFamily),
    );
    jobTemplateRepository = module.get<Repository<JobTemplate>>(
      getRepositoryToken(JobTemplate),
    );
    companyJobVariantRepository = module.get<Repository<CompanyJobVariant>>(
      getRepositoryToken(CompanyJobVariant),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new requirement item', async () => {
      const createDto: CreateRequirementItemDto = {
        type: RequirementType.SKILL,
        category: RequirementCategory.MUST,
        description: 'JavaScript proficiency',
        weight: 8,
        alternatives: ['TypeScript'],
      };

      mockRequirementItemRepository.create.mockReturnValue(mockRequirementItem);
      mockRequirementItemRepository.save.mockResolvedValue(mockRequirementItem);

      const result = await service.create(createDto);

      expect(mockRequirementItemRepository.create).toHaveBeenCalledWith({
        ...createDto,
        weight: 8,
      });
      expect(mockRequirementItemRepository.save).toHaveBeenCalledWith(
        mockRequirementItem,
      );
      expect(result).toEqual({
        id: mockRequirementItem.id,
        type: mockRequirementItem.type,
        category: mockRequirementItem.category,
        description: mockRequirementItem.description,
        weight: mockRequirementItem.weight,
        alternatives: mockRequirementItem.alternatives,
        jobFamilyId: mockRequirementItem.jobFamilyId,
        jobTemplateId: mockRequirementItem.jobTemplateId,
        companyJobVariantId: mockRequirementItem.companyJobVariantId,
        createdAt: mockRequirementItem.createdAt,
      });
    });

    it('should create requirement with parent job family', async () => {
      const createDto: CreateRequirementItemDto = {
        description: 'JavaScript proficiency',
        category: RequirementCategory.MUST,
      };

      mockJobFamilyRepository.findOne.mockResolvedValue(mockJobFamily);
      mockRequirementItemRepository.create.mockReturnValue({
        ...mockRequirementItem,
        jobFamilyId: 'job-family-id',
      });
      mockRequirementItemRepository.save.mockResolvedValue({
        ...mockRequirementItem,
        jobFamilyId: 'job-family-id',
      });

      const result = await service.create(
        createDto,
        'job-family-id',
        'job-family',
      );

      expect(mockJobFamilyRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'job-family-id' },
      });
      expect(mockRequirementItemRepository.create).toHaveBeenCalledWith({
        ...createDto,
        weight: 5,
        jobFamilyId: 'job-family-id',
      });
    });

    it('should throw NotFoundException when parent job family not found', async () => {
      const createDto: CreateRequirementItemDto = {
        description: 'JavaScript proficiency',
        category: RequirementCategory.MUST,
      };

      mockJobFamilyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(createDto, 'non-existent-id', 'job-family'),
      ).rejects.toThrow(
        new NotFoundException('JobFamily with ID non-existent-id not found'),
      );
    });

    it('should throw BadRequestException for invalid weight', async () => {
      const createDto: CreateRequirementItemDto = {
        description: 'JavaScript proficiency',
        category: RequirementCategory.MUST,
        weight: 15, // Invalid weight
      };

      await expect(service.create(createDto)).rejects.toThrow(
        new BadRequestException('Weight must be between 1 and 10'),
      );
    });

    it('should throw BadRequestException for short description', async () => {
      const createDto: CreateRequirementItemDto = {
        description: 'JS', // Too short
        category: RequirementCategory.MUST,
      };

      await expect(service.create(createDto)).rejects.toThrow(
        new BadRequestException(
          'Description must be at least 3 characters long',
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all requirement items', async () => {
      const requirements = [mockRequirementItem];
      mockRequirementItemRepository.find.mockResolvedValue(requirements);

      const result = await service.findAll();

      expect(mockRequirementItemRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockRequirementItem.id);
    });
  });

  describe('findOne', () => {
    it('should return a requirement item by id', async () => {
      mockRequirementItemRepository.findOne.mockResolvedValue(
        mockRequirementItem,
      );

      const result = await service.findOne('requirement-id');

      expect(mockRequirementItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'requirement-id' },
      });
      expect(result.id).toBe(mockRequirementItem.id);
    });

    it('should throw NotFoundException when requirement not found', async () => {
      mockRequirementItemRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'RequirementItem with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('findByJobFamily', () => {
    it('should return requirements by job family id', async () => {
      const requirements = [mockRequirementItem];
      mockRequirementItemRepository.find.mockResolvedValue(requirements);

      const result = await service.findByJobFamily('job-family-id');

      expect(mockRequirementItemRepository.find).toHaveBeenCalledWith({
        where: { jobFamilyId: 'job-family-id' },
        order: { weight: 'DESC', createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findByCategory', () => {
    it('should return requirements by category', async () => {
      const requirements = [mockRequirementItem];
      mockRequirementItemRepository.find.mockResolvedValue(requirements);

      const result = await service.findByCategory(RequirementCategory.MUST);

      expect(mockRequirementItemRepository.find).toHaveBeenCalledWith({
        where: { category: RequirementCategory.MUST },
        order: { weight: 'DESC', createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update a requirement item', async () => {
      const updateDto: UpdateRequirementItemDto = {
        description: 'Updated JavaScript proficiency',
        weight: 9,
      };

      const updatedRequirement = { ...mockRequirementItem, ...updateDto };

      mockRequirementItemRepository.findOne.mockResolvedValue(
        mockRequirementItem,
      );
      mockRequirementItemRepository.save.mockResolvedValue(updatedRequirement);

      const result = await service.update('requirement-id', updateDto);

      expect(mockRequirementItemRepository.save).toHaveBeenCalled();
      expect(result.description).toBe(updateDto.description);
      expect(result.weight).toBe(updateDto.weight);
    });

    it('should throw NotFoundException when requirement not found', async () => {
      const updateDto: UpdateRequirementItemDto = { description: 'Updated' };
      mockRequirementItemRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(
        new NotFoundException(
          'RequirementItem with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('categorizeRequirements', () => {
    it('should categorize requirements correctly', async () => {
      const requirements = [
        { ...mockRequirementItem, category: RequirementCategory.MUST },
        {
          ...mockRequirementItem,
          id: 'req-2',
          category: RequirementCategory.SHOULD,
        },
        {
          ...mockRequirementItem,
          id: 'req-3',
          category: RequirementCategory.NICE,
        },
      ] as RequirementItem[];

      const result = await service.categorizeRequirements(requirements);

      expect(result.must).toHaveLength(1);
      expect(result.should).toHaveLength(1);
      expect(result.nice).toHaveLength(1);
    });
  });

  describe('validateRequirementLogic', () => {
    it('should validate requirement logic and return warnings', async () => {
      const requirements = [
        {
          ...mockRequirementItem,
          category: RequirementCategory.MUST,
          weight: 5,
        },
        {
          ...mockRequirementItem,
          id: 'req-2',
          category: RequirementCategory.MUST,
          weight: 6,
        },
      ] as RequirementItem[];

      const result = await service.validateRequirementLogic(requirements);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Consider having at least one high-weight (8+) MUST requirement',
      );
    });

    it('should detect duplicate descriptions', async () => {
      const requirements = [
        { ...mockRequirementItem, description: 'JavaScript proficiency' },
        {
          ...mockRequirementItem,
          id: 'req-2',
          description: 'JavaScript proficiency',
        },
      ] as RequirementItem[];

      const result = await service.validateRequirementLogic(requirements);

      expect(
        result.warnings.some((w) =>
          w.includes('Duplicate requirement descriptions'),
        ),
      ).toBe(true);
    });
  });

  describe('remove', () => {
    it('should remove a requirement item', async () => {
      mockRequirementItemRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('requirement-id');

      expect(mockRequirementItemRepository.delete).toHaveBeenCalledWith(
        'requirement-id',
      );
    });

    it('should throw NotFoundException when requirement not found', async () => {
      mockRequirementItemRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'RequirementItem with ID non-existent-id not found',
        ),
      );
    });
  });
});
