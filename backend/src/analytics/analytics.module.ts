import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { CacheModule } from '@nestjs/cache-manager';
import { PipelineMetrics } from '../entities/pipeline-metrics.entity';
import { SourcePerformance } from '../entities/source-performance.entity';
import { DiversityMetrics } from '../entities/diversity-metrics.entity';
import { Application } from '../entities/application.entity';
import { Candidate } from '../entities/candidate.entity';
import { CompanyJobVariant } from '../entities/company-job-variant.entity';
import { AnalyticsService } from './services/analytics.service';
import { PipelineAnalyticsService } from './services/pipeline-analytics.service';
import { SourceAnalyticsService } from './services/source-analytics.service';
import { DiversityAnalyticsService } from './services/diversity-analytics.service';
import { DataAggregationService } from './services/data-aggregation.service';
import { ReportingService } from './services/reporting.service';
import { ExportService } from './services/export.service';
import { AnalyticsCacheService } from './services/analytics-cache.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { ReportingController } from './controllers/reporting.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PipelineMetrics,
      SourcePerformance,
      DiversityMetrics,
      Application,
      Candidate,
      CompanyJobVariant,
    ]),
    // CacheModule.register({
    //   ttl: 300, // 5 minutes cache for analytics data
    // }),
  ],
  controllers: [AnalyticsController, ReportingController],
  providers: [
    AnalyticsService,
    PipelineAnalyticsService,
    SourceAnalyticsService,
    DiversityAnalyticsService,
    DataAggregationService,
    ReportingService,
    ExportService,
    AnalyticsCacheService,
  ],
  exports: [
    AnalyticsService,
    PipelineAnalyticsService,
    SourceAnalyticsService,
    DiversityAnalyticsService,
    DataAggregationService,
    ReportingService,
    ExportService,
    AnalyticsCacheService,
  ],
})
export class AnalyticsModule {}
