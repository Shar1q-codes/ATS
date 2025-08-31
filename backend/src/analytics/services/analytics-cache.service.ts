import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import {
  AnalyticsSummaryDto,
  TimeToFillMetricsDto,
  ConversionRatesDto,
  SourceAnalyticsDto,
  DiversityAnalyticsDto,
} from '../dto/analytics-response.dto';
import { DashboardDataDto } from '../dto/reporting.dto';

@Injectable()
export class AnalyticsCacheService {
  private readonly logger = new Logger(AnalyticsCacheService.name);
  private readonly cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);

    if (!cached) {
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    }

    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.logger.debug(`Cache expired for key: ${key}`);
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit for key: ${key}`);
    return cached.data as T;
  }

  async set<T>(
    key: string,
    data: T,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    this.logger.debug(`Caching data for key: ${key}, TTL: ${ttl}ms`);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  async delete(key: string): Promise<void> {
    this.logger.debug(`Deleting cache for key: ${key}`);
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.logger.log('Clearing all cache');
    this.cache.clear();
  }

  async invalidatePattern(pattern: string): Promise<void> {
    this.logger.log(`Invalidating cache entries matching pattern: ${pattern}`);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
    this.logger.log(`Invalidated ${keysToDelete.length} cache entries`);
  }

  // Specific cache methods for analytics data
  async getAnalyticsSummary(
    query: AnalyticsQueryDto,
  ): Promise<AnalyticsSummaryDto | null> {
    const key = this.generateSummaryKey(query);
    return this.get<AnalyticsSummaryDto>(key);
  }

  async setAnalyticsSummary(
    query: AnalyticsQueryDto,
    data: AnalyticsSummaryDto,
  ): Promise<void> {
    const key = this.generateSummaryKey(query);
    await this.set(key, data, this.DEFAULT_TTL);
  }

  async getTimeToFillMetrics(
    query: AnalyticsQueryDto,
  ): Promise<TimeToFillMetricsDto | null> {
    const key = this.generateTimeToFillKey(query);
    return this.get<TimeToFillMetricsDto>(key);
  }

  async setTimeToFillMetrics(
    query: AnalyticsQueryDto,
    data: TimeToFillMetricsDto,
  ): Promise<void> {
    const key = this.generateTimeToFillKey(query);
    await this.set(key, data, this.DEFAULT_TTL);
  }

  async getConversionRates(
    query: AnalyticsQueryDto,
  ): Promise<ConversionRatesDto | null> {
    const key = this.generateConversionRatesKey(query);
    return this.get<ConversionRatesDto>(key);
  }

  async setConversionRates(
    query: AnalyticsQueryDto,
    data: ConversionRatesDto,
  ): Promise<void> {
    const key = this.generateConversionRatesKey(query);
    await this.set(key, data, this.DEFAULT_TTL);
  }

  async getSourcePerformance(
    query: AnalyticsQueryDto,
  ): Promise<SourceAnalyticsDto[] | null> {
    const key = this.generateSourcePerformanceKey(query);
    return this.get<SourceAnalyticsDto[]>(key);
  }

  async setSourcePerformance(
    query: AnalyticsQueryDto,
    data: SourceAnalyticsDto[],
  ): Promise<void> {
    const key = this.generateSourcePerformanceKey(query);
    await this.set(key, data, this.DEFAULT_TTL);
  }

  async getDiversityAnalytics(
    query: AnalyticsQueryDto,
  ): Promise<DiversityAnalyticsDto | null> {
    const key = this.generateDiversityAnalyticsKey(query);
    return this.get<DiversityAnalyticsDto>(key);
  }

  async setDiversityAnalytics(
    query: AnalyticsQueryDto,
    data: DiversityAnalyticsDto,
  ): Promise<void> {
    const key = this.generateDiversityAnalyticsKey(query);
    await this.set(key, data, this.DEFAULT_TTL);
  }

  async getDashboardData(
    query: AnalyticsQueryDto,
  ): Promise<DashboardDataDto | null> {
    const key = this.generateDashboardKey(query);
    return this.get<DashboardDataDto>(key);
  }

  async setDashboardData(
    query: AnalyticsQueryDto,
    data: DashboardDataDto,
  ): Promise<void> {
    const key = this.generateDashboardKey(query);
    await this.set(key, data, 10 * 60 * 1000); // 10 minutes for dashboard data
  }

  // Cache invalidation methods
  async invalidateCompanyCache(companyId: string): Promise<void> {
    await this.invalidatePattern(`company:${companyId}`);
  }

  async invalidateJobVariantCache(jobVariantId: string): Promise<void> {
    await this.invalidatePattern(`job:${jobVariantId}`);
  }

  async invalidateAllAnalyticsCache(): Promise<void> {
    await this.invalidatePattern('analytics:');
  }

  // Private key generation methods
  private generateSummaryKey(query: AnalyticsQueryDto): string {
    return `analytics:summary:${this.generateQueryHash(query)}`;
  }

  private generateTimeToFillKey(query: AnalyticsQueryDto): string {
    return `analytics:time-to-fill:${this.generateQueryHash(query)}`;
  }

  private generateConversionRatesKey(query: AnalyticsQueryDto): string {
    return `analytics:conversion-rates:${this.generateQueryHash(query)}`;
  }

  private generateSourcePerformanceKey(query: AnalyticsQueryDto): string {
    return `analytics:source-performance:${this.generateQueryHash(query)}`;
  }

  private generateDiversityAnalyticsKey(query: AnalyticsQueryDto): string {
    return `analytics:diversity:${this.generateQueryHash(query)}`;
  }

  private generateDashboardKey(query: AnalyticsQueryDto): string {
    return `analytics:dashboard:${this.generateQueryHash(query)}`;
  }

  private generateQueryHash(query: AnalyticsQueryDto): string {
    const queryString = JSON.stringify({
      startDate: query.startDate,
      endDate: query.endDate,
      companyId: query.companyId,
      jobVariantId: query.jobVariantId,
      granularity: query.granularity,
      source: query.source,
    });

    // Simple hash function - in production, you might want to use a proper hash library
    let hash = 0;
    for (let i = 0; i < queryString.length; i++) {
      const char = queryString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  // Cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.timestamp + cached.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      this.logger.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }
}
