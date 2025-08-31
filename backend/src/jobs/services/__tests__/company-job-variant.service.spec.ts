import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CompanyJobVariantService } from '../company-job-variant.service';
import { CompanyJobVariant } from '../../../entities/company-job-variant.entity';
import { RequirementItem } from '../../../entities/requirement-item.entity';
import { JobTemplate, JobLevel } from '../../../entities/job-template.entity';
import {
  CompanyProfile,
  CompanySize,
  WorkArrangement,
} from '../../../entities/company-profile.entity';
import { CreateCompanyJobVariantDto } from '../../dto/create-company-job-variant.dto';
import { UpdateCompanyJobVariantDto } from '../../dto/update-company-job-variant.dto';

describe('CompanyJobVariantService', () => {
  let service: CompanyJobVariantService;
  let companyJobVariantRepository: Repository<CompanyJobVariant>;
  let requirementItemRepository: Repository<RequirementItem>;
  let jobTemplateRepository: Repository<JobTemplate>;
  let companyProfileRepository: Repository<CompanyProfile>;

  const mockJobTemplate = {
    id: 'job-template-id',
    name: 'Senior Software Engineer',
    level: JobLevel.SENIOR,
    jobFamily: {
      id: 'job-family-id',
      name: 'Software Engineer',
      baseRequirements: [],
    },
    requirements: [],
    salaryRangeMin: 80000,
    salaryRangeMax: 120000,
    salaryCurrency: 'USD',
  };

  const mockCompanyProfile = {
    id: 'company-profile-id',
    name: 'TechCorp',
    industry: 'Technology',
    size: CompanySize.MEDIUM,
    benefits: ['Health Insurance'],
    workArrangement: WorkArrangement.HYBRID,
    location: 'San Francisco, CA',
  };

  const mockRequirement = {
    id: 'requirement-id',
    type: 'skill',
    category: 'must',
    description: 'JavaScript proficiency',
    weight: 8,
    alternatives: ['TypeScript'],
  };

  const mockCompanyJobVariant = {
    id: 'variant-id',
    jobTemplateId: 'job-template-id',
    companyProfileId: 'company-profile-id',
    customTitle: 'Senior JavaScript Developer',
    customDescription: 'Custom description',
    isActive: true,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    jobTemplate: mockJobTemplate,
    companyProfile: mockCompanyProfile,
    requirements: [mockRequirement],
  };

  const mockCompanyJobVariantRepository = {
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

  const mockJobTemplateRepository = {
    findOne: jest.fn(),
  };

  const mockCompanyProfileRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyJobVariantService,
        {
          provide: getRepositoryToken(CompanyJobVariant),
          useValue: mockCompanyJobVariantRepository,
        },
        {
          provide: getRepositoryToken(RequirementItem),
          useValue: mockRequirementItemRepository,
        },
        {
          provide: getRepositoryToken(JobTemplate),
          useValue: mockJobTemplateRepository,
        },
        {
          provide: getRepositoryToken(CompanyProfile),
          useValue: mockCompanyProfileRepository,
        },
      ],
    }).compile();

    service = module.get<CompanyJobVariantService>(CompanyJobVariantService);
    companyJobVariantRepository = module.get<Repository<CompanyJobVariant>>(
      getRepositoryToken(CompanyJobVariant),
    );
    requirementItemRepository = module.get<Repository<RequirementItem>>(
      getRepositoryToken(RequirementItem),
    );
    jobTemplateRepository = module.get<Repository<JobTemplate>>(
      getRepositoryToken(JobTemplate),
    );
    companyProfileRepository = module.get<Repository<CompanyProfile>>(
      getRepositoryToken(CompanyProfile),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new company job variant with requirements', async () => {
      const createDto: CreateCompanyJobVariantDto = {
        jobTemplateId: 'job-template-id',
        companyProfileId: 'company-profile-id',
        customTitle: 'Senior JavaScript Developer',
        additionalRequirements: [mockRequirement],
        modifiedRequirements: [],
      };

      mockJobTemplateRepository.findOne.mockResolvedValue(mockJobTemplate);
      mockCompanyProfileRepository.findOne.mockResolvedValue(
        mockCompanyProfile,
      );
      mockCompanyJobVariantRepository.create.mockReturnValue(
        mockCompanyJobVariant,
      );
      mockCompanyJobVariantRepository.save.mockResolvedValue(
        mockCompanyJobVariant,
      );
      mockRequirementItemRepository.create.mockReturnValue(mockRequirement);
      mockRequirementItemRepository.save.mockResolvedValue([mockRequirement]);

      // Mock findOne for the final return
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockCompanyJobVariant as any);

      const result = await service.create(createDto);

      expect(mockJobTemplateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'job-template-id' },
      });
      expect(mockCompanyProfileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'company-profile-id' },
      });
      expect(mockCompanyJobVariantRepository.create).toHaveBeenCalled();
      expect(mockRequirementItemRepository.save).toHaveBeenCalled();
      expect(result.id).toBe(mockCompanyJobVariant.id);
    });

    it('should throw NotFoundException when job template not found', async () => {
      const createDto: CreateCompanyJobVariantDto = {
        jobTemplateId: 'non-existent-id',
        companyProfileId: 'company-profile-id',
      };

      mockJobTemplateRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        new NotFoundException('JobTemplate with ID non-existent-id not found'),
      );
    });

    it('should throw NotFoundException when company profile not found', async () => {
      const createDto: CreateCompanyJobVariantDto = {
        jobTemplateId: 'job-template-id',
        companyProfileId: 'non-existent-id',
      };

      mockJobTemplateRepository.findOne.mockResolvedValue(mockJobTemplate);
      mockCompanyProfileRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        new NotFoundException(
          'CompanyProfile with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all company job variants', async () => {
      const variants = [mockCompanyJobVariant];
      mockCompanyJobVariantRepository.find.mockResolvedValue(variants);

      const result = await service.findAll();

      expect(mockCompanyJobVariantRepository.find).toHaveBeenCalledWith({
        relations: ['jobTemplate', 'companyProfile', 'requirements'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockCompanyJobVariant.id);
    });
  });

  describe('findOne', () => {
    it('should return a company job variant by id', async () => {
      mockCompanyJobVariantRepository.findOne.mockResolvedValue(
        mockCompanyJobVariant,
      );

      const result = await service.findOne('variant-id');

      expect(mockCompanyJobVariantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'variant-id' },
        relations: [
          'jobTemplate',
          'companyProfile',
          'requirements',
          'jobTemplate.jobFamily',
        ],
      });
      expect(result.id).toBe(mockCompanyJobVariant.id);
    });

    it('should throw NotFoundException when variant not found', async () => {
      mockCompanyJobVariantRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'CompanyJobVariant with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('findByCompany', () => {
    it('should return variants by company profile id', async () => {
      const variants = [mockCompanyJobVariant];
      mockCompanyJobVariantRepository.find.mockResolvedValue(variants);

      const result = await service.findByCompany('company-profile-id');

      expect(mockCompanyJobVariantRepository.find).toHaveBeenCalledWith({
        where: { companyProfileId: 'company-profile-id' },
        relations: ['jobTemplate', 'companyProfile', 'requirements'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findByJobTemplate', () => {
    it('should return variants by job template id', async () => {
      const variants = [mockCompanyJobVariant];
      mockCompanyJobVariantRepository.find.mockResolvedValue(variants);

      const result = await service.findByJobTemplate('job-template-id');

      expect(mockCompanyJobVariantRepository.find).toHaveBeenCalledWith({
        where: { jobTemplateId: 'job-template-id' },
        relations: ['jobTemplate', 'companyProfile', 'requirements'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update a company job variant', async () => {
      const updateDto: UpdateCompanyJobVariantDto = {
        customTitle: 'Updated Senior JavaScript Developer',
        isActive: false,
      };

      const updatedVariant = { ...mockCompanyJobVariant, ...updateDto };

      mockCompanyJobVariantRepository.findOne.mockResolvedValue(
        mockCompanyJobVariant,
      );
      mockCompanyJobVariantRepository.save.mockResolvedValue(updatedVariant);
      jest.spyOn(service, 'findOne').mockResolvedValue(updatedVariant as any);

      const result = await service.update('variant-id', updateDto);

      expect(mockCompanyJobVariantRepository.save).toHaveBeenCalled();
      expect(result.customTitle).toBe(updateDto.customTitle);
      expect(result.isActive).toBe(updateDto.isActive);
    });

    it('should throw NotFoundException when variant not found', async () => {
      const updateDto: UpdateCompanyJobVariantDto = { customTitle: 'Updated' };
      mockCompanyJobVariantRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(
        new NotFoundException(
          'CompanyJobVariant with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('publish', () => {
    it('should publish a company job variant', async () => {
      const unpublishedVariant = {
        ...mockCompanyJobVariant,
        isActive: false,
        publishedAt: null,
      };
      const publishedVariant = {
        ...unpublishedVariant,
        isActive: true,
        publishedAt: new Date(),
      };

      mockCompanyJobVariantRepository.findOne.mockResolvedValue(
        unpublishedVariant,
      );
      mockCompanyJobVariantRepository.save.mockResolvedValue(publishedVariant);
      jest.spyOn(service, 'findOne').mockResolvedValue(publishedVariant as any);

      const result = await service.publish('variant-id');

      expect(mockCompanyJobVariantRepository.save).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
      expect(result.publishedAt).toBeDefined();
    });

    it('should throw NotFoundException when variant not found', async () => {
      mockCompanyJobVariantRepository.findOne.mockResolvedValue(null);

      await expect(service.publish('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'CompanyJobVariant with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('unpublish', () => {
    it('should unpublish a company job variant', async () => {
      const unpublishedVariant = { ...mockCompanyJobVariant, isActive: false };

      mockCompanyJobVariantRepository.findOne.mockResolvedValue(
        mockCompanyJobVariant,
      );
      mockCompanyJobVariantRepository.save.mockResolvedValue(
        unpublishedVariant,
      );
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(unpublishedVariant as any);

      const result = await service.unpublish('variant-id');

      expect(mockCompanyJobVariantRepository.save).toHaveBeenCalled();
      expect(result.isActive).toBe(false);
    });
  });

  describe('resolveJobSpec', () => {
    it('should resolve job specification from variant', async () => {
      const variantWithRelations = {
        ...mockCompanyJobVariant,
        jobTemplate: {
          ...mockJobTemplate,
          jobFamily: {
            id: 'job-family-id',
            name: 'Software Engineer',
            baseRequirements: [mockRequirement],
          },
          requirements: [mockRequirement],
        },
        requirements: [mockRequirement],
      };

      mockCompanyJobVariantRepository.findOne.mockResolvedValue(
        variantWithRelations,
      );

      const result = await service.resolveJobSpec('variant-id');

      expect(result.title).toBe(variantWithRelations.customTitle);
      expect(result.description).toBe(variantWithRelations.customDescription);
      expect(result.company).toBe(variantWithRelations.companyProfile);
      expect(result.requirements).toBeDefined();
      expect(result.salaryRange).toEqual({
        min: mockJobTemplate.salaryRangeMin,
        max: mockJobTemplate.salaryRangeMax,
        currency: mockJobTemplate.salaryCurrency,
      });
    });

    it('should throw NotFoundException when variant not found', async () => {
      mockCompanyJobVariantRepository.findOne.mockResolvedValue(null);

      await expect(service.resolveJobSpec('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'CompanyJobVariant with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('remove', () => {
    it('should remove a company job variant', async () => {
      mockCompanyJobVariantRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('variant-id');

      expect(mockCompanyJobVariantRepository.delete).toHaveBeenCalledWith(
        'variant-id',
      );
    });

    it('should throw NotFoundException when variant not found', async () => {
      mockCompanyJobVariantRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'CompanyJobVariant with ID non-existent-id not found',
        ),
      );
    });
  });
});
