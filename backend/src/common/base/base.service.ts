import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  ObjectLiteral,
  DeepPartial,
} from 'typeorm';
import { NotFoundException } from '@nestjs/common';

export abstract class BaseService<T extends ObjectLiteral> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  async findOne(
    where: FindOptionsWhere<T>,
    relations?: string[],
  ): Promise<T | null> {
    return this.repository.findOne({
      where,
      relations,
    });
  }

  async findById(id: string, relations?: string[]): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id } as any,
      relations,
    });

    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }

    return entity;
  }

  async create(createDto: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(createDto);
    return this.repository.save(entity);
  }

  async update(id: string, updateDto: DeepPartial<T>): Promise<T> {
    const entity = await this.findById(id);
    this.repository.merge(entity, updateDto);
    return this.repository.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findById(id);
    await this.repository.remove(entity as any);
  }

  async count(where?: FindOptionsWhere<T>): Promise<number> {
    return this.repository.count({ where });
  }

  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }
}
