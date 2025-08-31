import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsCacheService } from '../analytics-cache.service';
import { AnalyticsQueryDto } from '../../dto/analytics-query.dto';
import {
  AnalyticsSummaryDto,
  TimeToFillMetricsDto,
  ConversionRatesDto,
  SourceAnalyticsDto,
  DiversityAnalyticsDto,
} from '../../dto/analytics-response.dto';
import { DashboardDataDto } from '../../dto/reporting.dto';

describe('AnalyticsCacheService', () => {
  let service: AnalyticsCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsCacheService],
    }).compile();

    service = module.get<AnalyticsCacheService>(AnalyticsCacheService);
  });

  afterEach(async () => {
    await service.clear();
  });

  describe('basic cache operations', () => {
    it('should store and retrieve data', async () => {
      const key = 'test-key';
      const data = { test: 'data' };

      await service.set(key, data);
      const result = await service.get(key);

      expect(result).toEqual(data);
    });

    it('should return null for non-existent keys', async () => {
      const result = await service.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle TTL expiration', async () => {
      const key = 'expiring-key';
      const data = { test: 'data' };
      const shortTTL = 10; // 10ms

      await service.set(key, data, shortTTL);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 20));

      const result = await service.get(key);
      expect(result).toBeNull();
    });

    it('should delete specific keys', async () => {
      const key = 'delete-key';
      const data = { test: 'data' };

      await service.set(key, data);
      await service.delete(key);

      const result = await service.get(key);
      expect(result).toBeNull();
    });

    it('should clear all cache', async () => {
      await service.set('key1', { data: 1 });
      await service.set('key2', { data: 2 });

      await service.clear();

      const result1 = await service.get('key1');
      const result2 = await service.get('key2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('pattern invalidation', () => {
    it('should invalidate keys matching pattern', async () => {
      await service.set('company:123:summary', { data: 1 });
      await service.set('company:123:metrics', { data: 2 });
      await service.set('company:456:summary', { data: 3 });

      await service.invalidatePattern('company:123');

      const result1 = await service.get('company:123:summary');
      const result2 = await service.get('company:123:metrics');
      const result3 = await service.get('company:456:summary');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toEqual({ data: 3 });
    });
  });

  describe('analytics-specific cache methods', () => {
    const mockQuery: AnalyticsQueryDto = {
      companyId: 'company-1',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    it('should cache and retrieve analytics summary', async () => {
      const mockSummary: AnalyticsSummaryDto = {
        totalApplications: 100,
        totalHires: 10,
        activePositions: 5,
        timeToFill: {
          averageDays: 30,
          medianDays: 28,
          minDays: 15,
          maxDays: 60,
          totalPositions: 5,
          filledPositions: 3,
          openPositions: 2,
        },
        conversionRates: {
          applicationToScreening: 80,
          screeningToShortlist: 60,
          shortlistToInterview: 75,
          interviewToOffer: 50,
          offerToHire: 90,
          overallConversion: 10,
        },
        bottlenecks: [],
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      };

      await service.setAnalyticsSummary(mockQuery, mockSummary);
      const result = await service.getAnalyticsSummary(mockQuery);

      expect(result).toEqual(mockSummary);
    });

    it('should cache and retrieve time-to-fill metrics', async () => {
      const mockMetrics: TimeToFillMetricsDto = {
        averageDays: 30,
        medianDays: 28,
        minDays: 15,
        maxDays: 60,
        totalPositions: 5,
        filledPositions: 3,
        openPositions: 2,
      };

      await service.setTimeToFillMetrics(mockQuery, mockMetrics);
      const result = await service.getTimeToFillMetrics(mockQuery);

      expect(result).toEqual(mockMetrics);
    });

    it('should cache and retrieve conversion rates', async () => {
      const mockRates: ConversionRatesDto = {
        applicationToScreening: 80,
        screeningToShortlist: 60,
        shortlistToInterview: 75,
        interviewToOffer: 50,
        offerToHire: 90,
        overallConversion: 10,
      };

      await service.setConversionRates(mockQuery, mockRates);
      const result = await service.getConversionRates(mockQuery);

      expect(result).toEqual(mockRates);
    });

    it('should cache and retrieve source performance', async () => {
      const mockSources: SourceAnalyticsDto[] = [
        {
          source: 'LinkedIn',
          totalCandidates: 50,
          qualifiedCandidates: 30,
          hiredCandidates: 5,
          conversionRate: 10,
          qualityScore: 8.5,
          roi: 150,
        },
      ];

      await service.setSourcePerformance(mockQuery, mockSources);
      const result = await service.getSourcePerformance(mockQuery);

      expect(result).toEqual(mockSources);
    });

    it('should cache and retrieve diversity analytics', async () => {
      const mockDiversity: DiversityAnalyticsDto = {
        totalApplicants: 100,
        totalHired: 10,
        diversityIndex: 0.75,
        genderBalance: {
          applicants: { male: 60, female: 40 },
          hired: { male: 6, female: 4 },
          bias: 0.05,
        },
        ethnicityBalance: {
          applicants: { white: 50, asian: 30, hispanic: 20 },
          hired: { white: 5, asian: 3, hispanic: 2 },
          bias: 0.1,
        },
        ageBalance: {
          applicants: { '25-34': 40, '35-44': 35, '45-54': 25 },
          hired: { '25-34': 4, '35-44': 4, '45-54': 2 },
          bias: 0.08,
        },
        educationBalance: {
          applicants: { bachelors: 60, masters: 30, phd: 10 },
          hired: { bachelors: 6, masters: 3, phd: 1 },
          bias: 0.03,
        },
        biasAlerts: [],
      };

      await service.setDiversityAnalytics(mockQuery, mockDiversity);
      const result = await service.getDiversityAnalytics(mockQuery);

      expect(result).toEqual(mockDiversity);
    });

    it('should cache and retrieve dashboard data with longer TTL', async () => {
      const mockDashboard: DashboardDataDto = {
        summary: {
          totalApplications: 100,
          totalHires: 10,
          activePositions: 5,
          timeToFill: {
            averageDays: 30,
            medianDays: 28,
            minDays: 15,
            maxDays: 60,
            totalPositions: 5,
            filledPositions: 3,
            openPositions: 2,
          },
          conversionRates: {
            applicationToScreening: 80,
            screeningToShortlist: 60,
            shortlistToInterview: 75,
            interviewToOffer: 50,
            offerToHire: 90,
            overallConversion: 10,
          },
          bottlenecks: [],
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
          },
        },
        pipelineBottlenecks: [],
        sourcePerformance: [],
        diversityAnalytics: {
          totalApplicants: 100,
          totalHired: 10,
          diversityIndex: 0.75,
          genderBalance: { applicants: {}, hired: {}, bias: 0 },
          ethnicityBalance: { applicants: {}, hired: {}, bias: 0 },
          ageBalance: { applicants: {}, hired: {}, bias: 0 },
          educationBalance: { applicants: {}, hired: {}, bias: 0 },
          biasAlerts: [],
        },
        trendData: {
          applications: [],
          hires: [],
          timeToFill: [],
        },
        lastUpdated: new Date().toISOString(),
      };

      await service.setDashboardData(mockQuery, mockDashboard);
      const result = await service.getDashboardData(mockQuery);

      expect(result).toEqual(mockDashboard);
    });
  });

  describe('cache invalidation by entity', () => {
    it('should invalidate company-specific cache', async () => {
      const companyId = 'company-123';
      await service.set(`analytics:summary:company:${companyId}:hash123`, {
        data: 1,
      });
      await service.set(`analytics:metrics:company:${companyId}:hash456`, {
        data: 2,
      });
      await service.set(`analytics:summary:company:other:hash789`, { data: 3 });

      await service.invalidateCompanyCache(companyId);

      const result1 = await service.get(
        `analytics:summary:company:${companyId}:hash123`,
      );
      const result2 = await service.get(
        `analytics:metrics:company:${companyId}:hash456`,
      );
      const result3 = await service.get(
        `analytics:summary:company:other:hash789`,
      );

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toEqual({ data: 3 });
    });

    it('should invalidate job variant-specific cache', async () => {
      const jobVariantId = 'job-456';
      await service.set(`analytics:summary:job:${jobVariantId}:hash123`, {
        data: 1,
      });
      await service.set(`analytics:metrics:job:${jobVariantId}:hash456`, {
        data: 2,
      });
      await service.set(`analytics:summary:job:other:hash789`, { data: 3 });

      await service.invalidateJobVariantCache(jobVariantId);

      const result1 = await service.get(
        `analytics:summary:job:${jobVariantId}:hash123`,
      );
      const result2 = await service.get(
        `analytics:metrics:job:${jobVariantId}:hash456`,
      );
      const result3 = await service.get(`analytics:summary:job:other:hash789`);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toEqual({ data: 3 });
    });

    it('should invalidate all analytics cache', async () => {
      await service.set('analytics:summary:hash123', { data: 1 });
      await service.set('analytics:metrics:hash456', { data: 2 });
      await service.set('other:data:hash789', { data: 3 });

      await service.invalidateAllAnalyticsCache();

      const result1 = await service.get('analytics:summary:hash123');
      const result2 = await service.get('analytics:metrics:hash456');
      const result3 = await service.get('other:data:hash789');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toEqual({ data: 3 });
    });
  });

  describe('cache statistics and cleanup', () => {
    it('should provide cache statistics', async () => {
      await service.set('key1', { data: 1 });
      await service.set('key2', { data: 2 });

      const stats = service.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });

    it('should cleanup expired entries', async () => {
      const shortTTL = 10; // 10ms
      await service.set('expiring-key', { data: 1 }, shortTTL);
      await service.set('persistent-key', { data: 2 });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 20));

      service.cleanup();

      const result1 = await service.get('expiring-key');
      const result2 = await service.get('persistent-key');

      expect(result1).toBeNull();
      expect(result2).toEqual({ data: 2 });
    });
  });

  describe('query hash generation', () => {
    it('should generate consistent hashes for identical queries', async () => {
      const query1: AnalyticsQueryDto = {
        companyId: 'company-1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const query2: AnalyticsQueryDto = {
        companyId: 'company-1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const data = { test: 'data' };

      await service.setAnalyticsSummary(query1, data as any);
      const result = await service.getAnalyticsSummary(query2);

      expect(result).toEqual(data);
    });

    it('should generate different hashes for different queries', async () => {
      const query1: AnalyticsQueryDto = {
        companyId: 'company-1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const query2: AnalyticsQueryDto = {
        companyId: 'company-2',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const data1 = { test: 'data1' };
      const data2 = { test: 'data2' };

      await service.setAnalyticsSummary(query1, data1 as any);
      await service.setAnalyticsSummary(query2, data2 as any);

      const result1 = await service.getAnalyticsSummary(query1);
      const result2 = await service.getAnalyticsSummary(query2);

      expect(result1).toEqual(data1);
      expect(result2).toEqual(data2);
      expect(result1).not.toEqual(result2);
    });
  });
});
