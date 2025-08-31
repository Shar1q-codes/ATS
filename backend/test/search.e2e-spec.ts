import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ElasticsearchService } from '@nestjs/elasticsearch';

describe('SearchController (e2e)', () => {
  let app: INestApplication;
  let elasticsearchService: jest.Mocked<ElasticsearchService>;

  const mockElasticsearchService = {
    search: jest.fn(),
    index: jest.fn(),
    indices: {
      exists: jest.fn().mockResolvedValue({ body: true }),
      create: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ElasticsearchService)
      .useValue(mockElasticsearchService)
      .compile();

    app = moduleFixture.createNestApplication();
    elasticsearchService = moduleFixture.get(ElasticsearchService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('/search (POST)', () => {
    it('should perform a search and return results', async () => {
      const mockSearchResponse = {
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
                  content: 'Experienced JavaScript developer',
                  skills: ['JavaScript', 'React'],
                },
                highlight: {
                  content: ['Experienced <mark>JavaScript</mark> developer'],
                },
              },
            ],
            total: { value: 1 },
          },
          aggregations: {
            skills: {
              buckets: [
                { key: 'JavaScript', doc_count: 5 },
                { key: 'React', doc_count: 3 },
              ],
            },
          },
        },
      };

      elasticsearchService.search.mockResolvedValue(mockSearchResponse);
      elasticsearchService.index.mockResolvedValue({ body: {} });

      // Mock JWT token for authentication
      const token = 'mock-jwt-token';

      const response = await request(app.getHttpServer())
        .post('/search')
        .set('Authorization', `Bearer ${token}`)
        .send({
          query: 'JavaScript developer',
          type: 'candidates',
          facets: ['skills'],
        })
        .expect(200);

      expect(response.body).toEqual({
        results: [
          {
            id: '1',
            type: 'candidate',
            title: 'John Doe',
            content: 'Experienced JavaScript developer',
            highlights: ['Experienced <mark>JavaScript</mark> developer'],
            score: 1.0,
            metadata: {
              name: 'John Doe',
              title: 'Software Engineer',
              content: 'Experienced JavaScript developer',
              skills: ['JavaScript', 'React'],
              index: 'candidates',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        facets: {
          skills: [
            { key: 'JavaScript', count: 5 },
            { key: 'React', count: 3 },
          ],
        },
      });

      expect(elasticsearchService.search).toHaveBeenCalledWith({
        index: ['candidates'],
        body: expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must: expect.arrayContaining([
                expect.objectContaining({
                  multi_match: expect.objectContaining({
                    query: 'JavaScript developer',
                  }),
                }),
              ]),
            }),
          }),
          aggs: expect.objectContaining({
            skills: expect.any(Object),
          }),
        }),
      });

      // Should log the search
      expect(elasticsearchService.index).toHaveBeenCalledWith({
        index: 'search_analytics',
        body: expect.objectContaining({
          query: 'JavaScript developer',
          search_type: 'candidates',
          result_count: 1,
        }),
      });
    });

    it('should apply filters correctly', async () => {
      const mockSearchResponse = {
        body: {
          hits: { hits: [], total: { value: 0 } },
          aggregations: {},
        },
      };

      elasticsearchService.search.mockResolvedValue(mockSearchResponse);
      elasticsearchService.index.mockResolvedValue({ body: {} });

      const token = 'mock-jwt-token';

      await request(app.getHttpServer())
        .post('/search')
        .set('Authorization', `Bearer ${token}`)
        .send({
          query: 'developer',
          filters: {
            skills: ['JavaScript', 'React'],
            experience: { min: 2, max: 5 },
            location: ['New York', 'San Francisco'],
          },
        })
        .expect(200);

      expect(elasticsearchService.search).toHaveBeenCalledWith({
        index: ['candidates', 'jobs', 'applications', 'notes'],
        body: expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                { terms: { 'skills.keyword': ['JavaScript', 'React'] } },
                { range: { total_experience: { gte: 2, lte: 5 } } },
                {
                  terms: { 'location.keyword': ['New York', 'San Francisco'] },
                },
              ]),
            }),
          }),
        }),
      });
    });

    it('should handle pagination', async () => {
      const mockSearchResponse = {
        body: {
          hits: { hits: [], total: { value: 0 } },
          aggregations: {},
        },
      };

      elasticsearchService.search.mockResolvedValue(mockSearchResponse);
      elasticsearchService.index.mockResolvedValue({ body: {} });

      const token = 'mock-jwt-token';

      await request(app.getHttpServer())
        .post('/search')
        .set('Authorization', `Bearer ${token}`)
        .send({
          query: 'developer',
          page: 3,
          limit: 15,
        })
        .expect(200);

      expect(elasticsearchService.search).toHaveBeenCalledWith({
        index: ['candidates', 'jobs', 'applications', 'notes'],
        body: expect.objectContaining({
          from: 30, // (3 - 1) * 15
          size: 15,
        }),
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/search')
        .send({
          query: 'developer',
        })
        .expect(401);
    });
  });

  describe('/search/suggestions (GET)', () => {
    it('should return search suggestions', async () => {
      const mockSuggestResponse = {
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

      elasticsearchService.search.mockResolvedValue(mockSuggestResponse);

      const token = 'mock-jwt-token';

      const response = await request(app.getHttpServer())
        .get('/search/suggestions')
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'java' })
        .expect(200);

      expect(response.body).toEqual({
        suggestions: ['javascript developer', 'java developer'],
      });
    });

    it('should handle empty suggestions', async () => {
      const mockSuggestResponse = {
        body: {
          suggest: {
            simple_phrase: [{ options: [] }],
          },
        },
      };

      elasticsearchService.search.mockResolvedValue(mockSuggestResponse);

      const token = 'mock-jwt-token';

      const response = await request(app.getHttpServer())
        .get('/search/suggestions')
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'xyz' })
        .expect(200);

      expect(response.body).toEqual({
        suggestions: [],
      });
    });
  });

  describe('/search/analytics (GET)', () => {
    it('should return search analytics', async () => {
      const mockAnalyticsResponse = {
        body: {
          aggregations: {
            popular_queries: {
              buckets: [
                { key: 'javascript', doc_count: 10 },
                { key: 'react', doc_count: 8 },
              ],
            },
            search_types: {
              buckets: [
                { key: 'candidates', doc_count: 15 },
                { key: 'jobs', doc_count: 5 },
              ],
            },
          },
        },
      };

      elasticsearchService.search.mockResolvedValue(mockAnalyticsResponse);

      const token = 'mock-jwt-token';

      const response = await request(app.getHttpServer())
        .get('/search/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        popular_queries: {
          buckets: [
            { key: 'javascript', doc_count: 10 },
            { key: 'react', doc_count: 8 },
          ],
        },
        search_types: {
          buckets: [
            { key: 'candidates', doc_count: 15 },
            { key: 'jobs', doc_count: 5 },
          ],
        },
      });
    });
  });

  // Note: Saved search tests would require database setup and proper JWT mocking
  // These are simplified examples focusing on the search functionality
});
