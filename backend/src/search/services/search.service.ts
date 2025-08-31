import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import {
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';

export interface SearchResult {
  id: string;
  type: 'candidate' | 'job' | 'application' | 'note';
  title: string;
  content: string;
  highlights: string[];
  score: number;
  metadata: Record<string, any>;
}

export interface SearchOptions {
  query: string;
  filters?: Record<string, any>;
  type?: 'candidate' | 'job' | 'application' | 'note' | 'all';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  facets?: string[];
  tenantId: string;
}

export interface SearchResults {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  facets?: Record<string, any>;
  suggestions?: string[];
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async search(options: SearchOptions): Promise<SearchResults> {
    try {
      const {
        query,
        filters = {},
        type = 'all',
        page = 1,
        limit = 20,
        sortBy = '_score',
        sortOrder = 'desc',
        facets = [],
        tenantId,
      } = options;

      const indices = this.getIndicesForType(type);
      const searchRequest: SearchRequest = {
        index: indices,
        body: {
          query: this.buildQuery(query, filters, tenantId),
          highlight: {
            fields: {
              '*': {
                pre_tags: ['<mark>'],
                post_tags: ['</mark>'],
                fragment_size: 150,
                number_of_fragments: 3,
              },
            },
          },
          sort: this.buildSort(sortBy, sortOrder),
          from: (page - 1) * limit,
          size: limit,
          aggs: this.buildAggregations(facets),
        },
      };

      const response = await this.elasticsearchService.search(searchRequest);

      return this.formatSearchResults(response, page, limit);
    } catch (error) {
      this.logger.error('Search failed', error);
      throw new Error('Search operation failed');
    }
  }

  async suggest(query: string, tenantId: string): Promise<string[]> {
    try {
      const response = await this.elasticsearchService.search({
        index: ['candidates', 'jobs', 'applications'],
        body: {
          suggest: {
            text: query,
            simple_phrase: {
              phrase: {
                field: 'content',
                size: 5,
                gram_size: 3,
                direct_generator: [
                  {
                    field: 'content',
                    suggest_mode: 'always',
                  },
                ],
                highlight: {
                  pre_tag: '<em>',
                  post_tag: '</em>',
                },
              },
            },
          },
          query: {
            bool: {
              filter: [{ term: { tenant_id: tenantId } }],
            },
          },
        },
      });

      const suggestions =
        response.body.suggest?.simple_phrase?.[0]?.options || [];
      return suggestions.map((suggestion: any) => suggestion.text);
    } catch (error) {
      this.logger.error('Suggestion failed', error);
      return [];
    }
  }

  async getSearchAnalytics(tenantId: string): Promise<any> {
    try {
      const response = await this.elasticsearchService.search({
        index: 'search_analytics',
        body: {
          query: {
            bool: {
              filter: [
                { term: { tenant_id: tenantId } },
                {
                  range: {
                    timestamp: {
                      gte: 'now-30d',
                    },
                  },
                },
              ],
            },
          },
          aggs: {
            popular_queries: {
              terms: {
                field: 'query.keyword',
                size: 10,
              },
            },
            search_types: {
              terms: {
                field: 'search_type',
                size: 10,
              },
            },
            daily_searches: {
              date_histogram: {
                field: 'timestamp',
                calendar_interval: 'day',
              },
            },
          },
        },
      });

      return response.body.aggregations;
    } catch (error) {
      this.logger.error('Search analytics failed', error);
      return {};
    }
  }

  private getIndicesForType(type: string): string[] {
    const indexMap = {
      candidate: ['candidates'],
      job: ['jobs'],
      application: ['applications'],
      note: ['notes'],
      all: ['candidates', 'jobs', 'applications', 'notes'],
    };

    return indexMap[type] || indexMap.all;
  }

  private buildQuery(
    query: string,
    filters: Record<string, any>,
    tenantId: string,
  ) {
    const must = [];
    const filter = [{ term: { tenant_id: tenantId } }];

    // Main search query
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'title^3',
            'content^2',
            'skills^2',
            'description',
            'notes',
            'email',
            'name^2',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'or',
        },
      });
    } else {
      must.push({ match_all: {} });
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        switch (key) {
          case 'skills':
            if (Array.isArray(value) && value.length > 0) {
              filter.push({
                terms: { 'skills.keyword': value },
              });
            }
            break;
          case 'experience':
            if (value.min !== undefined || value.max !== undefined) {
              const range: any = {};
              if (value.min !== undefined) range.gte = value.min;
              if (value.max !== undefined) range.lte = value.max;
              filter.push({
                range: { total_experience: range },
              });
            }
            break;
          case 'location':
            if (Array.isArray(value) && value.length > 0) {
              filter.push({
                terms: { 'location.keyword': value },
              });
            }
            break;
          case 'dateRange':
            if (value.from || value.to) {
              const range: any = {};
              if (value.from) range.gte = value.from;
              if (value.to) range.lte = value.to;
              filter.push({
                range: { created_at: range },
              });
            }
            break;
          default:
            if (Array.isArray(value)) {
              filter.push({
                terms: { [`${key}.keyword`]: value },
              });
            } else {
              filter.push({
                term: { [`${key}.keyword`]: value },
              });
            }
        }
      }
    });

    return {
      bool: {
        must,
        filter,
      },
    };
  }

  private buildSort(sortBy: string, sortOrder: 'asc' | 'desc') {
    const sortMap = {
      _score: { _score: { order: sortOrder } },
      created_at: { created_at: { order: sortOrder } },
      updated_at: { updated_at: { order: sortOrder } },
      name: { 'name.keyword': { order: sortOrder } },
      title: { 'title.keyword': { order: sortOrder } },
    };

    return sortMap[sortBy] || sortMap._score;
  }

  private buildAggregations(facets: string[]) {
    const aggs: any = {};

    facets.forEach((facet) => {
      switch (facet) {
        case 'skills':
          aggs.skills = {
            terms: {
              field: 'skills.keyword',
              size: 20,
            },
          };
          break;
        case 'location':
          aggs.location = {
            terms: {
              field: 'location.keyword',
              size: 10,
            },
          };
          break;
        case 'experience':
          aggs.experience = {
            range: {
              field: 'total_experience',
              ranges: [
                { key: '0-2 years', from: 0, to: 2 },
                { key: '2-5 years', from: 2, to: 5 },
                { key: '5-10 years', from: 5, to: 10 },
                { key: '10+ years', from: 10 },
              ],
            },
          };
          break;
        case 'type':
          aggs.type = {
            terms: {
              field: '_index',
              size: 10,
            },
          };
          break;
      }
    });

    return aggs;
  }

  private formatSearchResults(
    response: SearchResponse,
    page: number,
    limit: number,
  ): SearchResults {
    const hits = response.body.hits?.hits || [];
    const total = response.body.hits?.total?.value || 0;
    const aggregations = response.body.aggregations || {};

    const results: SearchResult[] = hits.map((hit: any) => ({
      id: hit._id,
      type: this.mapIndexToType(hit._index),
      title: hit._source.title || hit._source.name || 'Untitled',
      content: hit._source.content || hit._source.description || '',
      highlights: this.extractHighlights(hit.highlight),
      score: hit._score,
      metadata: {
        ...hit._source,
        index: hit._index,
      },
    }));

    const facets = this.formatFacets(aggregations);

    return {
      results,
      total,
      page,
      limit,
      facets,
    };
  }

  private mapIndexToType(
    index: string,
  ): 'candidate' | 'job' | 'application' | 'note' {
    const typeMap = {
      candidates: 'candidate' as const,
      jobs: 'job' as const,
      applications: 'application' as const,
      notes: 'note' as const,
    };

    return typeMap[index] || 'candidate';
  }

  private extractHighlights(highlight: any): string[] {
    if (!highlight) return [];

    const highlights: string[] = [];
    Object.values(highlight).forEach((fragments: any) => {
      if (Array.isArray(fragments)) {
        highlights.push(...fragments);
      }
    });

    return highlights;
  }

  private formatFacets(aggregations: any): Record<string, any> {
    const facets: Record<string, any> = {};

    Object.entries(aggregations).forEach(([key, value]: [string, any]) => {
      if (value.buckets) {
        facets[key] = value.buckets.map((bucket: any) => ({
          key: bucket.key,
          count: bucket.doc_count,
        }));
      }
    });

    return facets;
  }

  async logSearch(
    query: string,
    searchType: string,
    resultCount: number,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.elasticsearchService.index({
        index: 'search_analytics',
        body: {
          query,
          search_type: searchType,
          result_count: resultCount,
          tenant_id: tenantId,
          user_id: userId,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to log search', error);
    }
  }
}
