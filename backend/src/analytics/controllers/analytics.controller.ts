import {
  Controller,
  Get,
  Query,
  Post,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AnalyticsService } from '../services/analytics.service';
import { PipelineAnalyticsService } from '../services/pipeline-analytics.service';
import { SourceAnalyticsService } from '../services/source-analytics.service';
import { DiversityAnalyticsService } from '../services/diversity-analytics.service';
import { DataAggregationService } from '../services/data-aggregation.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import {
  AnalyticsSummaryDto,
  TimeToFillMetricsDto,
  ConversionRatesDto,
  SourceAnalyticsDto,
  DiversityAnalyticsDto,
} from '../dto/analytics-response.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly pipelineAnalyticsService: PipelineAnalyticsService,
    private readonly sourceAnalyticsService: SourceAnalyticsService,
    private readonly diversityAnalyticsService: DiversityAnalyticsService,
    private readonly dataAggregationService: DataAggregationService,
  ) {}

  @Get('summary')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getAnalyticsSummary(
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsSummaryDto> {
    this.logger.log(
      `Getting analytics summary with query: ${JSON.stringify(query)}`,
    );
    return this.analyticsService.getAnalyticsSummary(query);
  }

  @Get('time-to-fill')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getTimeToFillMetrics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<TimeToFillMetricsDto> {
    this.logger.log(
      `Getting time-to-fill metrics with query: ${JSON.stringify(query)}`,
    );
    return this.analyticsService.getTimeToFillMetrics(query);
  }

  @Get('conversion-rates')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getConversionRates(
    @Query() query: AnalyticsQueryDto,
  ): Promise<ConversionRatesDto> {
    this.logger.log(
      `Getting conversion rates with query: ${JSON.stringify(query)}`,
    );
    return this.analyticsService.getConversionRates(query);
  }

  @Get('pipeline/bottlenecks')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getPipelineBottlenecks(@Query() query: AnalyticsQueryDto) {
    this.logger.log(
      `Getting pipeline bottlenecks with query: ${JSON.stringify(query)}`,
    );
    return this.pipelineAnalyticsService.getBottlenecks(query);
  }

  @Get('pipeline/stage-performance')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getStagePerformance(@Query() query: AnalyticsQueryDto) {
    this.logger.log(
      `Getting stage performance with query: ${JSON.stringify(query)}`,
    );
    return this.pipelineAnalyticsService.getStagePerformance(query);
  }

  @Get('sources/performance')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getSourcePerformance(
    @Query() query: AnalyticsQueryDto,
  ): Promise<SourceAnalyticsDto[]> {
    this.logger.log(
      `Getting source performance with query: ${JSON.stringify(query)}`,
    );
    return this.sourceAnalyticsService.getSourcePerformance(query);
  }

  @Get('sources/top-performing/:companyId')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getTopPerformingSources(
    @Param('companyId') companyId: string,
    @Query('limit') limit?: number,
  ): Promise<SourceAnalyticsDto[]> {
    this.logger.log(`Getting top performing sources for company: ${companyId}`);
    return this.sourceAnalyticsService.getTopPerformingSources(
      companyId,
      limit || 5,
    );
  }

  @Get('diversity')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getDiversityAnalytics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<DiversityAnalyticsDto> {
    this.logger.log(
      `Getting diversity analytics with query: ${JSON.stringify(query)}`,
    );
    return this.diversityAnalyticsService.getDiversityAnalytics(query);
  }

  @Get('diversity/bias-indicators/:companyId')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getBiasIndicators(
    @Param('companyId') companyId: string,
    @Query('jobVariantId') jobVariantId?: string,
  ) {
    this.logger.log(
      `Getting bias indicators for company: ${companyId}, job: ${jobVariantId}`,
    );
    return this.diversityAnalyticsService.calculateBiasIndicators(
      companyId,
      jobVariantId,
    );
  }

  @Post('refresh')
  @Roles('admin')
  async refreshMetrics(
    @Query('companyId') companyId?: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Refreshing metrics for company: ${companyId || 'all'}`);
    await this.analyticsService.refreshMetrics(companyId);
    return { message: 'Metrics refresh initiated successfully' };
  }

  @Post('aggregate/pipeline')
  @Roles('admin')
  async aggregatePipelineMetrics(
    @Query('companyId') companyId?: string,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Aggregating pipeline metrics for company: ${companyId || 'all'}`,
    );
    await this.dataAggregationService.aggregatePipelineMetrics(companyId);
    return { message: 'Pipeline metrics aggregation completed' };
  }

  @Post('aggregate/sources')
  @Roles('admin')
  async aggregateSourcePerformance(
    @Query('companyId') companyId?: string,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Aggregating source performance for company: ${companyId || 'all'}`,
    );
    await this.dataAggregationService.aggregateSourcePerformance(companyId);
    return { message: 'Source performance aggregation completed' };
  }

  @Post('aggregate/diversity')
  @Roles('admin')
  async aggregateDiversityMetrics(
    @Query('companyId') companyId?: string,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Aggregating diversity metrics for company: ${companyId || 'all'}`,
    );
    await this.dataAggregationService.aggregateDiversityMetrics(companyId);
    return { message: 'Diversity metrics aggregation completed' };
  }
}
