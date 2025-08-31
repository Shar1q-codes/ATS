import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompanyProfileController } from '../company-profile.controller';
import { CompanyProfileService } from '../../services/company-profile.service';
import { CreateCompanyProfileDto } from '../../dto/create-company-profile.dto';
import { UpdateCompanyProfileDto } from '../../dto/update-company-profile.dto';
import { CompanyProfileResponseDto } from '../../dto/company-profile-response.dto';
import {
  CompanySize,
  WorkArrangement,
} from '../../../entities/company-profile.entity';

describe('CompanyProfileController', () => {
  let controller: CompanyProfileController;
  let service: CompanyProfileService;

  const mockCompanyProfileResponse: CompanyProfileResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'TechCorp Inc',
    industry: 'Technology',
    size: CompanySize.MEDIUM,
    culture: ['Innovation', 'Collaboration'],
    benefits: ['Health Insurance', 'Remote Work'],
    workArrangement: WorkArrangement.HYBRID,
    location: 'San Francisco, CA',
    preferences: {
      prioritySkills: ['JavaScript', 'React'],
      dealBreakers: ['No remote work'],
      niceToHave: ['TypeScript', 'Node.js'],
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCompanyProfileService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByName: jest.fn(),
    update: jest.fn(),
    updatePreferences: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyProfileController],
      providers: [
        {
          provide: CompanyProfileService,
          useValue: mockCompanyProfileService,
        },
      ],
    }).compile();

    controller = module.get<CompanyProfileController>(CompanyProfileController);
    service = module.get<CompanyProfileService>(CompanyProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new company profile', async () => {
      const createDto: CreateCompanyProfileDto = {
        name: 'TechCorp Inc',
        industry: 'Technology',
        size: CompanySize.MEDIUM,
        culture: ['Innovation', 'Collaboration'],
        benefits: ['Health Insurance', 'Remote Work'],
        workArrangement: WorkArrangement.HYBRID,
        location: 'San Francisco, CA',
        preferences: {
          prioritySkills: ['JavaScript', 'React'],
          dealBreakers: ['No remote work'],
          niceToHave: ['TypeScript', 'Node.js'],
        },
      };

      mockCompanyProfileService.create.mockResolvedValue(
        mockCompanyProfileResponse,
      );

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockCompanyProfileResponse);
    });
  });

  describe('findAll', () => {
    it('should return all company profiles', async () => {
      mockCompanyProfileService.findAll.mockResolvedValue([
        mockCompanyProfileResponse,
      ]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockCompanyProfileResponse]);
    });

    it('should return company profiles filtered by name', async () => {
      const name = 'TechCorp';
      mockCompanyProfileService.findByName.mockResolvedValue([
        mockCompanyProfileResponse,
      ]);

      const result = await controller.findAll(name);

      expect(service.findByName).toHaveBeenCalledWith(name);
      expect(result).toEqual([mockCompanyProfileResponse]);
    });
  });

  describe('findOne', () => {
    it('should return a company profile by id', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockCompanyProfileService.findOne.mockResolvedValue(
        mockCompanyProfileResponse,
      );

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockCompanyProfileResponse);
    });

    it('should throw NotFoundException when company profile not found', async () => {
      const id = 'non-existent-id';
      mockCompanyProfileService.findOne.mockRejectedValue(
        new NotFoundException(`CompanyProfile with ID ${id} not found`),
      );

      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a company profile', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateCompanyProfileDto = {
        name: 'Updated TechCorp Inc',
        industry: 'Software',
      };

      const updatedResponse = { ...mockCompanyProfileResponse, ...updateDto };
      mockCompanyProfileService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(id, updateDto);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(updatedResponse);
    });

    it('should throw NotFoundException when company profile not found', async () => {
      const id = 'non-existent-id';
      const updateDto: UpdateCompanyProfileDto = { name: 'Updated' };

      mockCompanyProfileService.update.mockRejectedValue(
        new NotFoundException(`CompanyProfile with ID ${id} not found`),
      );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePreferences', () => {
    it('should update company preferences', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const preferences = {
        prioritySkills: ['Vue.js', 'Angular'],
        dealBreakers: ['No benefits'],
        niceToHave: ['Docker'],
      };

      const updatedResponse = {
        ...mockCompanyProfileResponse,
        preferences,
      };
      mockCompanyProfileService.updatePreferences.mockResolvedValue(
        updatedResponse,
      );

      const result = await controller.updatePreferences(id, preferences);

      expect(service.updatePreferences).toHaveBeenCalledWith(id, preferences);
      expect(result).toEqual(updatedResponse);
    });

    it('should throw NotFoundException when company profile not found', async () => {
      const id = 'non-existent-id';
      const preferences = { prioritySkills: [] };

      mockCompanyProfileService.updatePreferences.mockRejectedValue(
        new NotFoundException(`CompanyProfile with ID ${id} not found`),
      );

      await expect(
        controller.updatePreferences(id, preferences),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a company profile', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockCompanyProfileService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException when company profile not found', async () => {
      const id = 'non-existent-id';
      mockCompanyProfileService.remove.mockRejectedValue(
        new NotFoundException(`CompanyProfile with ID ${id} not found`),
      );

      await expect(controller.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
