import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CompanyProfileService } from '../company-profile.service';
import {
  CompanyProfile,
  CompanySize,
  WorkArrangement,
} from '../../../entities/company-profile.entity';
import { CreateCompanyProfileDto } from '../../dto/create-company-profile.dto';
import { UpdateCompanyProfileDto } from '../../dto/update-company-profile.dto';

describe('CompanyProfileService', () => {
  let service: CompanyProfileService;
  let repository: Repository<CompanyProfile>;

  const mockCompanyProfile = {
    id: 'company-profile-id',
    name: 'TechCorp',
    industry: 'Technology',
    size: CompanySize.MEDIUM,
    culture: ['Innovation', 'Collaboration'],
    benefits: ['Health Insurance', 'Remote Work'],
    workArrangement: WorkArrangement.HYBRID,
    location: 'San Francisco, CA',
    preferences: {
      prioritySkills: ['JavaScript', 'React'],
      dealBreakers: ['No experience'],
      niceToHave: ['TypeScript'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    jobVariants: [],
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyProfileService,
        {
          provide: getRepositoryToken(CompanyProfile),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CompanyProfileService>(CompanyProfileService);
    repository = module.get<Repository<CompanyProfile>>(
      getRepositoryToken(CompanyProfile),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new company profile', async () => {
      const createDto: CreateCompanyProfileDto = {
        name: 'TechCorp',
        industry: 'Technology',
        size: CompanySize.MEDIUM,
        culture: ['Innovation', 'Collaboration'],
        benefits: ['Health Insurance', 'Remote Work'],
        workArrangement: WorkArrangement.HYBRID,
        location: 'San Francisco, CA',
        preferences: {
          prioritySkills: ['JavaScript', 'React'],
          dealBreakers: ['No experience'],
          niceToHave: ['TypeScript'],
        },
      };

      mockRepository.create.mockReturnValue(mockCompanyProfile);
      mockRepository.save.mockResolvedValue(mockCompanyProfile);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockCompanyProfile);
      expect(result).toEqual({
        id: mockCompanyProfile.id,
        name: mockCompanyProfile.name,
        industry: mockCompanyProfile.industry,
        size: mockCompanyProfile.size,
        culture: mockCompanyProfile.culture,
        benefits: mockCompanyProfile.benefits,
        workArrangement: mockCompanyProfile.workArrangement,
        location: mockCompanyProfile.location,
        preferences: mockCompanyProfile.preferences,
        createdAt: mockCompanyProfile.createdAt,
        updatedAt: mockCompanyProfile.updatedAt,
      });
    });
  });

  describe('findAll', () => {
    it('should return all company profiles', async () => {
      const companyProfiles = [mockCompanyProfile];
      mockRepository.find.mockResolvedValue(companyProfiles);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockCompanyProfile.id);
    });

    it('should return empty array when no company profiles exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a company profile by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockCompanyProfile);

      const result = await service.findOne('company-profile-id');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'company-profile-id' },
        relations: ['jobVariants'],
      });
      expect(result.id).toBe(mockCompanyProfile.id);
    });

    it('should throw NotFoundException when company profile not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'CompanyProfile with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('findByName', () => {
    it('should return company profiles matching name', async () => {
      const companyProfiles = [mockCompanyProfile];
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue(companyProfiles);

      const result = await service.findByName('TechCorp');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('company');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(company.name) LIKE LOWER(:name)',
        { name: '%TechCorp%' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'company.createdAt',
        'DESC',
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockCompanyProfile.id);
    });

    it('should return empty array when no matches found', async () => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findByName('NonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update a company profile', async () => {
      const updateDto: UpdateCompanyProfileDto = {
        name: 'Updated TechCorp',
        industry: 'Updated Technology',
        preferences: {
          prioritySkills: ['TypeScript', 'Node.js'],
        },
      };

      const updatedCompanyProfile = {
        ...mockCompanyProfile,
        ...updateDto,
        preferences: {
          ...mockCompanyProfile.preferences,
          ...updateDto.preferences,
        },
      };

      mockRepository.findOne.mockResolvedValue(mockCompanyProfile);
      mockRepository.save.mockResolvedValue(updatedCompanyProfile);

      const result = await service.update('company-profile-id', updateDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'company-profile-id' },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
      expect(result.preferences.prioritySkills).toEqual([
        'TypeScript',
        'Node.js',
      ]);
    });

    it('should throw NotFoundException when company profile not found', async () => {
      const updateDto: UpdateCompanyProfileDto = { name: 'Updated Name' };
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(
        new NotFoundException(
          'CompanyProfile with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('updatePreferences', () => {
    it('should update company profile preferences', async () => {
      const newPreferences = {
        prioritySkills: ['Python', 'Django'],
        dealBreakers: ['No Python experience'],
      };

      const updatedCompanyProfile = {
        ...mockCompanyProfile,
        preferences: {
          ...mockCompanyProfile.preferences,
          ...newPreferences,
        },
      };

      mockRepository.findOne.mockResolvedValue(mockCompanyProfile);
      mockRepository.save.mockResolvedValue(updatedCompanyProfile);

      const result = await service.updatePreferences(
        'company-profile-id',
        newPreferences,
      );

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.preferences.prioritySkills).toEqual(['Python', 'Django']);
      expect(result.preferences.dealBreakers).toEqual(['No Python experience']);
      expect(result.preferences.niceToHave).toEqual(['TypeScript']); // Should preserve existing
    });

    it('should throw NotFoundException when company profile not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePreferences('non-existent-id', {}),
      ).rejects.toThrow(
        new NotFoundException(
          'CompanyProfile with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('remove', () => {
    it('should remove a company profile', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('company-profile-id');

      expect(mockRepository.delete).toHaveBeenCalledWith('company-profile-id');
    });

    it('should throw NotFoundException when company profile not found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'CompanyProfile with ID non-existent-id not found',
        ),
      );
    });
  });
});
