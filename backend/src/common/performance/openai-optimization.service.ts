import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import OpenAI from 'openai';

export interface OpenAIUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  requestsByModel: Record<string, number>;
  tokensByModel: Record<string, number>;
  cacheHitRate: number;
}

export interface BatchRequest {
  id: string;
  model: string;
  messages: any[];
  maxTokens?: number;
  temperature?: number;
}

export interface BatchResponse {
  id: string;
  response: any;
  error?: string;
}

@Injectable()
export class OpenAIOptimizationService {
  private readonly logger = new Logger(OpenAIOptimizationService.name);
  private openai: OpenAI;
  private readonly rateLimiter = new Map<string, number[]>();
  private readonly maxRequestsPerMinute = 50; // Adjust based on your OpenAI plan
  private readonly batchSize = 10;
  private readonly batchTimeout = 5000; // 5 seconds
  private pendingBatch: BatchRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  // Token costs per 1K tokens (as of 2024)
  private readonly tokenCosts = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'text-embedding-3-large': { input: 0.00013, output: 0 },
    'text-embedding-3-small': { input: 0.00002, output: 0 },
  };

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    this.openai = new OpenAI({ apiKey });
  }

  async chatCompletion(
    model: string,
    messages: any[],
    options: {
      maxTokens?: number;
      temperature?: number;
      cacheKey?: string;
      cacheTTL?: number;
    } = {},
  ): Promise<any> {
    // Check cache first if cache key provided
    if (options.cacheKey) {
      const cached = await this.cacheService.get(options.cacheKey, {
        prefix: 'openai',
        ttl: options.cacheTTL || 3600,
      });

      if (cached) {
        await this.incrementUsageStats('cache_hit', model);
        return cached;
      }
    }

    // Apply rate limiting
    await this.enforceRateLimit();

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature || 0,
      });

      // Cache the response if cache key provided
      if (options.cacheKey) {
        await this.cacheService.set(options.cacheKey, response, {
          prefix: 'openai',
          ttl: options.cacheTTL || 3600,
        });
      }

      // Track usage
      await this.trackUsage(model, response.usage);

      return response;
    } catch (error) {
      this.logger.error(`OpenAI API error: ${error.message}`);
      throw error;
    }
  }

  async batchChatCompletion(
    requests: BatchRequest[],
  ): Promise<BatchResponse[]> {
    const responses: BatchResponse[] = [];

    // Process requests in batches to respect rate limits
    for (let i = 0; i < requests.length; i += this.batchSize) {
      const batch = requests.slice(i, i + this.batchSize);
      const batchPromises = batch.map(async (request) => {
        try {
          const response = await this.chatCompletion(
            request.model,
            request.messages,
            {
              maxTokens: request.maxTokens,
              temperature: request.temperature,
            },
          );

          return {
            id: request.id,
            response,
          };
        } catch (error) {
          return {
            id: request.id,
            response: null,
            error: error.message,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      responses.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + this.batchSize < requests.length) {
        await this.sleep(1000); // 1 second delay
      }
    }

    return responses;
  }

  async createEmbedding(
    text: string | string[],
    model = 'text-embedding-3-large',
    options: {
      cacheKey?: string;
      cacheTTL?: number;
    } = {},
  ): Promise<any> {
    // Check cache first if cache key provided
    if (options.cacheKey) {
      const cached = await this.cacheService.get(
        options.cacheKey,
        { prefix: 'openai-embeddings', ttl: options.cacheTTL || 86400 }, // 24 hours default
      );

      if (cached) {
        await this.incrementUsageStats('cache_hit', model);
        return cached;
      }
    }

    await this.enforceRateLimit();

    try {
      const response = await this.openai.embeddings.create({
        model,
        input: text,
      });

      // Cache the response if cache key provided
      if (options.cacheKey) {
        await this.cacheService.set(options.cacheKey, response, {
          prefix: 'openai-embeddings',
          ttl: options.cacheTTL || 86400,
        });
      }

      // Track usage
      await this.trackUsage(model, response.usage);

      return response;
    } catch (error) {
      this.logger.error(`OpenAI Embedding API error: ${error.message}`);
      throw error;
    }
  }

  async batchCreateEmbeddings(
    texts: string[],
    model = 'text-embedding-3-large',
  ): Promise<any[]> {
    const batchSize = 100; // OpenAI allows up to 2048 inputs per request
    const results: any[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        const response = await this.createEmbedding(batch, model);
        results.push(...response.data);
      } catch (error) {
        this.logger.error(
          `Batch embedding error for batch ${i}-${i + batch.length}: ${error.message}`,
        );
        // Add null entries for failed batch
        results.push(...new Array(batch.length).fill(null));
      }

      // Add delay between batches
      if (i + batchSize < texts.length) {
        await this.sleep(500); // 0.5 second delay
      }
    }

    return results;
  }

  async getUsageStats(): Promise<OpenAIUsageStats> {
    try {
      const stats = await this.cacheService.get<OpenAIUsageStats>(
        'usage_stats',
        { prefix: 'openai-stats' },
      );

      if (!stats) {
        return {
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0,
          requestsByModel: {},
          tokensByModel: {},
          cacheHitRate: 0,
        };
      }

      return stats;
    } catch (error) {
      this.logger.error('Error getting usage stats:', error);
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        requestsByModel: {},
        tokensByModel: {},
        cacheHitRate: 0,
      };
    }
  }

  async resetUsageStats(): Promise<void> {
    await this.cacheService.del('usage_stats', { prefix: 'openai-stats' });
    this.logger.log('Usage stats reset');
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Clean old timestamps
    const timestamps = this.rateLimiter.get('requests') || [];
    const validTimestamps = timestamps.filter((ts) => ts > windowStart);

    if (validTimestamps.length >= this.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...validTimestamps);
      const waitTime = oldestRequest + 60000 - now;

      if (waitTime > 0) {
        this.logger.warn(`Rate limit reached, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }

    validTimestamps.push(now);
    this.rateLimiter.set('requests', validTimestamps);
  }

  private async trackUsage(model: string, usage: any): Promise<void> {
    if (!usage) return;

    try {
      const stats = await this.getUsageStats();

      // Calculate cost
      const modelCost = this.tokenCosts[model] || { input: 0, output: 0 };
      const inputCost = (usage.prompt_tokens / 1000) * modelCost.input;
      const outputCost = (usage.completion_tokens / 1000) * modelCost.output;
      const totalCost = inputCost + outputCost;

      // Update stats
      stats.totalRequests += 1;
      stats.totalTokens += usage.total_tokens;
      stats.totalCost += totalCost;
      stats.requestsByModel[model] = (stats.requestsByModel[model] || 0) + 1;
      stats.tokensByModel[model] =
        (stats.tokensByModel[model] || 0) + usage.total_tokens;

      await this.cacheService.set(
        'usage_stats',
        stats,
        { prefix: 'openai-stats', ttl: 86400 }, // 24 hours
      );
    } catch (error) {
      this.logger.error('Error tracking usage:', error);
    }
  }

  private async incrementUsageStats(
    type: string,
    model: string,
  ): Promise<void> {
    try {
      const stats = await this.getUsageStats();

      if (type === 'cache_hit') {
        const totalRequests = stats.totalRequests || 1;
        const cacheHits = await this.cacheService.increment('cache_hits', {
          prefix: 'openai-stats',
          ttl: 86400,
        });

        stats.cacheHitRate = (cacheHits / (totalRequests + cacheHits)) * 100;

        await this.cacheService.set('usage_stats', stats, {
          prefix: 'openai-stats',
          ttl: 86400,
        });
      }
    } catch (error) {
      this.logger.error('Error incrementing usage stats:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Utility method to generate cache keys
  generateCacheKey(prefix: string, ...parts: string[]): string {
    const hash = require('crypto')
      .createHash('md5')
      .update(parts.join('|'))
      .digest('hex');
    return `${prefix}:${hash}`;
  }
}
