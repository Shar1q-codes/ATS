import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { JobFamilyService } from '../job-family.service';
import { JobFamily } from '../../../entities/job-family.entity';
import { CreateJobFamilyDto } from '../../dto/create-job-family.dto';
import { UpdateJobFamilyDto } from '../../dto/update-job-family.dto';

describe('JobFamilyService', () => {
  let service: JobFamilyService;
  let repository: Repository<JobFamily>;

  const mockJobFamily = {
    id: 'job-family-id',
    name: 'Software Engineer',
    description: 'Software engineering roles',
    skillCategories: ['Programming', 'Problem Solving'],
    createdAt: new Date(),
    updatedAt: new Date(),
    baseRequirements: [],
    jobTemplates: [],
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobFamilyService,
        {
          provide: getRepositoryToken(JobFamily),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<JobFamilyService>(JobFamilyService);
    repository = module.get<Repository<JobFamily>>(
      getRepositoryToken(JobFamily),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new job family', async () => {
      const createDto: CreateJobFamilyDto = {
        name: 'Software Engineer',
        description: 'Software engineering roles',
        skillCategories: ['Programming', 'Problem Solving'],
      };

      mockRepository.create.mockReturnValue(mockJobFamily);
      mockRepository.save.mockResolvedValue(mockJobFamily);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockJobFamily);
      expect(result).toEqual({
        id: mockJobFamily.id,
        name: mockJobFamily.name,
        description: mockJobFamily.description,
        skillCategories: mockJobFamily.skillCategories,
        createdAt: mockJobFamily.createdAt,
        updatedAt: mockJobFamily.updatedAt,
        baseRequirements: mockJobFamily.baseRequirements,
      });
    });
  });

  describe('findAll', () => {
    it('should return all job families', async () => {
      const jobFamilies = [mockJobFamily];
      mockRepository.find.mockResolvedValue(jobFamilies);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: ['baseRequirements'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockJobFamily.id);
    });

    it('should return empty array when no job families exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a job family by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockJobFamily);

      const result = await service.findOne('job-family-id');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'job-family-id' },
        relations: ['baseRequirements', 'jobTemplates'],
      });
      expect(result.id).toBe(mockJobFamily.id);
    });

    it('should throw NotFoundException when job family not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('JobFamily with ID non-existent-id not found'),
      );
    });
  });

  describe('update', () => {
    it('should update a job family', async () => {
      const updateDto: UpdateJobFamilyDto = {
        name: 'Updated Software Engineer',
        description: 'Updated description',
      };

      const updatedJobFamily = { ...mockJobFamily, ...updateDto };

      mockRepository.findOne.mockResolvedValue(mockJobFamily);
      mockRepository.save.mockResolvedValue(updatedJobFamily);

      const result = await service.update('job-family-id', updateDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'job-family-id' },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockJobFamily,
        ...updateDto,
      });
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
    });

    it('should throw NotFoundException when job family not found', async () => {
      const updateDto: UpdateJobFamilyDto = { name: 'Updated Name' };
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(
        new NotFoundException('JobFamily with ID non-existent-id not found'),
      );
    });
  });

  describe('remove', () => {
    it('should remove a job family', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('job-family-id');

      expect(mockRepository.delete).toHaveBeenCalledWith('job-family-id');
    });

    it('should throw NotFoundException when job family not found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException('JobFamily with ID non-existent-id not found'),
      );
    });
  });
});
