import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JdVersionController } from '../jd-version.controller';
import { JdVersionService } from '../../services/jd-version.service';
import { CreateJdVersionDto } from '../../dto/create-jd-version.dto';
import { UpdateJdVersionDto } from '../../dto/update-jd-version.dto';
import { JdVersionResponseDto } from '../../dto/jd-version-response.dto';

describe('JdVersionController', () => {
  let controller: JdVersionController;
  let service: JdVersionService;

  const mockJdVersionResponse: JdVersionResponseDto = {
    id: 'jd-version-id',
    companyJobVariantId: 'variant-id',
    version: 1,
    resolvedSpec: {
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
    },
    publishedContent: '# Senior Full Stack Engineer\n**Company:** TechCorp Inc',
    createdById: 'user-id',
    createdAt: new Date('2024-01-01'),
  };

  const mockJdVersionService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCompanyJobVariant: jest.fn(),
    findLatestByCompanyJobVariant: jest.fn(),
    update: jest.fn(),
    regenerateJobDescription: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JdVersionController],
      providers: [
        {
          provide: JdVersionService,
          useValue: mockJdVersionService,
        },
      ],
    }).compile();

    controller = module.get<JdVersionController>(JdVersionController);
    service = module.get<JdVersionService>(JdVersionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new JD version', async () => {
      const createDto: CreateJdVersionDto = {
        companyJobVariantId: 'variant-id',
        customTitle: 'Custom Title',
        customDescription: 'Custom description',
      };

      const mockRequest = { user: { id: 'user-id' } };

      mockJdVersionService.create.mockResolvedValue(mockJdVersionResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(createDto, 'user-id');
      expect(result).toEqual(mockJdVersionResponse);
    });
  });

  describe('findAll', () => {
    it('should return all JD versions', async () => {
      mockJdVersionService.findAll.mockResolvedValue([mockJdVersionResponse]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockJdVersionResponse]);
    });

    it('should return JD versions filtered by company job variant', async () => {
      const companyJobVariantId = 'variant-id';
      mockJdVersionService.findByCompanyJobVariant.mockResolvedValue([
        mockJdVersionResponse,
      ]);

      const result = await controller.findAll(companyJobVariantId);

      expect(service.findByCompanyJobVariant).toHaveBeenCalledWith(
        companyJobVariantId,
      );
      expect(result).toEqual([mockJdVersionResponse]);
    });
  });

  describe('findLatest', () => {
    it('should return the latest JD version for a company job variant', async () => {
      const companyJobVariantId = 'variant-id';
      mockJdVersionService.findLatestByCompanyJobVariant.mockResolvedValue(
        mockJdVersionResponse,
      );

      const result = await controller.findLatest(companyJobVariantId);

      expect(service.findLatestByCompanyJobVariant).toHaveBeenCalledWith(
        companyJobVariantId,
      );
      expect(result).toEqual(mockJdVersionResponse);
    });

    it('should throw error when companyJobVariantId is not provided', async () => {
      await expect(controller.findLatest('')).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should return a JD version by id', async () => {
      const id = 'jd-version-id';
      mockJdVersionService.findOne.mockResolvedValue(mockJdVersionResponse);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockJdVersionResponse);
    });

    it('should throw NotFoundException when JD version not found', async () => {
      const id = 'non-existent-id';
      mockJdVersionService.findOne.mockRejectedValue(
        new NotFoundException(`JdVersion with ID ${id} not found`),
      );

      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPublishedContent', () => {
    it('should return published content', async () => {
      const id = 'jd-version-id';
      mockJdVersionService.findOne.mockResolvedValue(mockJdVersionResponse);

      const result = await controller.getPublishedContent(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual({
        content: mockJdVersionResponse.publishedContent,
      });
    });

    it('should return empty content when publishedContent is null', async () => {
      const id = 'jd-version-id';
      const responseWithoutContent = {
        ...mockJdVersionResponse,
        publishedContent: undefined,
      };
      mockJdVersionService.findOne.mockResolvedValue(responseWithoutContent);

      const result = await controller.getPublishedContent(id);

      expect(result).toEqual({ content: '' });
    });
  });

  describe('update', () => {
    it('should update a JD version', async () => {
      const id = 'jd-version-id';
      const updateDto: UpdateJdVersionDto = {
        customTitle: 'Updated Title',
      };

      const updatedResponse = { ...mockJdVersionResponse, ...updateDto };
      mockJdVersionService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(id, updateDto);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(updatedResponse);
    });

    it('should throw NotFoundException when JD version not found', async () => {
      const id = 'non-existent-id';
      const updateDto: UpdateJdVersionDto = { customTitle: 'Updated' };

      mockJdVersionService.update.mockRejectedValue(
        new NotFoundException(`JdVersion with ID ${id} not found`),
      );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('regenerateDescription', () => {
    it('should regenerate job description', async () => {
      const id = 'jd-version-id';
      const regeneratedResponse = {
        ...mockJdVersionResponse,
        publishedContent: 'Regenerated content',
      };
      mockJdVersionService.regenerateJobDescription.mockResolvedValue(
        regeneratedResponse,
      );

      const result = await controller.regenerateDescription(id);

      expect(service.regenerateJobDescription).toHaveBeenCalledWith(id);
      expect(result).toEqual(regeneratedResponse);
    });

    it('should throw NotFoundException when JD version not found', async () => {
      const id = 'non-existent-id';
      mockJdVersionService.regenerateJobDescription.mockRejectedValue(
        new NotFoundException(`JdVersion with ID ${id} not found`),
      );

      await expect(controller.regenerateDescription(id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a JD version', async () => {
      const id = 'jd-version-id';
      mockJdVersionService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException when JD version not found', async () => {
      const id = 'non-existent-id';
      mockJdVersionService.remove.mockRejectedValue(
        new NotFoundException(`JdVersion with ID ${id} not found`),
      );

      await expect(controller.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
