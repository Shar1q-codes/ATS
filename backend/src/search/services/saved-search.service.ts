import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedSearch, SearchFilters } from '../../entities/saved-search.entity';
import { TenantAwareService } from '../../common/base/tenant-aware.service';

export interface CreateSavedSearchDto {
  name: string;
  query: string;
  filters: SearchFilters;
  searchType: 'candidates' | 'jobs' | 'applications' | 'all';
  isShared?: boolean;
  sharedWith?: string[];
}

export interface UpdateSavedSearchDto {
  name?: string;
  query?: string;
  filters?: SearchFilters;
  searchType?: 'candidates' | 'jobs' | 'applications' | 'all';
  isShared?: boolean;
  sharedWith?: string[];
}

@Injectable()
export class SavedSearchService extends TenantAwareService<SavedSearch> {
  constructor(
    @InjectRepository(SavedSearch)
    protected readonly repository: Repository<SavedSearch>,
  ) {
    super(repository);
  }

  async create(
    createDto: CreateSavedSearchDto,
    userId: string,
    tenantId: string,
  ): Promise<SavedSearch> {
    const savedSearch = this.repository.create({
      ...createDto,
      createdById: userId,
      tenantId,
      usageCount: 0,
    });

    return this.repository.save(savedSearch);
  }

  async findAll(userId: string, tenantId: string): Promise<SavedSearch[]> {
    return this.repository.find({
      where: [
        { createdById: userId, tenantId },
        { isShared: true, tenantId },
        { sharedWith: userId, tenantId } as any,
      ],
      relations: ['createdBy'],
      order: { lastUsedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<SavedSearch> {
    const savedSearch = await this.repository.findOne({
      where: { id, tenantId },
      relations: ['createdBy'],
    });

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    // Check access permissions
    if (
      savedSearch.createdById !== userId &&
      !savedSearch.isShared &&
      !savedSearch.sharedWith.includes(userId)
    ) {
      throw new ForbiddenException('Access denied to this saved search');
    }

    return savedSearch;
  }

  async update(
    id: string,
    updateDto: UpdateSavedSearchDto,
    userId: string,
    tenantId: string,
  ): Promise<SavedSearch> {
    const savedSearch = await this.findOne(id, userId, tenantId);

    // Only the creator can update
    if (savedSearch.createdById !== userId) {
      throw new ForbiddenException(
        'Only the creator can update this saved search',
      );
    }

    Object.assign(savedSearch, updateDto);
    return this.repository.save(savedSearch);
  }

  async remove(id: string, userId: string, tenantId: string): Promise<void> {
    const savedSearch = await this.findOne(id, userId, tenantId);

    // Only the creator can delete
    if (savedSearch.createdById !== userId) {
      throw new ForbiddenException(
        'Only the creator can delete this saved search',
      );
    }

    await this.repository.remove(savedSearch);
  }

  async incrementUsage(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const savedSearch = await this.findOne(id, userId, tenantId);

    savedSearch.usageCount += 1;
    savedSearch.lastUsedAt = new Date();

    await this.repository.save(savedSearch);
  }

  async getPopularSearches(
    tenantId: string,
    limit: number = 10,
  ): Promise<SavedSearch[]> {
    return this.repository.find({
      where: { tenantId, isShared: true },
      order: { usageCount: 'DESC' },
      take: limit,
      relations: ['createdBy'],
    });
  }

  async getRecentSearches(
    userId: string,
    tenantId: string,
    limit: number = 5,
  ): Promise<SavedSearch[]> {
    return this.repository.find({
      where: { createdById: userId, tenantId },
      order: { lastUsedAt: 'DESC' },
      take: limit,
    });
  }

  async shareSearch(
    id: string,
    userIds: string[],
    userId: string,
    tenantId: string,
  ): Promise<SavedSearch> {
    const savedSearch = await this.findOne(id, userId, tenantId);

    // Only the creator can share
    if (savedSearch.createdById !== userId) {
      throw new ForbiddenException(
        'Only the creator can share this saved search',
      );
    }

    savedSearch.sharedWith = [
      ...new Set([...savedSearch.sharedWith, ...userIds]),
    ];
    return this.repository.save(savedSearch);
  }

  async unshareSearch(
    id: string,
    userIds: string[],
    userId: string,
    tenantId: string,
  ): Promise<SavedSearch> {
    const savedSearch = await this.findOne(id, userId, tenantId);

    // Only the creator can unshare
    if (savedSearch.createdById !== userId) {
      throw new ForbiddenException(
        'Only the creator can unshare this saved search',
      );
    }

    savedSearch.sharedWith = savedSearch.sharedWith.filter(
      (sharedUserId) => !userIds.includes(sharedUserId),
    );
    return this.repository.save(savedSearch);
  }

  async duplicateSearch(
    id: string,
    newName: string,
    userId: string,
    tenantId: string,
  ): Promise<SavedSearch> {
    const originalSearch = await this.findOne(id, userId, tenantId);

    const duplicatedSearch = this.repository.create({
      name: newName,
      query: originalSearch.query,
      filters: originalSearch.filters,
      searchType: originalSearch.searchType,
      isShared: false,
      sharedWith: [],
      createdById: userId,
      tenantId,
      usageCount: 0,
    });

    return this.repository.save(duplicatedSearch);
  }
}
