import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { BaseService } from '../base.service';

// Mock entity for testing
class TestEntity {
  id: string;
  name: string;
}

// Test service extending BaseService
class TestService extends BaseService<TestEntity> {
  constructor(repository: Repository<TestEntity>) {
    super(repository);
  }
}

describe('BaseService', () => {
  let service: TestService;
  let repository: Repository<TestEntity>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    merge: jest.fn(),
  };

  const mockEntity = {
    id: 'test-id',
    name: 'Test Entity',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestService,
        {
          provide: 'TestEntityRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = new TestService(mockRepository as any);
    repository = mockRepository as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return array of entities', async () => {
      const entities = [mockEntity];
      mockRepository.find.mockResolvedValue(entities);

      const result = await service.findAll();

      expect(result).toEqual(entities);
      expect(mockRepository.find).toHaveBeenCalledWith(undefined);
    });

    it('should pass options to repository', async () => {
      const options = { where: { name: 'test' } };
      mockRepository.find.mockResolvedValue([]);

      await service.findAll(options);

      expect(mockRepository.find).toHaveBeenCalledWith(options);
    });
  });

  describe('findOne', () => {
    it('should return entity when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockEntity);

      const result = await service.findOne({ id: 'test-id' });

      expect(result).toEqual(mockEntity);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        relations: undefined,
      });
    });

    it('should return null when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne({ id: 'non-existent' });

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockEntity);

      const result = await service.findById('test-id');

      expect(result).toEqual(mockEntity);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        relations: undefined,
      });
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and save entity', async () => {
      const createDto = { name: 'New Entity' };
      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      const result = await service.create(createDto);

      expect(result).toEqual(mockEntity);
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockEntity);
    });
  });

  describe('update', () => {
    it('should update and save entity', async () => {
      const updateDto = { name: 'Updated Entity' };
      const updatedEntity = { ...mockEntity, ...updateDto };

      mockRepository.findOne.mockResolvedValue(mockEntity);
      mockRepository.merge.mockReturnValue(updatedEntity);
      mockRepository.save.mockResolvedValue(updatedEntity);

      const result = await service.update('test-id', updateDto);

      expect(result).toEqual(updatedEntity);
      expect(mockRepository.merge).toHaveBeenCalledWith(mockEntity, updateDto);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when entity not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove entity', async () => {
      mockRepository.findOne.mockResolvedValue(mockEntity);
      mockRepository.remove.mockResolvedValue(mockEntity);

      await service.remove('test-id');

      expect(mockRepository.remove).toHaveBeenCalledWith(mockEntity);
    });

    it('should throw NotFoundException when entity not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('count', () => {
    it('should return count of entities', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await service.count();

      expect(result).toBe(5);
      expect(mockRepository.count).toHaveBeenCalledWith({ where: undefined });
    });
  });

  describe('exists', () => {
    it('should return true when entity exists', async () => {
      mockRepository.count.mockResolvedValue(1);

      const result = await service.exists({ id: 'test-id' });

      expect(result).toBe(true);
    });

    it('should return false when entity does not exist', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await service.exists({ id: 'non-existent' });

      expect(result).toBe(false);
    });
  });
});
