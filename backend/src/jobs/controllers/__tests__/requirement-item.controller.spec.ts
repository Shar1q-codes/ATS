import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RequirementItemController } from '../requirement-item.controller';
import {
  RequirementItemService,
  RequirementItemResponseDto,
} from '../../services/requirement-item.service';
import { CreateRequirementItemDto } from '../../dto/create-requirement-item.dto';
import { UpdateRequirementItemDto } from '../../dto/update-requirement-item.dto';
import {
  RequirementType,
  RequirementCategory,
} from '../../../entities/requirement-item.entity';

describe('RequirementItemController', () => {
  let controller: RequirementItemController;
  let service: RequirementItemService;

  const mockRequirementItemResponse: RequirementItemResponseDto = {
    id: 'requirement-id',
    type: RequirementType.SKILL,
    category: RequirementCategory.MUST,
    description: 'JavaScript proficiency',
    weight: 8,
    alternatives: ['TypeScript'],
    jobFamilyId: 'job-family-id',
    jobTemplateId: null,
    companyJobVariantId: null,
    createdAt: new Date('2024-01-01'),
  };

  const mockRequirementItemService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByJobFamily: jest.fn(),
    findByJobTemplate: jest.fn(),
    findByCompanyJobVariant: jest.fn(),
    findByCategory: jest.fn(),
    findByType: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    categorizeRequirements: jest.fn(),
    validateRequirementLogic: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequirementItemController],
      providers: [
        {
          provide: RequirementItemService,
          useValue: mockRequirementItemService,
        },
      ],
    }).compile();

    controller = module.get<RequirementItemController>(
      RequirementItemController,
    );
    service = module.get<RequirementItemService>(RequirementItemService);
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

      mockRequirementItemService.create.mockResolvedValue(
        mockRequirementItemResponse,
      );

      const result = await controller.create(
        createDto,
        'job-family-id',
        'job-family',
      );

      expect(service.create).toHaveBeenCalledWith(
        createDto,
        'job-family-id',
        'job-family',
      );
      expect(result).toEqual(mockRequirementItemResponse);
    });

    it('should create requirement without parent', async () => {
      const createDto: CreateRequirementItemDto = {
        description: 'JavaScript proficiency',
      };

      mockRequirementItemService.create.mockResolvedValue(
        mockRequirementItemResponse,
      );

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(
        createDto,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockRequirementItemResponse);
    });
  });

  describe('findAll', () => {
    it('should return all requirement items', async () => {
      mockRequirementItemService.findAll.mockResolvedValue([
        mockRequirementItemResponse,
      ]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockRequirementItemResponse]);
    });

    it('should return requirements filtered by job family', async () => {
      const jobFamilyId = 'job-family-id';
      mockRequirementItemService.findByJobFamily.mockResolvedValue([
        mockRequirementItemResponse,
      ]);

      const result = await controller.findAll(jobFamilyId);

      expect(service.findByJobFamily).toHaveBeenCalledWith(jobFamilyId);
      expect(result).toEqual([mockRequirementItemResponse]);
    });

    it('should return requirements filtered by job template', async () => {
      const jobTemplateId = 'job-template-id';
      mockRequirementItemService.findByJobTemplate.mockResolvedValue([
        mockRequirementItemResponse,
      ]);

      const result = await controller.findAll(undefined, jobTemplateId);

      expect(service.findByJobTemplate).toHaveBeenCalledWith(jobTemplateId);
      expect(result).toEqual([mockRequirementItemResponse]);
    });

    it('should return requirements filtered by company job variant', async () => {
      const companyJobVariantId = 'variant-id';
      mockRequirementItemService.findByCompanyJobVariant.mockResolvedValue([
        mockRequirementItemResponse,
      ]);

      const result = await controller.findAll(
        undefined,
        undefined,
        companyJobVariantId,
      );

      expect(service.findByCompanyJobVariant).toHaveBeenCalledWith(
        companyJobVariantId,
      );
      expect(result).toEqual([mockRequirementItemResponse]);
    });

    it('should return requirements filtered by category', async () => {
      const category = RequirementCategory.MUST;
      mockRequirementItemService.findByCategory.mockResolvedValue([
        mockRequirementItemResponse,
      ]);

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        category,
      );

      expect(service.findByCategory).toHaveBeenCalledWith(category);
      expect(result).toEqual([mockRequirementItemResponse]);
    });

    it('should return requirements filtered by type', async () => {
      const type = RequirementType.SKILL;
      mockRequirementItemService.findByType.mockResolvedValue([
        mockRequirementItemResponse,
      ]);

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        type,
      );

      expect(service.findByType).toHaveBeenCalledWith(type);
      expect(result).toEqual([mockRequirementItemResponse]);
    });
  });

  describe('categorizeRequirements', () => {
    it('should categorize requirements by job family', async () => {
      const jobFamilyId = 'job-family-id';
      const categorizedResponse = {
        must: [mockRequirementItemResponse],
        should: [],
        nice: [],
      };

      mockRequirementItemService.findByJobFamily.mockResolvedValue([
        mockRequirementItemResponse,
      ]);
      mockRequirementItemService.categorizeRequirements.mockResolvedValue({
        must: [mockRequirementItemResponse],
        should: [],
        nice: [],
      });

      // Mock the private method access
      service['toResponseDto'] = jest
        .fn()
        .mockReturnValue(mockRequirementItemResponse);

      const result = await controller.categorizeRequirements(jobFamilyId);

      expect(service.findByJobFamily).toHaveBeenCalledWith(jobFamilyId);
      expect(result.must).toHaveLength(1);
      expect(result.should).toHaveLength(0);
      expect(result.nice).toHaveLength(0);
    });
  });

  describe('validateRequirements', () => {
    it('should validate requirements', async () => {
      const requirements = [mockRequirementItemResponse];
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: ['Some warning'],
      };

      mockRequirementItemService.validateRequirementLogic.mockResolvedValue(
        validationResult,
      );

      const result = await controller.validateRequirements(requirements);

      expect(service.validateRequirementLogic).toHaveBeenCalled();
      expect(result).toEqual(validationResult);
    });
  });

  describe('findOne', () => {
    it('should return a requirement item by id', async () => {
      const id = 'requirement-id';
      mockRequirementItemService.findOne.mockResolvedValue(
        mockRequirementItemResponse,
      );

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockRequirementItemResponse);
    });

    it('should throw NotFoundException when requirement not found', async () => {
      const id = 'non-existent-id';
      mockRequirementItemService.findOne.mockRejectedValue(
        new NotFoundException(`RequirementItem with ID ${id} not found`),
      );

      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a requirement item', async () => {
      const id = 'requirement-id';
      const updateDto: UpdateRequirementItemDto = {
        description: 'Updated JavaScript proficiency',
        weight: 9,
      };

      const updatedResponse = { ...mockRequirementItemResponse, ...updateDto };
      mockRequirementItemService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(id, updateDto);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(updatedResponse);
    });

    it('should throw NotFoundException when requirement not found', async () => {
      const id = 'non-existent-id';
      const updateDto: UpdateRequirementItemDto = { description: 'Updated' };

      mockRequirementItemService.update.mockRejectedValue(
        new NotFoundException(`RequirementItem with ID ${id} not found`),
      );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a requirement item', async () => {
      const id = 'requirement-id';
      mockRequirementItemService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException when requirement not found', async () => {
      const id = 'non-existent-id';
      mockRequirementItemService.remove.mockRejectedValue(
        new NotFoundException(`RequirementItem with ID ${id} not found`),
      );

      await expect(controller.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
