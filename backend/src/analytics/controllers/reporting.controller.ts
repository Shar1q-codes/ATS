import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ReportingService } from '../services/reporting.service';
import { ExportService } from '../services/export.service';
import { AnalyticsCacheService } from '../services/analytics-cache.service';
import { DiversityAnalyticsService } from '../services/diversity-analytics.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import {
  DashboardDataDto,
  ReportGenerationDto,
  ReportDownloadDto,
  BiasDetectionDto,
  DiversityReportDto,
  ExportFormatDto,
} from '../dto/reporting.dto';

@Controller('analytics/reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
  private readonly logger = new Logger(ReportingController.name);

  constructor(
    private readonly reportingService: ReportingService,
    private readonly exportService: ExportService,
    private readonly cacheService: AnalyticsCacheService,
    private readonly diversityAnalyticsService: DiversityAnalyticsService,
  ) {}

  @Get('dashboard')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getDashboardData(
    @Query() query: AnalyticsQueryDto,
  ): Promise<DashboardDataDto> {
    this.logger.log(
      `Getting dashboard data with query: ${JSON.stringify(query)}`,
    );

    try {
      // Check cache first
      const cachedData = await this.cacheService.getDashboardData(query);
      if (cachedData) {
        this.logger.log('Returning cached dashboard data');
        return cachedData;
      }

      // Get fresh data
      const dashboardData = await this.reportingService.getDashboardData(query);

      // Cache the result
      await this.cacheService.setDashboardData(query, dashboardData);

      return dashboardData;
    } catch (error) {
      this.logger.error(
        `Error getting dashboard data: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to retrieve dashboard data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async generateReport(
    @Body() reportConfig: ReportGenerationDto,
  ): Promise<ReportDownloadDto> {
    this.logger.log(
      `Generating report with config: ${JSON.stringify(reportConfig)}`,
    );

    try {
      const { reportId, downloadUrl } =
        await this.reportingService.generateReport(reportConfig);

      return {
        reportId,
        downloadUrl,
        format: reportConfig.format,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };
    } catch (error) {
      this.logger.error(
        `Error generating report: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to generate report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('export/csv')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async exportToCSV(
    @Body() query: AnalyticsQueryDto,
  ): Promise<{ downloadUrl: string }> {
    this.logger.log(
      `Exporting data to CSV with query: ${JSON.stringify(query)}`,
    );

    try {
      const dashboardData = await this.reportingService.getDashboardData(query);
      const filename = `analytics_report_${Date.now()}`;
      const downloadUrl = await this.exportService.exportToCSV(
        dashboardData,
        filename,
      );

      return { downloadUrl };
    } catch (error) {
      this.logger.error(
        `Error exporting to CSV: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to export data to CSV',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('export/pdf')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async exportToPDF(
    @Body() query: AnalyticsQueryDto,
  ): Promise<{ downloadUrl: string }> {
    this.logger.log(
      `Exporting data to PDF with query: ${JSON.stringify(query)}`,
    );

    try {
      const dashboardData = await this.reportingService.getDashboardData(query);
      const filename = `analytics_report_${Date.now()}`;
      const downloadUrl = await this.exportService.exportToPDF(
        dashboardData,
        filename,
      );

      return { downloadUrl };
    } catch (error) {
      this.logger.error(
        `Error exporting to PDF: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to export data to PDF',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('export/excel')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async exportToExcel(
    @Body() query: AnalyticsQueryDto,
  ): Promise<{ downloadUrl: string }> {
    this.logger.log(
      `Exporting data to Excel with query: ${JSON.stringify(query)}`,
    );

    try {
      const dashboardData = await this.reportingService.getDashboardData(query);
      const filename = `analytics_report_${Date.now()}`;
      const downloadUrl = await this.exportService.exportToExcel(
        dashboardData,
        filename,
      );

      return { downloadUrl };
    } catch (error) {
      this.logger.error(
        `Error exporting to Excel: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to export data to Excel',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('diversity/bias-detection/:companyId')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getBiasDetection(
    @Param('companyId') companyId: string,
    @Query('jobVariantId') jobVariantId?: string,
  ): Promise<BiasDetectionDto[]> {
    this.logger.log(
      `Getting bias detection for company: ${companyId}, job: ${jobVariantId}`,
    );

    try {
      const biasIndicators =
        await this.diversityAnalyticsService.calculateBiasIndicators(
          companyId,
          jobVariantId,
        );

      return this.convertToBiasDetectionDto(biasIndicators);
    } catch (error) {
      this.logger.error(
        `Error getting bias detection: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to retrieve bias detection data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('diversity/report/:companyId')
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getDiversityReport(
    @Param('companyId') companyId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<DiversityReportDto> {
    this.logger.log(`Getting diversity report for company: ${companyId}`);

    try {
      const diversityAnalytics =
        await this.diversityAnalyticsService.getDiversityAnalytics({
          ...query,
          companyId,
        });

      const biasIndicators =
        await this.diversityAnalyticsService.calculateBiasIndicators(
          companyId,
          query.jobVariantId,
        );

      return {
        companyId,
        dateRange: {
          startDate:
            query.startDate ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: query.endDate || new Date().toISOString(),
        },
        overallDiversityIndex: diversityAnalytics.diversityIndex,
        biasIndicators: this.convertToBiasDetectionDto(biasIndicators),
        recommendations:
          this.generateDiversityRecommendations(diversityAnalytics),
        complianceStatus: {
          gdpr: true, // Placeholder - implement actual compliance checks
          eeoc: true,
          localRegulations: true,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting diversity report: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to retrieve diversity report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cache/clear')
  @Roles('admin')
  async clearCache(): Promise<{ message: string }> {
    this.logger.log('Clearing analytics cache');

    try {
      await this.cacheService.clear();
      return { message: 'Analytics cache cleared successfully' };
    } catch (error) {
      this.logger.error(`Error clearing cache: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to clear cache',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cache/invalidate/:companyId')
  @Roles('admin')
  async invalidateCompanyCache(
    @Param('companyId') companyId: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Invalidating cache for company: ${companyId}`);

    try {
      await this.cacheService.invalidateCompanyCache(companyId);
      return { message: `Cache invalidated for company ${companyId}` };
    } catch (error) {
      this.logger.error(
        `Error invalidating company cache: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to invalidate company cache',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('cache/stats')
  @Roles('admin')
  async getCacheStats(): Promise<{ size: number; keys: string[] }> {
    this.logger.log('Getting cache statistics');
    return this.cacheService.getCacheStats();
  }

  private convertToBiasDetectionDto(biasIndicators: any): BiasDetectionDto[] {
    const indicators: BiasDetectionDto[] = [];

    if (biasIndicators.genderBias !== undefined) {
      indicators.push({
        metric: 'Gender Bias',
        threshold: 0.1, // 10% threshold
        actualValue: Math.abs(biasIndicators.genderBias),
        severity: this.calculateSeverity(
          Math.abs(biasIndicators.genderBias),
          0.1,
        ),
        description: 'Measures gender representation bias in hiring decisions',
        recommendation: this.getGenderBiasRecommendation(
          biasIndicators.genderBias,
        ),
      });
    }

    if (biasIndicators.ethnicityBias !== undefined) {
      indicators.push({
        metric: 'Ethnicity Bias',
        threshold: 0.15,
        actualValue: Math.abs(biasIndicators.ethnicityBias),
        severity: this.calculateSeverity(
          Math.abs(biasIndicators.ethnicityBias),
          0.15,
        ),
        description: 'Measures ethnic diversity bias in hiring decisions',
        recommendation: this.getEthnicityBiasRecommendation(
          biasIndicators.ethnicityBias,
        ),
      });
    }

    if (biasIndicators.ageBias !== undefined) {
      indicators.push({
        metric: 'Age Bias',
        threshold: 0.2,
        actualValue: Math.abs(biasIndicators.ageBias),
        severity: this.calculateSeverity(Math.abs(biasIndicators.ageBias), 0.2),
        description: 'Measures age-related bias in hiring decisions',
        recommendation: this.getAgeBiasRecommendation(biasIndicators.ageBias),
      });
    }

    return indicators;
  }

  private calculateSeverity(
    value: number,
    threshold: number,
  ): 'low' | 'medium' | 'high' {
    if (value <= threshold) return 'low';
    if (value <= threshold * 2) return 'medium';
    return 'high';
  }

  private getGenderBiasRecommendation(bias: number): string {
    if (Math.abs(bias) < 0.1) {
      return 'Gender representation appears balanced. Continue monitoring.';
    }
    return 'Consider reviewing hiring practices to ensure gender-neutral evaluation criteria.';
  }

  private getEthnicityBiasRecommendation(bias: number): string {
    if (Math.abs(bias) < 0.15) {
      return 'Ethnic diversity appears adequate. Continue monitoring.';
    }
    return 'Consider expanding recruitment channels to reach more diverse candidate pools.';
  }

  private getAgeBiasRecommendation(bias: number): string {
    if (Math.abs(bias) < 0.2) {
      return 'Age distribution appears balanced. Continue monitoring.';
    }
    return 'Review job requirements and recruitment channels for potential age-related barriers.';
  }

  private generateDiversityRecommendations(analytics: any): string[] {
    const recommendations: string[] = [];

    if (analytics.diversityIndex < 0.6) {
      recommendations.push(
        'Consider expanding recruitment channels to reach more diverse candidates',
      );
    }

    if (analytics.genderBalance.bias > 0.1) {
      recommendations.push(
        'Review job descriptions and requirements for gender-neutral language',
      );
    }

    if (analytics.biasAlerts && analytics.biasAlerts.length > 0) {
      recommendations.push(
        'Address identified bias alerts through targeted interventions',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Diversity metrics are within acceptable ranges. Continue monitoring.',
      );
    }

    return recommendations;
  }
}
