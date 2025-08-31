import {
  IsEnum,
  IsOptional,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnalyticsQueryDto } from './analytics-query.dto';
import {
  AnalyticsSummaryDto,
  PipelineBottleneckDto,
  SourceAnalyticsDto,
  DiversityAnalyticsDto,
} from './analytics-response.dto';

export enum ExportFormatDto {
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel',
}

export enum ReportSectionDto {
  SUMMARY = 'summary',
  PIPELINE = 'pipeline',
  SOURCES = 'sources',
  DIVERSITY = 'diversity',
  TRENDS = 'trends',
}

export class ReportGenerationDto {
  @ValidateNested()
  @Type(() => AnalyticsQueryDto)
  query: AnalyticsQueryDto;

  @IsEnum(ExportFormatDto)
  format: ExportFormatDto;

  @IsArray()
  @IsEnum(ReportSectionDto, { each: true })
  sections: ReportSectionDto[];

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class TrendDataDto {
  applications: Array<{ date: string; value: number }>;
  hires: Array<{ date: string; value: number }>;
  timeToFill: Array<{ date: string; value: number }>;
}

export class DashboardDataDto {
  summary: AnalyticsSummaryDto;
  pipelineBottlenecks: PipelineBottleneckDto[];
  sourcePerformance: SourceAnalyticsDto[];
  diversityAnalytics: DiversityAnalyticsDto;
  trendData: TrendDataDto;
  lastUpdated: string;
}

export class ReportDownloadDto {
  reportId: string;
  downloadUrl: string;
  format: ExportFormatDto;
  generatedAt: string;
  expiresAt: string;
}

export class BiasDetectionDto {
  metric: string;
  threshold: number;
  actualValue: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

export class DiversityReportDto {
  companyId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  overallDiversityIndex: number;
  biasIndicators: BiasDetectionDto[];
  recommendations: string[];
  complianceStatus: {
    gdpr: boolean;
    eeoc: boolean;
    localRegulations: boolean;
  };
}
