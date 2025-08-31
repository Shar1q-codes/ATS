import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineMetrics } from '../../entities/pipeline-metrics.entity';
import { Application } from '../../entities/application.entity';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { PipelineBottleneckDto } from '../dto/analytics-response.dto';

@Injectable()
export class PipelineAnalyticsService {
  private readonly logger = new Logger(PipelineAnalyticsService.name);

  constructor(
    @InjectRepository(PipelineMetrics)
    private pipelineMetricsRepository: Repository<PipelineMetrics>,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
  ) {}

  async getBottlenecks(
    query: AnalyticsQueryDto,
  ): Promise<PipelineBottleneckDto[]> {
    this.logger.log(
      `Identifying pipeline bottlenecks for query: ${JSON.stringify(query)}`,
    );

    try {
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
          'SUM(pm.interviewsCompleted) as interviewsCompleted',
          'SUM(pm.offersExtended) as offersExtended',
          'SUM(pm.candidatesHired) as candidatesHired',
          'AVG(pm.avgTimeToScreenDays) as avgTimeToScreen',
          'AVG(pm.avgTimeToInterviewDays) as avgTimeToInterview',
          'AVG(pm.avgTimeToOfferDays) as avgTimeToOffer',
        ])
        .getRawOne();

      const stages = [
        {
          stage: 'applied',
          current: parseInt(result.totalApplications) || 0,
          next: parseInt(result.applicationsScreened) || 0,
          avgTime: 0, // Applications don't have time in stage
        },
        {
          stage: 'screening',
          current: parseInt(result.applicationsScreened) || 0,
          next: parseInt(result.applicationsShortlisted) || 0,
          avgTime: parseFloat(result.avgTimeToScreen) || 0,
        },
        {
          stage: 'shortlisted',
          current: parseInt(result.applicationsShortlisted) || 0,
          next: parseInt(result.interviewsScheduled) || 0,
          avgTime: parseFloat(result.avgTimeToInterview) || 0,
        },
        {
          stage: 'interview_scheduled',
          current: parseInt(result.interviewsScheduled) || 0,
          next: parseInt(result.interviewsCompleted) || 0,
          avgTime: 1, // Typically 1 day between scheduling and completion
        },
        {
          stage: 'interview_completed',
          current: parseInt(result.interviewsCompleted) || 0,
          next: parseInt(result.offersExtended) || 0,
          avgTime: parseFloat(result.avgTimeToOffer) || 0,
        },
        {
          stage: 'offer_extended',
          current: parseInt(result.offersExtended) || 0,
          next: parseInt(result.candidatesHired) || 0,
          avgTime: 3, // Typical offer response time
        },
      ];

      const bottlenecks: PipelineBottleneckDto[] = stages.map((stage) => {
        const dropOffRate =
          stage.current > 0
            ? ((stage.current - stage.next) / stage.current) * 100
            : 0;
        const isBottleneck = dropOffRate > 50 || stage.avgTime > 7; // More than 50% drop-off or more than 7 days

        return {
          stage: stage.stage,
          dropOffRate,
          averageTimeInStage: stage.avgTime,
          candidatesInStage: stage.current,
          isBottleneck,
        };
      });

      return bottlenecks.sort((a, b) => b.dropOffRate - a.dropOffRate);
    } catch (error) {
      this.logger.error(
        `Error identifying bottlenecks: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getStagePerformance(query: AnalyticsQueryDto): Promise<any[]> {
    this.logger.log(
      `Getting stage performance for query: ${JSON.stringify(query)}`,
    );

    try {
      const applicationQuery = this.applicationRepository
        .createQueryBuilder('app')
        .leftJoin('app.companyJobVariant', 'cjv')
        .leftJoin('app.stageHistory', 'sh');

      if (query.companyId) {
        applicationQuery.andWhere('cjv.companyProfileId = :companyId', {
          companyId: query.companyId,
        });
      }

      if (query.jobVariantId) {
        applicationQuery.andWhere('app.companyJobVariantId = :jobVariantId', {
          jobVariantId: query.jobVariantId,
        });
      }

      if (query.startDate && query.endDate) {
        applicationQuery.andWhere(
          'app.appliedAt BETWEEN :startDate AND :endDate',
          {
            startDate: query.startDate,
            endDate: query.endDate,
          },
        );
      }

      const applications = await applicationQuery
        .select([
          'app.id',
          'app.status',
          'app.appliedAt',
          'app.lastUpdated',
          'sh.fromStage',
          'sh.toStage',
          'sh.changedAt',
        ])
        .getMany();

      // Process applications to calculate stage performance
      const stageStats = new Map();

      applications.forEach((app) => {
        if (app.stageHistory && app.stageHistory.length > 0) {
          app.stageHistory.forEach((history) => {
            const stage = history.toStage;
            if (!stageStats.has(stage)) {
              stageStats.set(stage, {
                stage,
                totalCandidates: 0,
                averageTimeInStage: 0,
                totalTime: 0,
              });
            }

            const stats = stageStats.get(stage);
            stats.totalCandidates++;

            // Calculate time in stage (simplified)
            const timeInStage = history.changedAt
              ? (new Date(history.changedAt).getTime() -
                  new Date(app.appliedAt).getTime()) /
                (1000 * 60 * 60 * 24)
              : 0;
            stats.totalTime += timeInStage;
          });
        }
      });

      // Calculate averages
      const results = Array.from(stageStats.values()).map((stats) => ({
        ...stats,
        averageTimeInStage:
          stats.totalCandidates > 0
            ? stats.totalTime / stats.totalCandidates
            : 0,
      }));

      return results;
    } catch (error) {
      this.logger.error(
        `Error getting stage performance: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async calculateTimeToFill(
    companyId: string,
    jobVariantId?: string,
  ): Promise<number> {
    this.logger.log(
      `Calculating time to fill for company: ${companyId}, job: ${jobVariantId}`,
    );

    try {
      const queryBuilder = this.applicationRepository
        .createQueryBuilder('app')
        .leftJoin('app.companyJobVariant', 'cjv')
        .where('app.status = :status', { status: 'hired' })
        .andWhere('cjv.companyProfileId = :companyId', { companyId });

      if (jobVariantId) {
        queryBuilder.andWhere('app.companyJobVariantId = :jobVariantId', {
          jobVariantId,
        });
      }

      const hiredApplications = await queryBuilder
        .select(['app.appliedAt', 'app.lastUpdated'])
        .getMany();

      if (hiredApplications.length === 0) {
        return 0;
      }

      const totalDays = hiredApplications.reduce((sum, app) => {
        const days =
          (new Date(app.lastUpdated).getTime() -
            new Date(app.appliedAt).getTime()) /
          (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);

      return totalDays / hiredApplications.length;
    } catch (error) {
      this.logger.error(
        `Error calculating time to fill: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
