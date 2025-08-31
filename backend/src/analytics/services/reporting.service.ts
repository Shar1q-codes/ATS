import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineMetrics } from '../../entities/pipeline-metrics.entity';
import { SourcePerformance } from '../../entities/source-performance.entity';
import { DiversityMetrics } from '../../entities/diversity-metrics.entity';
import { AnalyticsService } from './analytics.service';
import { PipelineAnalyticsService } from './pipeline-analytics.service';
import { SourceAnalyticsService } from './source-analytics.service';
import { DiversityAnalyticsService } from './diversity-analytics.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import {
  DashboardDataDto,
  ReportGenerationDto,
  ExportFormatDto,
} from '../dto/reporting.dto';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectRepository(PipelineMetrics)
    private pipelineMetricsRepository: Repository<PipelineMetrics>,
    @InjectRepository(SourcePerformance)
    private sourcePerformanceRepository: Repository<SourcePerformance>,
    @InjectRepository(DiversityMetrics)
    private diversityMetricsRepository: Repository<DiversityMetrics>,
    private analyticsService: AnalyticsService,
    private pipelineAnalyticsService: PipelineAnalyticsService,
    private sourceAnalyticsService: SourceAnalyticsService,
    private diversityAnalyticsService: DiversityAnalyticsService,
  ) {}

  async getDashboardData(query: AnalyticsQueryDto): Promise<DashboardDataDto> {
    this.logger.log(
      `Getting dashboard data for query: ${JSON.stringify(query)}`,
    );

    try {
      const [
        summary,
        pipelineBottlenecks,
        sourcePerformance,
        diversityAnalytics,
        trendData,
      ] = await Promise.all([
        this.analyticsService.getAnalyticsSummary(query),
        this.pipelineAnalyticsService.getBottlenecks(query),
        this.sourceAnalyticsService.getSourcePerformance(query),
        this.diversityAnalyticsService.getDiversityAnalytics(query),
        this.getTrendData(query),
      ]);

      return {
        summary,
        pipelineBottlenecks,
        sourcePerformance,
        diversityAnalytics,
        trendData,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error getting dashboard data: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async generateReport(
    reportConfig: ReportGenerationDto,
  ): Promise<{ reportId: string; downloadUrl: string }> {
    this.logger.log(
      `Generating report with config: ${JSON.stringify(reportConfig)}`,
    );

    try {
      const reportData = await this.collectReportData(reportConfig);
      const reportId = this.generateReportId();

      let downloadUrl: string;

      switch (reportConfig.format) {
        case ExportFormatDto.CSV:
          downloadUrl = await this.generateCSVReport(reportData, reportId);
          break;
        case ExportFormatDto.PDF:
          downloadUrl = await this.generatePDFReport(reportData, reportId);
          break;
        case ExportFormatDto.EXCEL:
          downloadUrl = await this.generateExcelReport(reportData, reportId);
          break;
        default:
          throw new Error(`Unsupported report format: ${reportConfig.format}`);
      }

      return { reportId, downloadUrl };
    } catch (error) {
      this.logger.error(
        `Error generating report: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async getTrendData(query: AnalyticsQueryDto) {
    this.logger.log('Getting trend data for dashboard');

    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

    const queryBuilder = this.pipelineMetricsRepository
      .createQueryBuilder('pm')
      .where('pm.dateRange BETWEEN :startDate AND :endDate', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

    if (query.companyId) {
      queryBuilder.andWhere('pm.companyId = :companyId', {
        companyId: query.companyId,
      });
    }

    const metrics = await queryBuilder.orderBy('pm.dateRange', 'ASC').getMany();

    return {
      applications: this.aggregateByPeriod(metrics, 'totalApplications'),
      hires: this.aggregateByPeriod(metrics, 'candidatesHired'),
      timeToFill: this.aggregateByPeriod(metrics, 'avgTimeToFillDays'),
    };
  }

  private aggregateByPeriod(
    metrics: PipelineMetrics[],
    field: keyof PipelineMetrics,
  ) {
    const aggregated = new Map<string, number>();

    metrics.forEach((metric) => {
      const date = new Date(metric.dateRange).toISOString().split('T')[0];
      const value = (metric[field] as number) || 0;
      aggregated.set(date, (aggregated.get(date) || 0) + value);
    });

    return Array.from(aggregated.entries()).map(([date, value]) => ({
      date,
      value,
    }));
  }

  private async collectReportData(config: ReportGenerationDto) {
    this.logger.log('Collecting data for report generation');

    const data: any = {};

    if (config.sections.includes('summary')) {
      data.summary = await this.analyticsService.getAnalyticsSummary(
        config.query,
      );
    }

    if (config.sections.includes('pipeline')) {
      data.pipeline = {
        bottlenecks: await this.pipelineAnalyticsService.getBottlenecks(
          config.query,
        ),
        stagePerformance:
          await this.pipelineAnalyticsService.getStagePerformance(config.query),
      };
    }

    if (config.sections.includes('sources')) {
      data.sources = await this.sourceAnalyticsService.getSourcePerformance(
        config.query,
      );
    }

    if (config.sections.includes('diversity')) {
      data.diversity =
        await this.diversityAnalyticsService.getDiversityAnalytics(
          config.query,
        );
    }

    if (config.sections.includes('trends')) {
      data.trends = await this.getTrendData(config.query);
    }

    return data;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateCSVReport(
    data: any,
    reportId: string,
  ): Promise<string> {
    this.logger.log(`Generating CSV report with ID: ${reportId}`);

    // This is a simplified implementation
    // In a real application, you would use a CSV library like 'csv-writer'
    const csvContent = this.convertToCSV(data);

    // In a real implementation, you would save this to a file storage service
    // and return the download URL
    return `/api/reports/download/${reportId}.csv`;
  }

  private async generatePDFReport(
    data: any,
    reportId: string,
  ): Promise<string> {
    this.logger.log(`Generating PDF report with ID: ${reportId}`);

    // This is a simplified implementation
    // In a real application, you would use a PDF library like 'puppeteer' or 'pdfkit'

    // In a real implementation, you would generate the PDF and save it to file storage
    return `/api/reports/download/${reportId}.pdf`;
  }

  private async generateExcelReport(
    data: any,
    reportId: string,
  ): Promise<string> {
    this.logger.log(`Generating Excel report with ID: ${reportId}`);

    // This is a simplified implementation
    // In a real application, you would use an Excel library like 'exceljs'

    // In a real implementation, you would generate the Excel file and save it to file storage
    return `/api/reports/download/${reportId}.xlsx`;
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    // In a real implementation, you would properly format all data sections
    let csv = '';

    if (data.summary) {
      csv += 'Summary Report\n';
      csv += `Total Applications,${data.summary.totalApplications}\n`;
      csv += `Total Hires,${data.summary.totalHires}\n`;
      csv += `Active Positions,${data.summary.activePositions}\n`;
      csv += `Average Time to Fill,${data.summary.timeToFill.averageDays}\n\n`;
    }

    if (data.sources) {
      csv += 'Source Performance\n';
      csv += 'Source,Total Candidates,Hired Candidates,Conversion Rate\n';
      data.sources.forEach((source: any) => {
        csv += `${source.source},${source.totalCandidates},${source.hiredCandidates},${source.conversionRate}%\n`;
      });
    }

    return csv;
  }
}
