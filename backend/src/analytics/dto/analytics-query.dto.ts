import {
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum DateRangeType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  jobVariantId?: string;

  @IsOptional()
  @IsEnum(DateRangeType)
  granularity?: DateRangeType = DateRangeType.DAILY;

  @IsOptional()
  @IsString()
  source?: string;
}

export class PipelineMetricsDto {
  id: string;
  companyId: string;
  jobVariantId?: string;
  dateRange: string;
  totalApplications: number;
  applicationsScreened: number;
  applicationsShortlisted: number;
  interviewsScheduled: number;
  interviewsCompleted: number;
  offersExtended: number;
  offersAccepted: number;
  candidatesHired: number;
  candidatesRejected: number;
  avgTimeToFillDays?: number;
  avgTimeToScreenDays?: number;
  avgTimeToInterviewDays?: number;
  avgTimeToOfferDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class SourcePerformanceDto {
  id: string;
  companyId: string;
  source: string;
  dateRange: string;
  totalCandidates: number;
  qualifiedCandidates: number;
  interviewedCandidates: number;
  hiredCandidates: number;
  conversionRate: number;
  qualityScore?: number;
  costPerHire?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class DiversityMetricsDto {
  id: string;
  companyId: string;
  jobVariantId?: string;
  dateRange: string;
  totalApplicants: number;
  genderDistribution?: {
    male: number;
    female: number;
    nonBinary: number;
    preferNotToSay: number;
    unknown: number;
  };
  ethnicityDistribution?: Record<string, number>;
  ageDistribution?: {
    under25: number;
    '25-34': number;
    '35-44': number;
    '45-54': number;
    over55: number;
    unknown: number;
  };
  educationDistribution?: {
    highSchool: number;
    bachelors: number;
    masters: number;
    phd: number;
    other: number;
    unknown: number;
  };
  hiredDiversity?: {
    gender: Record<string, number>;
    ethnicity: Record<string, number>;
    age: Record<string, number>;
    education: Record<string, number>;
  };
  biasIndicators?: {
    genderBias: number;
    ethnicityBias: number;
    ageBias: number;
    educationBias: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
