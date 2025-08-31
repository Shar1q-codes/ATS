import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JobFamilyController } from '../job-family.controller';
import { JobFamilyService } from '../../services/job-family.service';
import { CreateJobFamilyDto } from '../../dto/create-job-family.dto';
import { UpdateJobFamilyDto } from '../../dto/update-job-family.dto';
import { JobFamilyResponseDto } from '../../dto/job-family-response.dto';

describe('JobFamilyController', () => {
  let controller: JobFamilyController;
  let service: JobFamilyService;

  const mockJobFamilyResponse: JobFamilyResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Software Engineer',
    description: 'Software development roles',
    skillCategories: ['Programming', 'Problem Solving'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    baseRequirements: [],
  };

  const mockJobFamilyService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobFamilyController],
      providers: [
        {
          provide: JobFamilyService,
          useValue: mockJobFamilyService,
        },
      ],
    }).compile();

    controller = module.get<JobFamilyController>(JobFamilyController);
    service = module.get<JobFamilyService>(JobFamilyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new job family', async () => {
      const createDto: CreateJobFamilyDto = {
        name: 'Software Engineer',
        description: 'Software development roles',
        skillCategories: ['Programming', 'Problem Solving'],
      };

      mockJobFamilyService.create.mockResolvedValue(mockJobFamilyResponse);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockJobFamilyResponse);
    });
  });

  describe('findAll', () => {
    it('should return all job families', async () => {
      mockJobFamilyService.findAll.mockResolvedValue([mockJobFamilyResponse]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockJobFamilyResponse]);
    });
  });

  describe('findOne', () => {
    it('should return a job family by id', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockJobFamilyService.findOne.mockResolvedValue(mockJobFamilyResponse);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockJobFamilyResponse);
    });

    it('should throw NotFoundException when job family not found', async () => {
      const id = 'non-existent-id';
      mockJobFamilyService.findOne.mockRejectedValue(
        new NotFoundException(`JobFamily with ID ${id} not found`),
      );

      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a job family', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateJobFamilyDto = {
        name: 'Updated Software Engineer',
      };

      const updatedResponse = { ...mockJobFamilyResponse, ...updateDto };
      mockJobFamilyService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(id, updateDto);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(updatedResponse);
    });

    it('should throw NotFoundException when job family not found', async () => {
      const id = 'non-existent-id';
      const updateDto: UpdateJobFamilyDto = { name: 'Updated' };

      mockJobFamilyService.update.mockRejectedValue(
        new NotFoundException(`JobFamily with ID ${id} not found`),
      );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a job family', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockJobFamilyService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException when job family not found', async () => {
      const id = 'non-existent-id';
      mockJobFamilyService.remove.mockRejectedValue(
        new NotFoundException(`JobFamily with ID ${id} not found`),
      );

      await expect(controller.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
