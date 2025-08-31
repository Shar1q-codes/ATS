import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../tenant-aware.service';
import {
  TenantAwareRepository,
  TenantEntity,
} from '../tenant-aware.repository';

// Mock entity for testing
interface TestEntity extends TenantEntity {
  id: string;
  name: string;
  organizationId: string;
}

class TestService extends TenantAwareService<TestEntity> {
  constructor(repository: TenantAwareRepository<TestEntity>) {
    super(repository);
  }
}

describe('TenantAwareService', () => {
  let service: TestService;
  let repository: jest.Mocked<TenantAwareRepository<TestEntity>>;

  const mockEntity: TestEntity = {
    id: '1',
    name: 'Test Entity',
    organizationId: 'tenant-1',
  };

  const mockTenantId = 'tenant-1';
  const mockOtherTenantId = 'tenant-2';

  beforeEach(() => {
    const mockRepository = {
      findByTenant: jest.fn(),
      findOneByTenant: jest.fn(),
      saveWithTenant: jest.fn(),
      updateByTenant: jest.fn(),
      deleteByTenant: jest.fn(),
      countByTenant: jest.fn(),
    };

    service = new TestService(mockRepository as any);
    repository = mockRepository as any;
  });

  describe('findAll', () => {
    it('should return entities for the correct tenant', async () => {
      const mockEntities = [mockEntity];
      repository.findByTenant.mockResolvedValue(mockEntities);

      const result = await service.findAll(mockTenantId);

      expect(repository.findByTenant).toHaveBeenCalledWith(
        mockTenantId,
        undefined,
      );
      expect(result).toEqual(mockEntities);
    });

    it('should pass options to repository', async () => {
      const options = { order: { name: 'ASC' } };
      repository.findByTenant.mockResolvedValue([]);

      await service.findAll(mockTenantId, options);

      expect(repository.findByTenant).toHaveBeenCalledWith(
        mockTenantId,
        options,
      );
    });
  });

  describe('findOne', () => {
    it('should return entity when found', async () => {
      repository.findOneByTenant.mockResolvedValue(mockEntity);

      const result = await service.findOne(mockTenantId, '1');

      expect(repository.findOneByTenant).toHaveBeenCalledWith(mockTenantId, {
        where: { id: '1' },
      });
      expect(result).toEqual(mockEntity);
    });

    it('should throw NotFoundException when entity not found', async () => {
      repository.findOneByTenant.mockResolvedValue(null);

      await expect(service.findOne(mockTenantId, '1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create entity with tenant association', async () => {
      const createDto = { name: 'New Entity' };
      repository.saveWithTenant.mockResolvedValue(mockEntity);

      const result = await service.create(mockTenantId, createDto);

      expect(repository.saveWithTenant).toHaveBeenCalledWith(
        mockTenantId,
        createDto,
      );
      expect(result).toEqual(mockEntity);
    });
  });

  describe('update', () => {
    it('should update entity when it belongs to tenant', async () => {
      const updateDto = { name: 'Updated Entity' };
      repository.findOneByTenant.mockResolvedValue(mockEntity);
      repository.updateByTenant.mockResolvedValue(undefined);
      repository.findOneByTenant
        .mockResolvedValueOnce(mockEntity)
        .mockResolvedValueOnce({
          ...mockEntity,
          ...updateDto,
        });

      const result = await service.update(mockTenantId, '1', updateDto);

      expect(repository.findOneByTenant).toHaveBeenCalledWith(mockTenantId, {
        where: { id: '1' },
      });
      expect(repository.updateByTenant).toHaveBeenCalledWith(
        mockTenantId,
        { id: '1' },
        updateDto,
      );
      expect(result).toEqual({ ...mockEntity, ...updateDto });
    });

    it('should throw NotFoundException when entity not found', async () => {
      repository.findOneByTenant.mockResolvedValue(null);

      await expect(
        service.update(mockTenantId, '1', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove entity when it belongs to tenant', async () => {
      repository.findOneByTenant.mockResolvedValue(mockEntity);
      repository.deleteByTenant.mockResolvedValue(undefined);

      await service.remove(mockTenantId, '1');

      expect(repository.findOneByTenant).toHaveBeenCalledWith(mockTenantId, {
        where: { id: '1' },
      });
      expect(repository.deleteByTenant).toHaveBeenCalledWith(mockTenantId, {
        id: '1',
      });
    });

    it('should throw NotFoundException when entity not found', async () => {
      repository.findOneByTenant.mockResolvedValue(null);

      await expect(service.remove(mockTenantId, '1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('count', () => {
    it('should return count for tenant', async () => {
      repository.countByTenant.mockResolvedValue(5);

      const result = await service.count(mockTenantId);

      expect(repository.countByTenant).toHaveBeenCalledWith(
        mockTenantId,
        undefined,
      );
      expect(result).toBe(5);
    });
  });

  describe('findWithPagination', () => {
    it('should return paginated results', async () => {
      const mockEntities = [mockEntity];
      repository.findByTenant.mockResolvedValue(mockEntities);
      repository.countByTenant.mockResolvedValue(1);

      const result = await service.findWithPagination(mockTenantId, 1, 10);

      expect(repository.findByTenant).toHaveBeenCalledWith(mockTenantId, {
        skip: 0,
        take: 10,
      });
      expect(repository.countByTenant).toHaveBeenCalledWith(
        mockTenantId,
        undefined,
      );
      expect(result).toEqual({
        data: mockEntities,
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('validateTenantAccess', () => {
    it('should not throw when entity belongs to tenant', () => {
      expect(() => {
        (service as any).validateTenantAccess(mockEntity, mockTenantId);
      }).not.toThrow();
    });

    it('should throw ForbiddenException when entity belongs to different tenant', () => {
      expect(() => {
        (service as any).validateTenantAccess(mockEntity, mockOtherTenantId);
      }).toThrow(ForbiddenException);
    });
  });
});
