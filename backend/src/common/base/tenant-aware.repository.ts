import {
  Repository,
  FindManyOptions,
  FindOneOptions,
  DeepPartial,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export interface TenantEntity {
  organizationId: string;
}

export class TenantAwareRepository<
  T extends TenantEntity,
> extends Repository<T> {
  /**
   * Adds tenant filter to find options
   */
  private addTenantFilter(
    tenantId: string,
    options?: FindManyOptions<T> | FindOneOptions<T>,
  ): FindManyOptions<T> | FindOneOptions<T> {
    if (!options) {
      options = {};
    }

    if (!options.where) {
      options.where = {};
    }

    // Add tenant filter
    if (Array.isArray(options.where)) {
      options.where = options.where.map((condition) => ({
        ...condition,
        organizationId: tenantId,
      }));
    } else {
      options.where = {
        ...options.where,
        organizationId: tenantId,
      };
    }

    return options;
  }

  /**
   * Find entities with tenant isolation
   */
  async findByTenant(
    tenantId: string,
    options?: FindManyOptions<T>,
  ): Promise<T[]> {
    const filteredOptions = this.addTenantFilter(tenantId, options);
    return this.find(filteredOptions);
  }

  /**
   * Find one entity with tenant isolation
   */
  async findOneByTenant(
    tenantId: string,
    options?: FindOneOptions<T>,
  ): Promise<T | null> {
    const filteredOptions = this.addTenantFilter(tenantId, options);
    return this.findOne(filteredOptions);
  }

  /**
   * Count entities with tenant isolation
   */
  async countByTenant(
    tenantId: string,
    options?: FindManyOptions<T>,
  ): Promise<number> {
    const filteredOptions = this.addTenantFilter(tenantId, options);
    return this.count(filteredOptions);
  }

  /**
   * Save entity with tenant validation
   */
  async saveWithTenant(tenantId: string, entity: DeepPartial<T>): Promise<T> {
    // Ensure the entity has the correct tenant ID
    (entity as any).organizationId = tenantId;
    return this.save(entity as any);
  }

  /**
   * Update entities with tenant isolation
   */
  async updateByTenant(
    tenantId: string,
    criteria: any,
    partialEntity: QueryDeepPartialEntity<T>,
  ) {
    // Add tenant filter to criteria
    if (typeof criteria === 'object' && criteria !== null) {
      criteria.organizationId = tenantId;
    }

    return this.update(criteria, partialEntity);
  }

  /**
   * Delete entities with tenant isolation
   */
  async deleteByTenant(tenantId: string, criteria: any) {
    // Add tenant filter to criteria
    if (typeof criteria === 'object' && criteria !== null) {
      criteria.organizationId = tenantId;
    }

    return this.delete(criteria);
  }

  /**
   * Create query builder with tenant filter
   */
  createTenantQueryBuilder(tenantId: string, alias?: string) {
    const qb = this.createQueryBuilder(alias);
    return qb.where(
      `${alias || this.metadata.tableName}.organization_id = :tenantId`,
      {
        tenantId,
      },
    );
  }
}
