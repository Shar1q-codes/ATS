import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis.RedisClientType;
  private readonly defaultTTL = 3600; // 1 hour

  constructor(private configService: ConfigService) {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      this.redis = Redis.createClient({
        url:
          this.configService.get('REDIS_URL') ||
          `redis://${this.configService.get('REDIS_HOST', 'localhost')}:${this.configService.get('REDIS_PORT', 6379)}`,
        password: this.configService.get('REDIS_PASSWORD'),
        database: this.configService.get('REDIS_CACHE_DB', 1), // Use different DB for caching
      });

      this.redis.on('error', (err) => {
        this.logger.error('Redis cache connection error:', err);
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis cache connected successfully');
      });

      await this.redis.connect();
    } catch (error) {
      this.logger.error('Failed to initialize Redis cache:', error);
      throw error;
    }
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const value = await this.redis.get(fullKey);

      if (value) {
        this.logger.debug(`Cache hit for key: ${fullKey}`);
        return JSON.parse(value);
      }

      this.logger.debug(`Cache miss for key: ${fullKey}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null; // Fail gracefully
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;

      await this.redis.setEx(fullKey, ttl, JSON.stringify(value));
      this.logger.debug(`Cache set for key: ${fullKey}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      // Don't throw - caching should not break the application
    }
  }

  async del(key: string, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      await this.redis.del(fullKey);
      this.logger.debug(`Cache deleted for key: ${fullKey}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string, options?: CacheOptions): Promise<void> {
    try {
      const fullPattern = this.buildKey(pattern, options?.prefix);
      const keys = await this.redis.keys(fullPattern);

      if (keys.length > 0) {
        await this.redis.del(keys);
        this.logger.debug(
          `Cache deleted ${keys.length} keys matching pattern: ${fullPattern}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Cache delete pattern error for pattern ${pattern}:`,
        error,
      );
    }
  }

  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const exists = await this.redis.exists(fullKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async increment(key: string, options?: CacheOptions): Promise<number> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.incr(fullKey);

      // Set expiration if it's a new key
      if (result === 1 && options?.ttl) {
        await this.redis.expire(fullKey, options.ttl);
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key, options);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  private buildKey(key: string, prefix?: string): string {
    const basePrefix = this.configService.get('CACHE_PREFIX', 'ats');
    const fullPrefix = prefix ? `${basePrefix}:${prefix}` : basePrefix;
    return `${fullPrefix}:${key}`;
  }

  async getStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage: string;
  }> {
    try {
      const info = await this.redis.info('stats');
      const lines = info.split('\r\n');

      let hits = 0;
      let misses = 0;

      for (const line of lines) {
        if (line.startsWith('keyspace_hits:')) {
          hits = parseInt(line.split(':')[1]);
        } else if (line.startsWith('keyspace_misses:')) {
          misses = parseInt(line.split(':')[1]);
        }
      }

      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      const memoryInfo = await this.redis.info('memory');
      const memoryLines = memoryInfo.split('\r\n');
      let memoryUsage = 'Unknown';

      for (const line of memoryLines) {
        if (line.startsWith('used_memory_human:')) {
          memoryUsage = line.split(':')[1];
          break;
        }
      }

      return {
        hits,
        misses,
        hitRate: Math.round(hitRate * 100) / 100,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        memoryUsage: 'Error',
      };
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
