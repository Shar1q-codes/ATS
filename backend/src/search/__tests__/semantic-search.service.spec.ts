import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import {
  SemanticSearchService,
  SemanticSearchOptions,
} from '../services/semantic-search.service';
import { Candidate } from '../../entities/candidate.entity';
import { JobFamily } from '../../entities/job-family.entity';
import { Application } from '../../entities/application.entity';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      embeddings: {
        create: jest.fn(),
      },
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('SemanticSearchService', () => {
  let service: SemanticSearchService;
  let elasticsearchService: jest.Mocked<ElasticsearchService>;
  let candidateRepository: jest.Mocked<Repository<Candidate>>;
  let configService: jest.Mocked<ConfigService>;

  const mockElasticsearchService = {
    search: jest.fn(),
    index: jest.fn(),
  };

  const mockCandidateRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJobFamilyRepository = {
    find: jest.fn(),
  };

  const mockApplicationRepository = {
    find: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-api-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticSearchService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
        {
          provide: getRepositoryToken(Candidate),
          useValue: mockCandidateRepository,
        },
        {
          provide: getRepositoryToken(JobFamily),
          useValue: mockJobFamilyRepository,
        },
        {
          provide: getRepositoryToken(Application),
          useValue: mockApplicationRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SemanticSearchService>(SemanticSearchService);
    elasticsearchService = module.get(ElasticsearchService);
    candidateRepository = module.get(getRepositoryToken(Candidate));
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('semanticSearch', () => {
    it('should perform semantic search and return results', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const mockSearchResponse = {
        body: {
          hits: {
            hits: [
              {
                _id: '1',
                _index: 'candidates',
                _score: 1.8,
                _source: {
                  name: 'John Doe',
                  title: 'Software Engineer',
                  content: 'Experienced JavaScript developer',
                  skills: ['JavaScript', 'React'],
                },
              },
            ],
          },
        },
      };

      // Mock OpenAI embedding generation
      const mockOpenAI = require('openai').OpenAI;
      const mockInstance = new mockOpenAI();
      mockInstance.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });

      elasticsearchService.search.mockResolvedValue(mockSearchResponse);

      const options: SemanticSearchOptions = {
        query: 'JavaScript developer',
        type: 'candidates',
        tenantId: 'tenant-1',
        limit: 10,
        threshold: 0.7,
      };

      const results = await service.semanticSearch(options);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
      expect(results[0].type).toBe('candidate');
      expect(results[0].title).toBe('John Doe');
      expect(results[0].similarity).toBe(0.8); // _score - 1.0
    });

    it('should include explanations when requested', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const mockSearchResponse = {
        body: {
          hits: {
            hits: [
              {
                _id: '1',
                _index: 'candidates',
                _score: 1.8,
                _source: {
                  name: 'John Doe',
                  title: 'Software Engineer',
                  content: 'Experienced JavaScript developer',
                },
              },
            ],
          },
        },
      };

      const mockOpenAI = require('openai').OpenAI;
      const mockInstance = new mockOpenAI();
      mockInstance.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });
      mockInstance.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content:
                'This candidate matches because they have JavaScript experience.',
            },
          },
        ],
      });

      elasticsearchService.search.mockResolvedValue(mockSearchResponse);

      const options: SemanticSearchOptions = {
        query: 'JavaScript developer',
        type: 'candidates',
        tenantId: 'tenant-1',
        includeExplanation: true,
      };

      const results = await service.semanticSearch(options);

      expect(results[0].explanation).toBe(
        'This candidate matches because they have JavaScript experience.',
      );
    });

    it('should handle search errors gracefully', async () => {
      const mockOpenAI = require('openai').OpenAI;
      const mockInstance = new mockOpenAI();
      mockInstance.embeddings.create.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      const options: SemanticSearchOptions = {
        query: 'JavaScript developer',
        type: 'candidates',
        tenantId: 'tenant-1',
      };

      await expect(service.semanticSearch(options)).rejects.toThrow(
        'Semantic search operation failed',
      );
    });
  });

  describe('recommendCandidates', () => {
    it('should recommend candidates based on job requirements', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const mockCandidate = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        parsedData: {
          skills: [{ name: 'JavaScript' }, { name: 'React' }],
        },
      };

      const mockSearchResponse = {
        body: {
          hits: {
            hits: [
              {
                _id: '1',
                _score: 1.8,
                _source: { id: '1' },
              },
            ],
          },
        },
      };

      const mockOpenAI = require('openai').OpenAI;
      const mockInstance = new mockOpenAI();
      mockInstance.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });
      mockInstance.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Strong match with JavaScript and React skills.',
            },
          },
        ],
      });

      elasticsearchService.search.mockResolvedValue(mockSearchResponse);
      candidateRepository.find.mockResolvedValue([mockCandidate as any]);

      const recommendations = await service.recommendCandidates(
        ['JavaScript', 'React'],
        'tenant-1',
        5,
      );

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].candidate.id).toBe('1');
      expect(recommendations[0].fitScore).toBeGreaterThan(0);
      expect(recommendations[0].explanation).toBe(
        'Strong match with JavaScript and React skills.',
      );
    });

    it('should filter out candidates with low fit scores', async () => {
      const mockEmbedding = new Array(1536).fill(0.01); // Low similarity
      const mockCandidate = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        parsedData: {
          skills: [{ name: 'PHP' }], // Different skill
        },
      };

      const mockSearchResponse = {
        body: {
          hits: {
            hits: [
              {
                _id: '1',
                _score: 1.2, // Low score
                _source: { id: '1' },
              },
            ],
          },
        },
      };

      const mockOpenAI = require('openai').OpenAI;
      const mockInstance = new mockOpenAI();
      mockInstance.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });

      elasticsearchService.search.mockResolvedValue(mockSearchResponse);
      candidateRepository.find.mockResolvedValue([mockCandidate as any]);

      const recommendations = await service.recommendCandidates(
        ['JavaScript', 'React'],
        'tenant-1',
        5,
      );

      // Should filter out low-scoring candidates
      expect(recommendations).toHaveLength(0);
    });
  });

  describe('expandQuery', () => {
    it('should expand search query with related terms', async () => {
      const mockOpenAI = require('openai').OpenAI;
      const mockInstance = new mockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([
                'JavaScript developer',
                'Frontend engineer',
                'React developer',
                'Node.js developer',
                'Full stack developer',
              ]),
            },
          },
        ],
      });

      const expandedTerms = await service.expandQuery('JavaScript');

      expect(expandedTerms).toHaveLength(5);
      expect(expandedTerms).toContain('JavaScript developer');
      expect(expandedTerms).toContain('React developer');
    });

    it('should handle expansion errors gracefully', async () => {
      const mockOpenAI = require('openai').OpenAI;
      const mockInstance = new mockOpenAI();
      mockInstance.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      const expandedTerms = await service.expandQuery('JavaScript');

      expect(expandedTerms).toEqual([]);
    });

    it('should handle invalid JSON responses', async () => {
      const mockOpenAI = require('openai').OpenAI;
      const mockInstance = new mockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      });

      const expandedTerms = await service.expandQuery('JavaScript');

      expect(expandedTerms).toEqual([]);
    });
  });

  describe('suggestSkills', () => {
    it('should suggest relevant skills for career development', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const mockJobMarketData = {
        skillDemand: {
          TypeScript: 50,
          'Node.js': 40,
          Docker: 30,
        },
        relatedSkills: {
          TypeScript: ['JavaScript', 'React'],
          'Node.js': ['JavaScript', 'Express'],
          Docker: ['Kubernetes', 'DevOps'],
        },
      };

      const mockOpenAI = require('openai').OpenAI;
      const mockInstance = new mockOpenAI();
      mockInstance.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });

      // Mock the job market data retrieval
      elasticsearchService.search.mockResolvedValue({
        body: {
          aggregations: {
            skill_demand: {
              buckets: [
                { key: 'TypeScript', doc_count: 50 },
                { key: 'Node.js', doc_count: 40 },
                { key: 'Docker', doc_count: 30 },
              ],
            },
          },
        },
      });

      const suggestions = await service.suggestSkills(
        ['JavaScript', 'React'],
        'Full Stack Developer',
        'tenant-1',
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('skill');
      expect(suggestions[0]).toHaveProperty('relevance');
      expect(suggestions[0]).toHaveProperty('jobDemand');
    });
  });

  describe('optimizeSearchRanking', () => {
    it('should optimize search results based on user behavior', async () => {
      const mockSearchResults = [
        {
          id: '1',
          score: 0.8,
          type: 'candidate',
          metadata: { engagement_score: 0.9 },
        },
        {
          id: '2',
          score: 0.9,
          type: 'job',
          metadata: { engagement_score: 0.5 },
        },
      ];

      const mockUserBehavior = {
        userId: 'user-1',
      };

      const mockInteractionData = {
        search_types: {
          buckets: [{ key: 'candidate', doc_count: 10 }],
        },
      };

      elasticsearchService.search.mockResolvedValue({
        body: { aggregations: mockInteractionData },
      });

      const optimizedResults = await service.optimizeSearchRanking(
        mockSearchResults,
        mockUserBehavior,
        'tenant-1',
      );

      expect(optimizedResults).toHaveLength(2);
      expect(optimizedResults[0]).toHaveProperty('adjustedScore');
      // Candidate should be boosted due to user preference
      expect(optimizedResults[0].type).toBe('candidate');
    });
  });
});
