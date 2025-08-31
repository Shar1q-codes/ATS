import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompanyJobVariantController } from '../company-job-variant.controller';
import { CompanyJobVariantService } from '../../services/company-job-variant.service';
import { CreateCompanyJobVariantDto } from '../../dto/create-company-job-variant.dto';
import { UpdateCompanyJobVariantDto } from '../../dto/update-company-job-variant.dto';
import { CompanyJobVariantResponseDto } from '../../dto/company-job-variant-response.dto';
import { ResolvedJobSpecDto } from '../../dto/resolved-job-spec.dto';
import {
  RequirementType,
  RequirementCategory,
} from '../../../entities/requirement-item.entity';

describe('CompanyJobVariantController', () => {
  let controller: CompanyJobVariantController;
  let service: CompanyJobVariantService;

  const mockCompanyJobVariantResponse: CompanyJobVariantResponseDto = {
    id: 'variant-id',
    jobTemplateId: 'job-template-id',
    companyProfileId: 'company-profile-id',
    customTitle: 'Senior Full Stack Engineer',
    customDescription: 'Custom description',
    isActive: true,
    publishedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockResolvedJobSpec: ResolvedJobSpecDto = {
    title: 'Senior Full Stack Engineer',
    description: 'Custom description',
    requirements: [],
    company: {
      id: 'company-profile-id',
      name: 'TechCorp Inc',
      industry: 'Technology',
      size: 'medium' as any,
      culture: ['Innovation'],
      benefits: ['Health Insurance'],
      workArrangement: 'hybrid' as any,
      location: 'San Francisco, CA',
      preferences: {
        prioritySkills: ['JavaScript'],
        dealBreakers: [],
        niceToHave: ['TypeScript'],
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      users: [],
      jobVariants: [],
    },
    salaryRange: {
      min: 80000,
      max: 120000,
      currency: 'USD',
    },
    benefits: ['Health Insurance'],
    workArrangement: 'hybrid',
    location: 'San Francisco, CA',
  };

  const mockCompanyJobVariantService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCompany: jest.fn(),
    findByJobTemplate: jest.fn(),
    update: jest.fn(),
    publish: jest.fn(),
    unpublish: jest.fn(),
    resolveJobSpec: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyJobVariantController],
      providers: [
        {
          provide: CompanyJobVariantService,
          useValue: mockCompanyJobVariantService,
        },
      ],
    }).compile();

    controller = module.get<CompanyJobVariantController>(
      CompanyJobVariantController,
    );
    service = module.get<CompanyJobVariantService>(CompanyJobVariantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new company job variant', async () => {
      const createDto: CreateCompanyJobVariantDto = {
        jobTemplateId: 'job-template-id',
        companyProfileId: 'company-profile-id',
        customTitle: 'Senior Full Stack Engineer',
        customDescription: 'Custom description',
        isActive: true,
        additionalRequirements: [
          {
            type: RequirementType.SKILL,
            category: RequirementCategory.MUST,
            description: 'React experience',
            weight: 8,
          },
        ],
      };

      mockCompanyJobVariantService.create.mockResolvedValue(
        mockCompanyJobVariantResponse,
      );

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockCompanyJobVariantResponse);
    });
  });

  describe('findAll', () => {
    it('should return all company job variants', async () => {
      mockCompanyJobVariantService.findAll.mockResolvedValue([
        mockCompanyJobVariantResponse,
      ]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockCompanyJobVariantResponse]);
    });

    it('should return variants filtered by company profile', async () => {
      const companyProfileId = 'company-profile-id';
      mockCompanyJobVariantService.findByCompany.mockResolvedValue([
        mockCompanyJobVariantResponse,
      ]);

      const result = await controller.findAll(companyProfileId);

      expect(service.findByCompany).toHaveBeenCalledWith(companyProfileId);
      expect(result).toEqual([mockCompanyJobVariantResponse]);
    });

    it('should return variants filtered by job template', async () => {
      const jobTemplateId = 'job-template-id';
      mockCompanyJobVariantService.findByJobTemplate.mockResolvedValue([
        mockCompanyJobVariantResponse,
      ]);

      const result = await controller.findAll(undefined, jobTemplateId);

      expect(service.findByJobTemplate).toHaveBeenCalledWith(jobTemplateId);
      expect(result).toEqual([mockCompanyJobVariantResponse]);
    });
  });

  describe('findOne', () => {
    it('should return a company job variant by id', async () => {
      const id = 'variant-id';
      mockCompanyJobVariantService.findOne.mockResolvedValue(
        mockCompanyJobVariantResponse,
      );

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockCompanyJobVariantResponse);
    });

    it('should throw NotFoundException when variant not found', async () => {
      const id = 'non-existent-id';
      mockCompanyJobVariantService.findOne.mockRejectedValue(
        new NotFoundException(`CompanyJobVariant with ID ${id} not found`),
      );

      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getResolvedSpec', () => {
    it('should return resolved job specification', async () => {
      const id = 'variant-id';
      mockCompanyJobVariantService.resolveJobSpec.mockResolvedValue(
        mockResolvedJobSpec,
      );

      const result = await controller.getResolvedSpec(id);

      expect(service.resolveJobSpec).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockResolvedJobSpec);
    });

    it('should throw NotFoundException when variant not found', async () => {
      const id = 'non-existent-id';
      mockCompanyJobVariantService.resolveJobSpec.mockRejectedValue(
        new NotFoundException(`CompanyJobVariant with ID ${id} not found`),
      );

      await expect(controller.getResolvedSpec(id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a company job variant', async () => {
      const id = 'variant-id';
      const updateDto: UpdateCompanyJobVariantDto = {
        customTitle: 'Updated Senior Full Stack Engineer',
        isActive: false,
      };

      const updatedResponse = {
        ...mockCompanyJobVariantResponse,
        ...updateDto,
      };
      mockCompanyJobVariantService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(id, updateDto);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(updatedResponse);
    });

    it('should throw NotFoundException when variant not found', async () => {
      const id = 'non-existent-id';
      const updateDto: UpdateCompanyJobVariantDto = { customTitle: 'Updated' };

      mockCompanyJobVariantService.update.mockRejectedValue(
        new NotFoundException(`CompanyJobVariant with ID ${id} not found`),
      );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('publish', () => {
    it('should publish a company job variant', async () => {
      const id = 'variant-id';
      const publishedResponse = {
        ...mockCompanyJobVariantResponse,
        isActive: true,
        publishedAt: new Date(),
      };
      mockCompanyJobVariantService.publish.mockResolvedValue(publishedResponse);

      const result = await controller.publish(id);

      expect(service.publish).toHaveBeenCalledWith(id);
      expect(result).toEqual(publishedResponse);
    });

    it('should throw NotFoundException when variant not found', async () => {
      const id = 'non-existent-id';
      mockCompanyJobVariantService.publish.mockRejectedValue(
        new NotFoundException(`CompanyJobVariant with ID ${id} not found`),
      );

      await expect(controller.publish(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('unpublish', () => {
    it('should unpublish a company job variant', async () => {
      const id = 'variant-id';
      const unpublishedResponse = {
        ...mockCompanyJobVariantResponse,
        isActive: false,
      };
      mockCompanyJobVariantService.unpublish.mockResolvedValue(
        unpublishedResponse,
      );

      const result = await controller.unpublish(id);

      expect(service.unpublish).toHaveBeenCalledWith(id);
      expect(result).toEqual(unpublishedResponse);
    });

    it('should throw NotFoundException when variant not found', async () => {
      const id = 'non-existent-id';
      mockCompanyJobVariantService.unpublish.mockRejectedValue(
        new NotFoundException(`CompanyJobVariant with ID ${id} not found`),
      );

      await expect(controller.unpublish(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a company job variant', async () => {
      const id = 'variant-id';
      mockCompanyJobVariantService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException when variant not found', async () => {
      const id = 'non-existent-id';
      mockCompanyJobVariantService.remove.mockRejectedValue(
        new NotFoundException(`CompanyJobVariant with ID ${id} not found`),
      );

      await expect(controller.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
