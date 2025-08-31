import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import { Cron, CronExpression } from '@nestjs/schedule';
import { PipelineMetrics } from '../../entities/pipeline-metrics.entity';
import { SourcePerformance } from '../../entities/source-performance.entity';
import { DiversityMetrics } from '../../entities/diversity-metrics.entity';
import { Application } from '../../entities/application.entity';
import { Candidate } from '../../entities/candidate.entity';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';

@Injectable()
export class DataAggregationService {
  private readonly logger = new Logger(DataAggregationService.name);

  constructor(
    @InjectRepository(PipelineMetrics)
    private pipelineMetricsRepository: Repository<PipelineMetrics>,
    @InjectRepository(SourcePerformance)
    private sourcePerformanceRepository: Repository<SourcePerformance>,
    @InjectRepository(DiversityMetrics)
    private diversityMetricsRepository: Repository<DiversityMetrics>,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(CompanyJobVariant)
    private companyJobVariantRepository: Repository<CompanyJobVariant>,
  ) {}

  // @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyAggregation(): Promise<void> {
    this.logger.log('Starting daily metrics aggregation');

    try {
      await Promise.all([
        this.aggregatePipelineMetrics(),
        this.aggregateSourcePerformance(),
        this.aggregateDiversityMetrics(),
      ]);

      this.logger.log('Daily metrics aggregation completed successfully');
    } catch (error) {
      this.logger.error(
        `Error in daily aggregation: ${error.message}`,
        error.stack,
      );
    }
  }

  async aggregatePipelineMetrics(companyId?: string): Promise<void> {
    this.logger.log(
      `Aggregating pipeline metrics for company: ${companyId || 'all'}`,
    );

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateRange = yesterday.toISOString().split('T')[0];

      // Get all company job variants
      const queryBuilder = this.companyJobVariantRepository
        .createQueryBuilder('cjv')
        .leftJoin('cjv.companyProfile', 'cp');

      if (companyId) {
        queryBuilder.where('cp.id = :companyId', { companyId });
      }

      const jobVariants = await queryBuilder.getMany();

      for (const jobVariant of jobVariants) {
        await this.aggregatePipelineMetricsForJobVariant(jobVariant, dateRange);
      }

      // Also aggregate company-wide metrics
      const companies = await this.companyJobVariantRepository
        .createQueryBuilder('cjv')
        .leftJoin('cjv.companyProfile', 'cp')
        .select('DISTINCT cp.id', 'companyId')
        .getRawMany();

      for (const company of companies) {
        if (!companyId || company.companyId === companyId) {
          await this.aggregatePipelineMetricsForCompany(
            company.companyId,
            dateRange,
          );
        }
      }

      this.logger.log('Pipeline metrics aggregation completed');
    } catch (error) {
      this.logger.error(
        `Error aggregating pipeline metrics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async aggregatePipelineMetricsForJobVariant(
    jobVariant: CompanyJobVariant,
    dateRange: string,
  ): Promise<void> {
    const applications = await this.applicationRepository
      .createQueryBuilder('app')
      .where('app.companyJobVariantId = :jobVariantId', {
        jobVariantId: jobVariant.id,
      })
      .andWhere('DATE(app.appliedAt) = :dateRange', { dateRange })
      .getMany();

    const metrics = this.calculatePipelineMetricsFromApplications(applications);

    // Check if metrics already exist for this date
    const existingMetrics = await this.pipelineMetricsRepository.findOne({
      where: {
        companyId: jobVariant.companyProfileId,
        jobVariantId: jobVariant.id,
        dateRange,
      },
    });

    if (existingMetrics) {
      // Update existing metrics
      Object.assign(existingMetrics, metrics);
      await this.pipelineMetricsRepository.save(existingMetrics);
    } else {
      // Create new metrics
      const newMetrics = this.pipelineMetricsRepository.create({
        companyId: jobVariant.companyProfileId,
        jobVariantId: jobVariant.id,
        dateRange,
        ...metrics,
      });
      await this.pipelineMetricsRepository.save(newMetrics);
    }
  }

  private async aggregatePipelineMetricsForCompany(
    companyId: string,
    dateRange: string,
  ): Promise<void> {
    const applications = await this.applicationRepository
      .createQueryBuilder('app')
      .leftJoin('app.companyJobVariant', 'cjv')
      .where('cjv.companyProfileId = :companyId', { companyId })
      .andWhere('DATE(app.appliedAt) = :dateRange', { dateRange })
      .getMany();

    const metrics = this.calculatePipelineMetricsFromApplications(applications);

    // Check if company-wide metrics already exist for this date
    const existingMetrics = await this.pipelineMetricsRepository.findOne({
      where: {
        companyId,
        jobVariantId: null, // Company-wide metrics
        dateRange,
      },
    });

    if (existingMetrics) {
      Object.assign(existingMetrics, metrics);
      await this.pipelineMetricsRepository.save(existingMetrics);
    } else {
      const newMetrics = this.pipelineMetricsRepository.create({
        companyId,
        jobVariantId: null,
        dateRange,
        ...metrics,
      });
      await this.pipelineMetricsRepository.save(newMetrics);
    }
  }

  private calculatePipelineMetricsFromApplications(
    applications: Application[],
  ): any {
    const statusCounts = {
      totalApplications: applications.length,
      applicationsScreened: 0,
      applicationsShortlisted: 0,
      interviewsScheduled: 0,
      interviewsCompleted: 0,
      offersExtended: 0,
      offersAccepted: 0,
      candidatesHired: 0,
      candidatesRejected: 0,
    };

    const timingData: number[] = [];

    applications.forEach((app) => {
      switch (app.status) {
        case 'screening':
          statusCounts.applicationsScreened++;
          break;
        case 'shortlisted':
          statusCounts.applicationsShortlisted++;
          break;
        case 'interview_scheduled':
          statusCounts.interviewsScheduled++;
          break;
        case 'interview_completed':
          statusCounts.interviewsCompleted++;
          break;
        case 'offer_extended':
          statusCounts.offersExtended++;
          break;
        case 'offer_accepted':
          statusCounts.offersAccepted++;
          break;
        case 'hired':
          statusCounts.candidatesHired++;
          // Calculate time to fill
          const timeToFill =
            (new Date(app.lastUpdated).getTime() -
              new Date(app.appliedAt).getTime()) /
            (1000 * 60 * 60 * 24);
          timingData.push(timeToFill);
          break;
        case 'rejected':
          statusCounts.candidatesRejected++;
          break;
      }
    });

    const avgTimeToFillDays =
      timingData.length > 0
        ? timingData.reduce((sum, time) => sum + time, 0) / timingData.length
        : null;

    return {
      ...statusCounts,
      avgTimeToFillDays,
      avgTimeToScreenDays: 2, // Placeholder - would need stage history to calculate accurately
      avgTimeToInterviewDays: 5, // Placeholder
      avgTimeToOfferDays: 3, // Placeholder
    };
  }

  async aggregateSourcePerformance(companyId?: string): Promise<void> {
    this.logger.log(
      `Aggregating source performance for company: ${companyId || 'all'}`,
    );

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateRange = yesterday.toISOString().split('T')[0];

      // Get candidates by source
      const queryBuilder = this.candidateRepository
        .createQueryBuilder('c')
        .leftJoin('c.applications', 'app')
        .leftJoin('app.companyJobVariant', 'cjv');

      if (companyId) {
        queryBuilder.where('cjv.companyProfileId = :companyId', { companyId });
      }

      queryBuilder.andWhere('DATE(c.createdAt) = :dateRange', { dateRange });

      const candidates = await queryBuilder
        .select([
          'c.id',
          'c.source',
          'app.status',
          'app.fitScore',
          'cjv.companyProfileId',
        ])
        .getMany();

      // Group by company and source
      const sourceStats = new Map<string, Map<string, any>>();

      candidates.forEach((candidate) => {
        const companyKey =
          candidate.applications?.[0]?.companyJobVariant?.companyProfileId ||
          'unknown';
        const source = candidate.source || 'unknown';

        if (!sourceStats.has(companyKey)) {
          sourceStats.set(companyKey, new Map());
        }

        const companyStats = sourceStats.get(companyKey);
        if (!companyStats.has(source)) {
          companyStats.set(source, {
            totalCandidates: 0,
            qualifiedCandidates: 0,
            interviewedCandidates: 0,
            hiredCandidates: 0,
            totalFitScore: 0,
          });
        }

        const stats = companyStats.get(source);
        stats.totalCandidates++;

        if (candidate.applications && candidate.applications.length > 0) {
          const app = candidate.applications[0];
          stats.totalFitScore += app.fitScore || 0;

          if (app.fitScore && app.fitScore >= 70) {
            stats.qualifiedCandidates++;
          }

          if (
            [
              'interview_scheduled',
              'interview_completed',
              'offer_extended',
              'hired',
            ].includes(app.status)
          ) {
            stats.interviewedCandidates++;
          }

          if (app.status === 'hired') {
            stats.hiredCandidates++;
          }
        }
      });

      // Save aggregated data
      for (const [companyKey, companyStats] of sourceStats) {
        for (const [source, stats] of companyStats) {
          const conversionRate =
            stats.totalCandidates > 0
              ? (stats.hiredCandidates / stats.totalCandidates) * 100
              : 0;

          const qualityScore =
            stats.totalCandidates > 0
              ? stats.totalFitScore / stats.totalCandidates
              : 0;

          const existingPerformance =
            await this.sourcePerformanceRepository.findOne({
              where: { companyId: companyKey, source, dateRange },
            });

          if (existingPerformance) {
            Object.assign(existingPerformance, {
              ...stats,
              conversionRate,
              qualityScore,
            });
            await this.sourcePerformanceRepository.save(existingPerformance);
          } else {
            const newPerformance = this.sourcePerformanceRepository.create({
              companyId: companyKey,
              source,
              dateRange,
              ...stats,
              conversionRate,
              qualityScore,
            });
            await this.sourcePerformanceRepository.save(newPerformance);
          }
        }
      }

      this.logger.log('Source performance aggregation completed');
    } catch (error) {
      this.logger.error(
        `Error aggregating source performance: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async aggregateDiversityMetrics(companyId?: string): Promise<void> {
    this.logger.log(
      `Aggregating diversity metrics for company: ${companyId || 'all'}`,
    );

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateRange = yesterday.toISOString().split('T')[0];

      // Get applications with candidate demographic data
      const queryBuilder = this.applicationRepository
        .createQueryBuilder('app')
        .leftJoin('app.candidate', 'c')
        .leftJoin('app.companyJobVariant', 'cjv');

      if (companyId) {
        queryBuilder.where('cjv.companyProfileId = :companyId', { companyId });
      }

      queryBuilder.andWhere('DATE(app.appliedAt) = :dateRange', { dateRange });

      const applications = await queryBuilder
        .select([
          'app.status',
          'c.gender',
          'c.ethnicity',
          'c.age',
          'c.education',
          'cjv.companyProfileId',
          'cjv.id',
        ])
        .getMany();

      // Group by company and job variant
      const diversityStats = new Map<string, Map<string, any>>();

      applications.forEach((app) => {
        const companyKey = app.companyJobVariant?.companyProfileId || 'unknown';
        const jobVariantKey = app.companyJobVariant?.id || 'company-wide';

        if (!diversityStats.has(companyKey)) {
          diversityStats.set(companyKey, new Map());
        }

        const companyStats = diversityStats.get(companyKey);
        if (!companyStats.has(jobVariantKey)) {
          companyStats.set(jobVariantKey, {
            totalApplicants: 0,
            genderDistribution: {},
            ethnicityDistribution: {},
            ageDistribution: {},
            educationDistribution: {},
            hiredDiversity: {
              gender: {},
              ethnicity: {},
              age: {},
              education: {},
            },
          });
        }

        const stats = companyStats.get(jobVariantKey);
        stats.totalApplicants++;

        // Count demographics
        const gender = app.candidate?.gender || 'unknown';
        const ethnicity = app.candidate?.ethnicity || 'unknown';
        const age = this.categorizeAge(app.candidate?.age);
        const education = app.candidate?.education || 'unknown';

        stats.genderDistribution[gender] =
          (stats.genderDistribution[gender] || 0) + 1;
        stats.ethnicityDistribution[ethnicity] =
          (stats.ethnicityDistribution[ethnicity] || 0) + 1;
        stats.ageDistribution[age] = (stats.ageDistribution[age] || 0) + 1;
        stats.educationDistribution[education] =
          (stats.educationDistribution[education] || 0) + 1;

        // Count hired demographics
        if (app.status === PipelineStage.HIRED) {
          stats.hiredDiversity.gender[gender] =
            (stats.hiredDiversity.gender[gender] || 0) + 1;
          stats.hiredDiversity.ethnicity[ethnicity] =
            (stats.hiredDiversity.ethnicity[ethnicity] || 0) + 1;
          stats.hiredDiversity.age[age] =
            (stats.hiredDiversity.age[age] || 0) + 1;
          stats.hiredDiversity.education[education] =
            (stats.hiredDiversity.education[education] || 0) + 1;
        }
      });

      // Save aggregated diversity metrics
      for (const [companyKey, companyStats] of diversityStats) {
        for (const [jobVariantKey, stats] of companyStats) {
          const biasIndicators = this.calculateBiasIndicators(stats);

          const existingMetrics = await this.diversityMetricsRepository.findOne(
            {
              where: {
                companyId: companyKey,
                jobVariantId:
                  jobVariantKey === 'company-wide' ? null : jobVariantKey,
                dateRange,
              },
            },
          );

          if (existingMetrics) {
            Object.assign(existingMetrics, {
              ...stats,
              biasIndicators,
            });
            await this.diversityMetricsRepository.save(existingMetrics);
          } else {
            const newMetrics = this.diversityMetricsRepository.create({
              companyId: companyKey,
              jobVariantId:
                jobVariantKey === 'company-wide' ? null : jobVariantKey,
              dateRange,
              ...stats,
              biasIndicators,
            });
            await this.diversityMetricsRepository.save(newMetrics);
          }
        }
      }

      this.logger.log('Diversity metrics aggregation completed');
    } catch (error) {
      this.logger.error(
        `Error aggregating diversity metrics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private categorizeAge(age?: number): string {
    if (!age) return 'unknown';
    if (age < 25) return 'under25';
    if (age <= 34) return '25-34';
    if (age <= 44) return '35-44';
    if (age <= 54) return '45-54';
    return 'over55';
  }

  private calculateBiasIndicators(stats: any): any {
    // Simple bias calculation based on representation differences
    const calculateCategoryBias = (
      applicantDist: Record<string, number>,
      hiredDist: Record<string, number>,
    ): number => {
      const totalApplicants = Object.values(applicantDist).reduce(
        (sum: number, count: number) => sum + count,
        0,
      );
      const totalHired = Object.values(hiredDist).reduce(
        (sum: number, count: number) => sum + count,
        0,
      );

      if (totalApplicants === 0 || totalHired === 0) return 0;

      let maxBias = 0;
      Object.keys(applicantDist).forEach((category) => {
        const applicantRate = applicantDist[category] / totalApplicants;
        const hiredRate = (hiredDist[category] || 0) / totalHired;
        const bias = Math.abs(hiredRate - applicantRate);
        maxBias = Math.max(maxBias, bias);
      });

      return maxBias;
    };

    return {
      genderBias: calculateCategoryBias(
        stats.genderDistribution,
        stats.hiredDiversity.gender,
      ),
      ethnicityBias: calculateCategoryBias(
        stats.ethnicityDistribution,
        stats.hiredDiversity.ethnicity,
      ),
      ageBias: calculateCategoryBias(
        stats.ageDistribution,
        stats.hiredDiversity.age,
      ),
      educationBias: calculateCategoryBias(
        stats.educationDistribution,
        stats.hiredDiversity.education,
      ),
    };
  }
}
