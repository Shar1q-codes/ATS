import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  SavedSearchService,
  CreateSavedSearchDto,
} from '../services/saved-search.service';
import { SavedSearch } from '../../entities/saved-search.entity';

describe('SavedSearchService', () => {
  let service: SavedSearchService;
  let repository: jest.Mocked<Repository<SavedSearch>>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedSearchService,
        {
          provide: getRepositoryToken(SavedSearch),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SavedSearchService>(SavedSearchService);
    repository = module.get(getRepositoryToken(SavedSearch));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a saved search', async () => {
      const createDto: CreateSavedSearchDto = {
        name: 'JavaScript Developers',
        query: 'JavaScript developer',
        filters: { skills: ['JavaScript'] },
        searchType: 'candidates',
      };

      const mockSavedSearch = {
        id: '1',
        ...createDto,
        createdById: 'user-1',
        tenantId: 'tenant-1',
        usageCount: 0,
      };

      repository.create.mockReturnValue(mockSavedSearch as any);
      repository.save.mockResolvedValue(mockSavedSearch as any);

      const result = await service.create(createDto, 'user-1', 'tenant-1');

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        createdById: 'user-1',
        tenantId: 'tenant-1',
        usageCount: 0,
      });
      expect(repository.save).toHaveBeenCalledWith(mockSavedSearch);
      expect(result).toEqual(mockSavedSearch);
    });
  });

  describe('findAll', () => {
    it('should return all accessible saved searches', async () => {
      const mockSavedSearches = [
        { id: '1', name: 'My Search', createdById: 'user-1' },
        { id: '2', name: 'Shared Search', isShared: true },
        { id: '3', name: 'Shared with Me', sharedWith: ['user-1'] },
      ];

      repository.find.mockResolvedValue(mockSavedSearches as any);

      const result = await service.findAll('user-1', 'tenant-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: [
          { createdById: 'user-1', tenantId: 'tenant-1' },
          { isShared: true, tenantId: 'tenant-1' },
          { sharedWith: 'user-1', tenantId: 'tenant-1' },
        ],
        relations: ['createdBy'],
        order: { lastUsedAt: 'DESC', createdAt: 'DESC' },
      });
      expect(result).toEqual(mockSavedSearches);
    });
  });

  describe('findOne', () => {
    it('should return a saved search if user has access', async () => {
      const mockSavedSearch = {
        id: '1',
        name: 'My Search',
        createdById: 'user-1',
        tenantId: 'tenant-1',
      };

      repository.findOne.mockResolvedValue(mockSavedSearch as any);

      const result = await service.findOne('1', 'user-1', 'tenant-1');

      expect(result).toEqual(mockSavedSearch);
    });

    it('should throw NotFoundException if saved search not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1', 'user-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user has no access', async () => {
      const mockSavedSearch = {
        id: '1',
        name: 'Private Search',
        createdById: 'user-2',
        tenantId: 'tenant-1',
        isShared: false,
        sharedWith: [],
      };

      repository.findOne.mockResolvedValue(mockSavedSearch as any);

      await expect(service.findOne('1', 'user-1', 'tenant-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow access to shared searches', async () => {
      const mockSavedSearch = {
        id: '1',
        name: 'Shared Search',
        createdById: 'user-2',
        tenantId: 'tenant-1',
        isShared: true,
        sharedWith: [],
      };

      repository.findOne.mockResolvedValue(mockSavedSearch as any);

      const result = await service.findOne('1', 'user-1', 'tenant-1');

      expect(result).toEqual(mockSavedSearch);
    });

    it('should allow access to searches shared with user', async () => {
      const mockSavedSearch = {
        id: '1',
        name: 'Shared with Me',
        createdById: 'user-2',
        tenantId: 'tenant-1',
        isShared: false,
        sharedWith: ['user-1'],
      };

      repository.findOne.mockResolvedValue(mockSavedSearch as any);

      const result = await service.findOne('1', 'user-1', 'tenant-1');

      expect(result).toEqual(mockSavedSearch);
    });
  });

  describe('update', () => {
    it('should update a saved search if user is the creator', async () => {
      const mockSavedSearch = {
        id: '1',
        name: 'My Search',
        createdById: 'user-1',
        tenantId: 'tenant-1',
      };

      const updateDto = { name: 'Updated Search' };

      repository.findOne.mockResolvedValue(mockSavedSearch as any);
      repository.save.mockResolvedValue({
        ...mockSavedSearch,
        ...updateDto,
      } as any);

      const result = await service.update('1', updateDto, 'user-1', 'tenant-1');

      expect(result.name).toBe('Updated Search');
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not the creator', async () => {
      const mockSavedSearch = {
        id: '1',
        name: 'Other User Search',
        createdById: 'user-2',
        tenantId: 'tenant-1',
        isShared: true,
        sharedWith: [],
      };

      repository.findOne.mockResolvedValue(mockSavedSearch as any);

      await expect(
        service.update('1', { name: 'Updated' }, 'user-1', 'tenant-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove a saved search if user is the creator', async () => {
      const mockSavedSearch = {
        id: '1',
        name: 'My Search',
        createdById: 'user-1',
        tenantId: 'tenant-1',
      };

      repository.findOne.mockResolvedValue(mockSavedSearch as any);

      await service.remove('1', 'user-1', 'tenant-1');

      expect(repository.remove).toHaveBeenCalledWith(mockSavedSearch);
    });

    it('should throw ForbiddenException if user is not the creator', async () => {
      const mockSavedSearch = {
        id: '1',
        name: 'Other User Search',
        createdById: 'user-2',
        tenantId: 'tenant-1',
        isShared: true,
        sharedWith: [],
      };

      repository.findOne.mockResolvedValue(mockSavedSearch as any);

      await expect(service.remove('1', 'user-1', 'tenant-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage count and update last used date', async () => {
      const mockSavedSearch = {
        id: '1',
        name: 'My Search',
        createdById: 'user-1',
        tenantId: 'tenant-1',
        usageCount: 5,
      };

      repository.findOne.mockResolvedValue(mockSavedSearch as any);
      repository.save.mockResolvedValue(mockSavedSearch as any);

      await service.incrementUsage('1', 'user-1', 'tenant-1');

      expect(mockSavedSearch.usageCount).toBe(6);
      expect(mockSavedSearch.lastUsedAt).toBeInstanceOf(Date);
      expect(repository.save).toHaveBeenCalledWith(mockSavedSearch);
    });
  });

  describe('shareSearch', () => {
    it('should share a search with specified users', async () => {
      const mockSavedSearch = {
        id: '1',
        name: 'My Search',
        createdById: 'user-1',
        tenantId: 'tenant-1',
        sharedWith: [],
      };

      repository.findOne.mockResolvedValue(mockSavedSearch as any);
      repository.save.mockResolvedValue(mockSavedSearch as any);

      await service.shareSearch(
        '1',
        ['user-2', 'user-3'],
        'user-1',
        'tenant-1',
      );

      expect(mockSavedSearch.sharedWith).toEqual(['user-2', 'user-3']);
      expect(repository.save).toHaveBeenCalledWith(mockSavedSearch);
    });

    it('should not duplicate users in sharedWith array', async () => {
      const mockSavedSearch = {
        id: '1',
        name: 'My Search',
        createdById: 'user-1',
        tenantId: 'tenant-1',
        sharedWith: ['user-2'],
      };

      repository.findOne.mockResolvedValue(mockSavedSearch as any);
      repository.save.mockResolvedValue(mockSavedSearch as any);

      await service.shareSearch(
        '1',
        ['user-2', 'user-3'],
        'user-1',
        'tenant-1',
      );

      expect(mockSavedSearch.sharedWith).toEqual(['user-2', 'user-3']);
    });
  });

  describe('duplicateSearch', () => {
    it('should create a duplicate of an existing search', async () => {
      const originalSearch = {
        id: '1',
        name: 'Original Search',
        query: 'developer',
        filters: { skills: ['JavaScript'] },
        searchType: 'candidates',
        createdById: 'user-2',
        tenantId: 'tenant-1',
        isShared: true,
        sharedWith: [],
      };

      const duplicatedSearch = {
        id: '2',
        name: 'My Copy of Original Search',
        query: 'developer',
        filters: { skills: ['JavaScript'] },
        searchType: 'candidates',
        createdById: 'user-1',
        tenantId: 'tenant-1',
        isShared: false,
        sharedWith: [],
        usageCount: 0,
      };

      repository.findOne.mockResolvedValue(originalSearch as any);
      repository.create.mockReturnValue(duplicatedSearch as any);
      repository.save.mockResolvedValue(duplicatedSearch as any);

      const result = await service.duplicateSearch(
        '1',
        'My Copy of Original Search',
        'user-1',
        'tenant-1',
      );

      expect(repository.create).toHaveBeenCalledWith({
        name: 'My Copy of Original Search',
        query: 'developer',
        filters: { skills: ['JavaScript'] },
        searchType: 'candidates',
        isShared: false,
        sharedWith: [],
        createdById: 'user-1',
        tenantId: 'tenant-1',
        usageCount: 0,
      });
      expect(result).toEqual(duplicatedSearch);
    });
  });
});
