import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { SearchService, SearchOptions } from '../services/search.service';

describe('SearchService', () => {
  let service: SearchService;
  let elasticsearchService: jest.Mocked<ElasticsearchService>;

  const mockElasticsearchService = {
    search: jest.fn(),
    indices: {
      exists: jest.fn(),
      create: jest.fn(),
    },
    index: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    elasticsearchService = module.get(ElasticsearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should perform a basic search', async () => {
      const mockResponse = {
        body: {
          hits: {
            hits: [
              {
                _id: '1',
                _index: 'candidates',
                _score: 1.0,
                _source: {
                  name: 'John Doe',
                  title: 'Software Engineer',
                  content: 'Experienced developer',
                },
                highlight: {
                  content: ['Experienced <mark>developer</mark>'],
                },
              },
            ],
            total: { value: 1 },
          },
          aggregations: {},
        },
      };

      elasticsearchService.search.mockResolvedValue(mockResponse);

      const options: SearchOptions = {
        query: 'developer',
        tenantId: 'tenant-1',
      };

      const result = await service.search(options);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('John Doe');
      expect(result.results[0].type).toBe('candidate');
      expect(result.total).toBe(1);
      expect(elasticsearchService.search).toHaveBeenCalledWith({
        index: ['candidates', 'jobs', 'applications', 'notes'],
        body: expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must: expect.arrayContaining([
                expect.objectContaining({
                  multi_match: expect.objectContaining({
                    query: 'developer',
                  }),
                }),
              ]),
              filter: expect.arrayContaining([
                { term: { tenant_id: 'tenant-1' } },
              ]),
            }),
          }),
        }),
      });
    });

    it('should apply skill filters', async () => {
      const mockResponse = {
        body: {
          hits: { hits: [], total: { value: 0 } },
          aggregations: {},
        },
      };

      elasticsearchService.search.mockResolvedValue(mockResponse);

      const options: SearchOptions = {
        query: 'developer',
        filters: {
          skills: ['JavaScript', 'React'],
        },
        tenantId: 'tenant-1',
      };

      await service.search(options);

      expect(elasticsearchService.search).toHaveBeenCalledWith({
        index: ['candidates', 'jobs', 'applications', 'notes'],
        body: expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                { term: { tenant_id: 'tenant-1' } },
                { terms: { 'skills.keyword': ['JavaScript', 'React'] } },
              ]),
            }),
          }),
        }),
      });
    });

    it('should apply experience range filters', async () => {
      const mockResponse = {
        body: {
          hits: { hits: [], total: { value: 0 } },
          aggregations: {},
        },
      };

      elasticsearchService.search.mockResolvedValue(mockResponse);

      const options: SearchOptions = {
        query: 'developer',
        filters: {
          experience: { min: 2, max: 5 },
        },
        tenantId: 'tenant-1',
      };

      await service.search(options);

      expect(elasticsearchService.search).toHaveBeenCalledWith({
        index: ['candidates', 'jobs', 'applications', 'notes'],
        body: expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                { term: { tenant_id: 'tenant-1' } },
                { range: { total_experience: { gte: 2, lte: 5 } } },
              ]),
            }),
          }),
        }),
      });
    });

    it('should handle pagination', async () => {
      const mockResponse = {
        body: {
          hits: { hits: [], total: { value: 0 } },
          aggregations: {},
        },
      };

      elasticsearchService.search.mockResolvedValue(mockResponse);

      const options: SearchOptions = {
        query: 'developer',
        page: 2,
        limit: 10,
        tenantId: 'tenant-1',
      };

      await service.search(options);

      expect(elasticsearchService.search).toHaveBeenCalledWith({
        index: ['candidates', 'jobs', 'applications', 'notes'],
        body: expect.objectContaining({
          from: 10, // (page - 1) * limit
          size: 10,
        }),
      });
    });

    it('should handle search type filtering', async () => {
      const mockResponse = {
        body: {
          hits: { hits: [], total: { value: 0 } },
          aggregations: {},
        },
      };

      elasticsearchService.search.mockResolvedValue(mockResponse);

      const options: SearchOptions = {
        query: 'developer',
        type: 'candidate',
        tenantId: 'tenant-1',
      };

      await service.search(options);

      expect(elasticsearchService.search).toHaveBeenCalledWith({
        index: ['candidates'], // Only candidates index
        body: expect.any(Object),
      });
    });

    it('should handle search errors gracefully', async () => {
      elasticsearchService.search.mockRejectedValue(
        new Error('Elasticsearch error'),
      );

      const options: SearchOptions = {
        query: 'developer',
        tenantId: 'tenant-1',
      };

      await expect(service.search(options)).rejects.toThrow(
        'Search operation failed',
      );
    });
  });

  describe('suggest', () => {
    it('should return search suggestions', async () => {
      const mockResponse = {
        body: {
          suggest: {
            simple_phrase: [
              {
                options: [
                  { text: 'javascript developer' },
                  { text: 'java developer' },
                ],
              },
            ],
          },
        },
      };

      elasticsearchService.search.mockResolvedValue(mockResponse);

      const suggestions = await service.suggest('java', 'tenant-1');

      expect(suggestions).toEqual(['javascript developer', 'java developer']);
      expect(elasticsearchService.search).toHaveBeenCalledWith({
        index: ['candidates', 'jobs', 'applications'],
        body: expect.objectContaining({
          suggest: expect.any(Object),
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: [{ term: { tenant_id: 'tenant-1' } }],
            }),
          }),
        }),
      });
    });

    it('should handle suggestion errors gracefully', async () => {
      elasticsearchService.search.mockRejectedValue(
        new Error('Elasticsearch error'),
      );

      const suggestions = await service.suggest('java', 'tenant-1');

      expect(suggestions).toEqual([]);
    });
  });

  describe('logSearch', () => {
    it('should log search analytics', async () => {
      elasticsearchService.index.mockResolvedValue({ body: {} });

      await service.logSearch(
        'developer',
        'candidates',
        10,
        'tenant-1',
        'user-1',
      );

      expect(elasticsearchService.index).toHaveBeenCalledWith({
        index: 'search_analytics',
        body: expect.objectContaining({
          query: 'developer',
          search_type: 'candidates',
          result_count: 10,
          tenant_id: 'tenant-1',
          user_id: 'user-1',
          timestamp: expect.any(Date),
        }),
      });
    });

    it('should handle logging errors gracefully', async () => {
      elasticsearchService.index.mockRejectedValue(
        new Error('Elasticsearch error'),
      );

      // Should not throw
      await expect(
        service.logSearch('developer', 'candidates', 10, 'tenant-1', 'user-1'),
      ).resolves.toBeUndefined();
    });
  });
});
