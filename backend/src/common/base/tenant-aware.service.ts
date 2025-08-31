import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOneOptions, DeepPartial } from 'typeorm';
import { TenantAwareRepository, TenantEntity } from './tenant-aware.repository';

export abstract class TenantAwareService<T extends TenantEntity> {
  constructor(protected readonly repository: TenantAwareRepository<T>) {}

  /**
   * Find all entities for a tenant
   */
  async findAll(tenantId: string, options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.findByTenant(tenantId, options);
  }

  /**
   * Find one entity by ID with tenant validation
   */
  async findOne(tenantId: string, id: string): Promise<T> {
    const entity = await this.repository.findOneByTenant(tenantId, {
      where: { id } as any,
    });

    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }

    return entity;
  }

  /**
   * Create a new entity with tenant association
   */
  async create(tenantId: string, createDto: DeepPartial<T>): Promise<T> {
    return this.repository.saveWithTenant(tenantId, createDto);
  }

  /**
   * Update an entity with tenant validation
   */
  async update(
    tenantId: string,
    id: string,
    updateDto: DeepPartial<T>,
  ): Promise<T> {
    // First verify the entity exists and belongs to the tenant
    const existingEntity = await this.findOne(tenantId, id);

    // Update the entity
    await this.repository.updateByTenant(tenantId, { id }, updateDto);

    // Return the updated entity
    return this.findOne(tenantId, id);
  }

  /**
   * Delete an entity with tenant validation
   */
  async remove(tenantId: string, id: string): Promise<void> {
    // First verify the entity exists and belongs to the tenant
    await this.findOne(tenantId, id);

    // Delete the entity
    await this.repository.deleteByTenant(tenantId, { id });
  }

  /**
   * Count entities for a tenant
   */
  async count(tenantId: string, options?: FindManyOptions<T>): Promise<number> {
    return this.repository.countByTenant(tenantId, options);
  }

  /**
   * Validate that an entity belongs to the specified tenant
   */
  protected validateTenantAccess(entity: T, tenantId: string): void {
    if (entity.organizationId !== tenantId) {
      throw new ForbiddenException(
        'Access denied: Entity does not belong to your organization',
      );
    }
  }

  /**
   * Find entities with pagination and tenant isolation
   */
  async findWithPagination(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
    options?: FindManyOptions<T>,
  ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const paginationOptions: FindManyOptions<T> = {
      ...options,
      skip,
      take: limit,
    };

    const [data, total] = await Promise.all([
      this.repository.findByTenant(tenantId, paginationOptions),
      this.repository.countByTenant(tenantId, options),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
