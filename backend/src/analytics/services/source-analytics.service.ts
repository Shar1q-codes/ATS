import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SourcePerformance } from '../../entities/source-performance.entity';
import { Candidate } from '../../entities/candidate.entity';
import { Application } from '../../entities/application.entity';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { SourceAnalyticsDto } from '../dto/analytics-response.dto';

@Injectable()
export class SourceAnalyticsService {
  private readonly logger = new Logger(SourceAnalyticsService.name);

  constructor(
    @InjectRepository(SourcePerformance)
    private sourcePerformanceRepository: Repository<SourcePerformance>,
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
  ) {}

  async getSourcePerformance(
    query: AnalyticsQueryDto,
  ): Promise<SourceAnalyticsDto[]> {
    this.logger.log(
      `Getting source performance for query: ${JSON.stringify(query)}`,
    );

    try {
      const queryBuilder =
        this.sourcePerformanceRepository.createQueryBuilder('sp');

      if (query.companyId) {
        queryBuilder.andWhere('sp.companyId = :companyId', {
          companyId: query.companyId,
        });
      }

      if (query.source) {
        queryBuilder.andWhere('sp.source = :source', { source: query.source });
      }

      if (query.startDate && query.endDate) {
        queryBuilder.andWhere('sp.dateRange BETWEEN :startDate AND :endDate', {
          startDate: query.startDate,
          endDate: query.endDate,
        });
      }

      const sourceMetrics = await queryBuilder.getMany();

      // Group by source and aggregate
      const sourceMap = new Map<string, any>();

      sourceMetrics.forEach((metric) => {
        if (!sourceMap.has(metric.source)) {
          sourceMap.set(metric.source, {
            source: metric.source,
            totalCandidates: 0,
            qualifiedCandidates: 0,
            hiredCandidates: 0,
            totalQualityScore: 0,
            totalCostPerHire: 0,
            recordCount: 0,
          });
        }

        const sourceData = sourceMap.get(metric.source);
        sourceData.totalCandidates += metric.totalCandidates;
        sourceData.qualifiedCandidates += metric.qualifiedCandidates;
        sourceData.hiredCandidates += metric.hiredCandidates;
        sourceData.totalQualityScore += metric.qualityScore || 0;
        sourceData.totalCostPerHire += metric.costPerHire || 0;
        sourceData.recordCount++;
      });

      const results: SourceAnalyticsDto[] = Array.from(sourceMap.values()).map(
        (sourceData) => {
          const conversionRate =
            sourceData.totalCandidates > 0
              ? (sourceData.hiredCandidates / sourceData.totalCandidates) * 100
              : 0;

          const qualityScore =
            sourceData.recordCount > 0
              ? sourceData.totalQualityScore / sourceData.recordCount
              : 0;

          const costPerHire =
            sourceData.recordCount > 0
              ? sourceData.totalCostPerHire / sourceData.recordCount
              : 0;

          const roi =
            costPerHire > 0 ? (qualityScore * conversionRate) / costPerHire : 0;

          return {
            source: sourceData.source,
            totalCandidates: sourceData.totalCandidates,
            qualifiedCandidates: sourceData.qualifiedCandidates,
            hiredCandidates: sourceData.hiredCandidates,
            conversionRate,
            qualityScore,
            costPerHire: costPerHire > 0 ? costPerHire : undefined,
            roi,
          };
        },
      );

      return results.sort((a, b) => b.conversionRate - a.conversionRate);
    } catch (error) {
      this.logger.error(
        `Error getting source performance: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async calculateSourceConversionRates(
    companyId: string,
  ): Promise<Map<string, number>> {
    this.logger.log(
      `Calculating source conversion rates for company: ${companyId}`,
    );

    try {
      // Get all candidates with their applications
      const candidates = await this.candidateRepository
        .createQueryBuilder('c')
        .leftJoin('c.applications', 'app')
        .leftJoin('app.companyJobVariant', 'cjv')
        .where('cjv.companyProfileId = :companyId', { companyId })
        .select(['c.id', 'c.source', 'app.status'])
        .getMany();

      const sourceStats = new Map<string, { total: number; hired: number }>();

      candidates.forEach((candidate) => {
        const source = candidate.source || 'unknown';

        if (!sourceStats.has(source)) {
          sourceStats.set(source, { total: 0, hired: 0 });
        }

        const stats = sourceStats.get(source);
        stats.total++;

        // Check if any application resulted in hire
        if (
          candidate.applications &&
          candidate.applications.some((app) => app.status === 'hired')
        ) {
          stats.hired++;
        }
      });

      const conversionRates = new Map<string, number>();
      sourceStats.forEach((stats, source) => {
        const rate = stats.total > 0 ? (stats.hired / stats.total) * 100 : 0;
        conversionRates.set(source, rate);
      });

      return conversionRates;
    } catch (error) {
      this.logger.error(
        `Error calculating source conversion rates: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getTopPerformingSources(
    companyId: string,
    limit: number = 5,
  ): Promise<SourceAnalyticsDto[]> {
    this.logger.log(`Getting top performing sources for company: ${companyId}`);

    try {
      const query: AnalyticsQueryDto = { companyId };
      const allSources = await this.getSourcePerformance(query);

      return allSources.sort((a, b) => b.roi - a.roi).slice(0, limit);
    } catch (error) {
      this.logger.error(
        `Error getting top performing sources: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async calculateSourceQualityScore(
    source: string,
    companyId: string,
  ): Promise<number> {
    this.logger.log(
      `Calculating quality score for source: ${source}, company: ${companyId}`,
    );

    try {
      // Get all applications from this source
      const applications = await this.applicationRepository
        .createQueryBuilder('app')
        .leftJoin('app.candidate', 'c')
        .leftJoin('app.companyJobVariant', 'cjv')
        .where('c.source = :source', { source })
        .andWhere('cjv.companyProfileId = :companyId', { companyId })
        .select(['app.fitScore'])
        .getMany();

      if (applications.length === 0) {
        return 0;
      }

      const totalScore = applications.reduce(
        (sum, app) => sum + (app.fitScore || 0),
        0,
      );
      return totalScore / applications.length;
    } catch (error) {
      this.logger.error(
        `Error calculating source quality score: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
