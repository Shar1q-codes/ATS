import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiversityMetrics } from '../../entities/diversity-metrics.entity';
import { Candidate } from '../../entities/candidate.entity';
import { Application } from '../../entities/application.entity';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { DiversityAnalyticsDto } from '../dto/analytics-response.dto';

@Injectable()
export class DiversityAnalyticsService {
  private readonly logger = new Logger(DiversityAnalyticsService.name);

  constructor(
    @InjectRepository(DiversityMetrics)
    private diversityMetricsRepository: Repository<DiversityMetrics>,
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
  ) {}

  async getDiversityAnalytics(
    query: AnalyticsQueryDto,
  ): Promise<DiversityAnalyticsDto> {
    this.logger.log(
      `Getting diversity analytics for query: ${JSON.stringify(query)}`,
    );

    try {
      const queryBuilder =
        this.diversityMetricsRepository.createQueryBuilder('dm');

      if (query.companyId) {
        queryBuilder.andWhere('dm.companyId = :companyId', {
          companyId: query.companyId,
        });
      }

      if (query.jobVariantId) {
        queryBuilder.andWhere('dm.jobVariantId = :jobVariantId', {
          jobVariantId: query.jobVariantId,
        });
      }

      if (query.startDate && query.endDate) {
        queryBuilder.andWhere('dm.dateRange BETWEEN :startDate AND :endDate', {
          startDate: query.startDate,
          endDate: query.endDate,
        });
      }

      const diversityMetrics = await queryBuilder.getMany();

      if (diversityMetrics.length === 0) {
        return this.getEmptyDiversityAnalytics();
      }

      // Aggregate metrics
      const aggregated = this.aggregateDiversityMetrics(diversityMetrics);

      // Calculate bias indicators
      const biasAlerts = this.calculateBiasAlerts(aggregated);

      return {
        totalApplicants: aggregated.totalApplicants,
        totalHired: aggregated.totalHired,
        diversityIndex: this.calculateDiversityIndex(aggregated),
        genderBalance: {
          applicants: aggregated.genderDistribution || {},
          hired: aggregated.hiredDiversity?.gender || {},
          bias: aggregated.biasIndicators?.genderBias || 0,
        },
        ethnicityBalance: {
          applicants: aggregated.ethnicityDistribution || {},
          hired: aggregated.hiredDiversity?.ethnicity || {},
          bias: aggregated.biasIndicators?.ethnicityBias || 0,
        },
        ageBalance: {
          applicants: aggregated.ageDistribution || {},
          hired: aggregated.hiredDiversity?.age || {},
          bias: aggregated.biasIndicators?.ageBias || 0,
        },
        educationBalance: {
          applicants: aggregated.educationDistribution || {},
          hired: aggregated.hiredDiversity?.education || {},
          bias: aggregated.biasIndicators?.educationBias || 0,
        },
        biasAlerts,
      };
    } catch (error) {
      this.logger.error(
        `Error getting diversity analytics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private aggregateDiversityMetrics(metrics: DiversityMetrics[]): any {
    const aggregated = {
      totalApplicants: 0,
      totalHired: 0,
      genderDistribution: {} as Record<string, number>,
      ethnicityDistribution: {} as Record<string, number>,
      ageDistribution: {} as Record<string, number>,
      educationDistribution: {} as Record<string, number>,
      hiredDiversity: {
        gender: {} as Record<string, number>,
        ethnicity: {} as Record<string, number>,
        age: {} as Record<string, number>,
        education: {} as Record<string, number>,
      },
      biasIndicators: {
        genderBias: 0,
        ethnicityBias: 0,
        ageBias: 0,
        educationBias: 0,
      },
    };

    metrics.forEach((metric) => {
      aggregated.totalApplicants += metric.totalApplicants;

      // Aggregate gender distribution
      if (metric.genderDistribution) {
        Object.entries(metric.genderDistribution).forEach(([key, value]) => {
          aggregated.genderDistribution[key] =
            (aggregated.genderDistribution[key] || 0) + value;
        });
      }

      // Aggregate ethnicity distribution
      if (metric.ethnicityDistribution) {
        Object.entries(metric.ethnicityDistribution).forEach(([key, value]) => {
          aggregated.ethnicityDistribution[key] =
            (aggregated.ethnicityDistribution[key] || 0) + value;
        });
      }

      // Aggregate age distribution
      if (metric.ageDistribution) {
        Object.entries(metric.ageDistribution).forEach(([key, value]) => {
          aggregated.ageDistribution[key] =
            (aggregated.ageDistribution[key] || 0) + value;
        });
      }

      // Aggregate education distribution
      if (metric.educationDistribution) {
        Object.entries(metric.educationDistribution).forEach(([key, value]) => {
          aggregated.educationDistribution[key] =
            (aggregated.educationDistribution[key] || 0) + value;
        });
      }

      // Aggregate hired diversity
      if (metric.hiredDiversity) {
        ['gender', 'ethnicity', 'age', 'education'].forEach((category) => {
          if (metric.hiredDiversity[category]) {
            Object.entries(metric.hiredDiversity[category]).forEach(
              ([key, value]) => {
                aggregated.hiredDiversity[category][key] =
                  (aggregated.hiredDiversity[category][key] || 0) + value;
                aggregated.totalHired += value;
              },
            );
          }
        });
      }

      // Average bias indicators
      if (metric.biasIndicators) {
        aggregated.biasIndicators.genderBias +=
          metric.biasIndicators.genderBias || 0;
        aggregated.biasIndicators.ethnicityBias +=
          metric.biasIndicators.ethnicityBias || 0;
        aggregated.biasIndicators.ageBias += metric.biasIndicators.ageBias || 0;
        aggregated.biasIndicators.educationBias +=
          metric.biasIndicators.educationBias || 0;
      }
    });

    // Average bias indicators
    const metricCount = metrics.length;
    if (metricCount > 0) {
      aggregated.biasIndicators.genderBias /= metricCount;
      aggregated.biasIndicators.ethnicityBias /= metricCount;
      aggregated.biasIndicators.ageBias /= metricCount;
      aggregated.biasIndicators.educationBias /= metricCount;
    }

    return aggregated;
  }

  private calculateDiversityIndex(aggregated: any): number {
    // Calculate Shannon Diversity Index for gender distribution
    const total = aggregated.totalApplicants;
    if (total === 0) return 0;

    let diversityIndex = 0;
    Object.values(aggregated.genderDistribution).forEach((count: number) => {
      if (count > 0) {
        const proportion = count / total;
        diversityIndex -= proportion * Math.log(proportion);
      }
    });

    // Normalize to 0-1 scale (assuming max 4 gender categories)
    return Math.min(diversityIndex / Math.log(4), 1);
  }

  private calculateBiasAlerts(aggregated: any): string[] {
    const alerts: string[] = [];
    const biasThreshold = 0.3; // 30% bias threshold

    if (Math.abs(aggregated.biasIndicators.genderBias) > biasThreshold) {
      alerts.push(
        `Gender bias detected: ${(aggregated.biasIndicators.genderBias * 100).toFixed(1)}%`,
      );
    }

    if (Math.abs(aggregated.biasIndicators.ethnicityBias) > biasThreshold) {
      alerts.push(
        `Ethnicity bias detected: ${(aggregated.biasIndicators.ethnicityBias * 100).toFixed(1)}%`,
      );
    }

    if (Math.abs(aggregated.biasIndicators.ageBias) > biasThreshold) {
      alerts.push(
        `Age bias detected: ${(aggregated.biasIndicators.ageBias * 100).toFixed(1)}%`,
      );
    }

    if (Math.abs(aggregated.biasIndicators.educationBias) > biasThreshold) {
      alerts.push(
        `Education bias detected: ${(aggregated.biasIndicators.educationBias * 100).toFixed(1)}%`,
      );
    }

    return alerts;
  }

  private getEmptyDiversityAnalytics(): DiversityAnalyticsDto {
    return {
      totalApplicants: 0,
      totalHired: 0,
      diversityIndex: 0,
      genderBalance: {
        applicants: {},
        hired: {},
        bias: 0,
      },
      ethnicityBalance: {
        applicants: {},
        hired: {},
        bias: 0,
      },
      ageBalance: {
        applicants: {},
        hired: {},
        bias: 0,
      },
      educationBalance: {
        applicants: {},
        hired: {},
        bias: 0,
      },
      biasAlerts: [],
    };
  }

  async calculateBiasIndicators(
    companyId: string,
    jobVariantId?: string,
  ): Promise<any> {
    this.logger.log(
      `Calculating bias indicators for company: ${companyId}, job: ${jobVariantId}`,
    );

    try {
      // Get all applications for the specified criteria
      const queryBuilder = this.applicationRepository
        .createQueryBuilder('app')
        .leftJoin('app.candidate', 'c')
        .leftJoin('app.companyJobVariant', 'cjv')
        .where('cjv.companyProfileId = :companyId', { companyId });

      if (jobVariantId) {
        queryBuilder.andWhere('app.companyJobVariantId = :jobVariantId', {
          jobVariantId,
        });
      }

      const applications = await queryBuilder
        .select([
          'app.status',
          'app.fitScore',
          'c.gender',
          'c.ethnicity',
          'c.age',
          'c.education',
        ])
        .getMany();

      if (applications.length === 0) {
        return {
          genderBias: 0,
          ethnicityBias: 0,
          ageBias: 0,
          educationBias: 0,
        };
      }

      // Calculate bias for each demographic category
      const genderBias = this.calculateCategoryBias(applications, 'gender');
      const ethnicityBias = this.calculateCategoryBias(
        applications,
        'ethnicity',
      );
      const ageBias = this.calculateCategoryBias(applications, 'age');
      const educationBias = this.calculateCategoryBias(
        applications,
        'education',
      );

      return {
        genderBias,
        ethnicityBias,
        ageBias,
        educationBias,
      };
    } catch (error) {
      this.logger.error(
        `Error calculating bias indicators: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private calculateCategoryBias(applications: any[], category: string): number {
    const categoryStats = new Map<
      string,
      {
        total: number;
        hired: number;
        avgFitScore: number;
        totalFitScore: number;
      }
    >();

    applications.forEach((app) => {
      const categoryValue = app.candidate?.[category] || 'unknown';

      if (!categoryStats.has(categoryValue)) {
        categoryStats.set(categoryValue, {
          total: 0,
          hired: 0,
          avgFitScore: 0,
          totalFitScore: 0,
        });
      }

      const stats = categoryStats.get(categoryValue);
      stats.total++;
      stats.totalFitScore += app.fitScore || 0;

      if (app.status === 'hired') {
        stats.hired++;
      }
    });

    // Calculate average fit scores and hire rates
    const categoryRates: {
      category: string;
      hireRate: number;
      avgFitScore: number;
    }[] = [];

    categoryStats.forEach((stats, categoryValue) => {
      const hireRate = stats.total > 0 ? stats.hired / stats.total : 0;
      const avgFitScore =
        stats.total > 0 ? stats.totalFitScore / stats.total : 0;

      categoryRates.push({
        category: categoryValue,
        hireRate,
        avgFitScore,
      });
    });

    if (categoryRates.length < 2) {
      return 0; // No bias if only one category
    }

    // Calculate bias as the difference between highest and lowest hire rates
    const hireRates = categoryRates.map((cr) => cr.hireRate);
    const maxHireRate = Math.max(...hireRates);
    const minHireRate = Math.min(...hireRates);

    // Return bias as a value between -1 and 1
    return (maxHireRate - minHireRate) * (maxHireRate > 0.5 ? 1 : -1);
  }
}
