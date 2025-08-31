import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineMetrics } from '../../entities/pipeline-metrics.entity';
import { SourcePerformance } from '../../entities/source-performance.entity';
import { DiversityMetrics } from '../../entities/diversity-metrics.entity';
import { PipelineAnalyticsService } from './pipeline-analytics.service';
import { SourceAnalyticsService } from './source-analytics.service';
import { DiversityAnalyticsService } from './diversity-analytics.service';
import { DataAggregationService } from './data-aggregation.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import {
  AnalyticsSummaryDto,
  TimeToFillMetricsDto,
  ConversionRatesDto,
} from '../dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(PipelineMetrics)
    private pipelineMetricsRepository: Repository<PipelineMetrics>,
    @InjectRepository(SourcePerformance)
    private sourcePerformanceRepository: Repository<SourcePerformance>,
    @InjectRepository(DiversityMetrics)
    private diversityMetricsRepository: Repository<DiversityMetrics>,
    private pipelineAnalyticsService: PipelineAnalyticsService,
    private sourceAnalyticsService: SourceAnalyticsService,
    private diversityAnalyticsService: DiversityAnalyticsService,
    private dataAggregationService: DataAggregationService,
  ) {}

  async getAnalyticsSummary(
    query: AnalyticsQueryDto,
  ): Promise<AnalyticsSummaryDto> {
    this.logger.log(
      `Getting analytics summary for query: ${JSON.stringify(query)}`,
    );

    try {
      const [
        timeToFill,
        conversionRates,
        bottlenecks,
        totalApplications,
        totalHires,
        activePositions,
      ] = await Promise.all([
        this.getTimeToFillMetrics(query),
        this.getConversionRates(query),
        this.pipelineAnalyticsService.getBottlenecks(query),
        this.getTotalApplications(query),
        this.getTotalHires(query),
        this.getActivePositions(query),
      ]);

      return {
        timeToFill,
        conversionRates,
        bottlenecks,
        totalApplications,
        totalHires,
        activePositions,
        dateRange: {
          startDate:
            query.startDate ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: query.endDate || new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting analytics summary: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getTimeToFillMetrics(
    query: AnalyticsQueryDto,
  ): Promise<TimeToFillMetricsDto> {
    this.logger.log(
      `Getting time-to-fill metrics for query: ${JSON.stringify(query)}`,
    );

    const queryBuilder =
      this.pipelineMetricsRepository.createQueryBuilder('pm');

    if (query.companyId) {
      queryBuilder.andWhere('pm.companyId = :companyId', {
        companyId: query.companyId,
      });
    }

    if (query.jobVariantId) {
      queryBuilder.andWhere('pm.jobVariantId = :jobVariantId', {
        jobVariantId: query.jobVariantId,
      });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('pm.dateRange BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    const metrics = await queryBuilder.getMany();

    if (metrics.length === 0) {
      return {
        averageDays: 0,
        medianDays: 0,
        minDays: 0,
        maxDays: 0,
        totalPositions: 0,
        filledPositions: 0,
        openPositions: 0,
      };
    }

    const timeToFillValues = metrics
      .filter((m) => m.avgTimeToFillDays !== null)
      .map((m) => m.avgTimeToFillDays)
      .sort((a, b) => a - b);

    const totalPositions = metrics.reduce(
      (sum, m) => sum + m.totalApplications,
      0,
    );
    const filledPositions = metrics.reduce(
      (sum, m) => sum + m.candidatesHired,
      0,
    );

    return {
      averageDays:
        timeToFillValues.length > 0
          ? timeToFillValues.reduce((sum, val) => sum + val, 0) /
            timeToFillValues.length
          : 0,
      medianDays:
        timeToFillValues.length > 0
          ? timeToFillValues.length % 2 === 0
            ? (timeToFillValues[Math.floor(timeToFillValues.length / 2) - 1] +
                timeToFillValues[Math.floor(timeToFillValues.length / 2)]) /
              2
            : timeToFillValues[Math.floor(timeToFillValues.length / 2)]
          : 0,
      minDays: timeToFillValues.length > 0 ? Math.min(...timeToFillValues) : 0,
      maxDays: timeToFillValues.length > 0 ? Math.max(...timeToFillValues) : 0,
      totalPositions,
      filledPositions,
      openPositions: totalPositions - filledPositions,
    };
  }

  async getConversionRates(
    query: AnalyticsQueryDto,
  ): Promise<ConversionRatesDto> {
    this.logger.log(
      `Getting conversion rates for query: ${JSON.stringify(query)}`,
    );

    const queryBuilder =
      this.pipelineMetricsRepository.createQueryBuilder('pm');

    if (query.companyId) {
      queryBuilder.andWhere('pm.companyId = :companyId', {
        companyId: query.companyId,
      });
    }

    if (query.jobVariantId) {
      queryBuilder.andWhere('pm.jobVariantId = :jobVariantId', {
        jobVariantId: query.jobVariantId,
      });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('pm.dateRange BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    const result = await queryBuilder
      .select([
        'SUM(pm.totalApplications) as totalApplications',
        'SUM(pm.applicationsScreened) as applicationsScreened',
        'SUM(pm.applicationsShortlisted) as applicationsShortlisted',
        'SUM(pm.interviewsScheduled) as interviewsScheduled',
        'SUM(pm.offersExtended) as offersExtended',
        'SUM(pm.candidatesHired) as candidatesHired',
      ])
      .getRawOne();

    const total = parseInt(result.totalApplications) || 0;
    const screened = parseInt(result.applicationsScreened) || 0;
    const shortlisted = parseInt(result.applicationsShortlisted) || 0;
    const interviewed = parseInt(result.interviewsScheduled) || 0;
    const offered = parseInt(result.offersExtended) || 0;
    const hired = parseInt(result.candidatesHired) || 0;

    return {
      applicationToScreening: total > 0 ? (screened / total) * 100 : 0,
      screeningToShortlist: screened > 0 ? (shortlisted / screened) * 100 : 0,
      shortlistToInterview:
        shortlisted > 0 ? (interviewed / shortlisted) * 100 : 0,
      interviewToOffer: interviewed > 0 ? (offered / interviewed) * 100 : 0,
      offerToHire: offered > 0 ? (hired / offered) * 100 : 0,
      overallConversion: total > 0 ? (hired / total) * 100 : 0,
    };
  }

  private async getTotalApplications(
    query: AnalyticsQueryDto,
  ): Promise<number> {
    const queryBuilder =
      this.pipelineMetricsRepository.createQueryBuilder('pm');

    if (query.companyId) {
      queryBuilder.andWhere('pm.companyId = :companyId', {
        companyId: query.companyId,
      });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('pm.dateRange BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    const result = await queryBuilder
      .select('SUM(pm.totalApplications)', 'total')
      .getRawOne();

    return parseInt(result.total) || 0;
  }

  private async getTotalHires(query: AnalyticsQueryDto): Promise<number> {
    const queryBuilder =
      this.pipelineMetricsRepository.createQueryBuilder('pm');

    if (query.companyId) {
      queryBuilder.andWhere('pm.companyId = :companyId', {
        companyId: query.companyId,
      });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('pm.dateRange BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    const result = await queryBuilder
      .select('SUM(pm.candidatesHired)', 'total')
      .getRawOne();

    return parseInt(result.total) || 0;
  }

  private async getActivePositions(query: AnalyticsQueryDto): Promise<number> {
    // This would typically query active job variants
    // For now, return a placeholder implementation
    return 0;
  }

  async refreshMetrics(companyId?: string): Promise<void> {
    this.logger.log(`Refreshing metrics for company: ${companyId || 'all'}`);

    try {
      await Promise.all([
        this.dataAggregationService.aggregatePipelineMetrics(companyId),
        this.dataAggregationService.aggregateSourcePerformance(companyId),
        this.dataAggregationService.aggregateDiversityMetrics(companyId),
      ]);

      this.logger.log('Metrics refresh completed successfully');
    } catch (error) {
      this.logger.error(
        `Error refreshing metrics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
