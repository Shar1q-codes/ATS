export class TimeToFillMetricsDto {
  averageDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
  totalPositions: number;
  filledPositions: number;
  openPositions: number;
}

export class ConversionRatesDto {
  applicationToScreening: number;
  screeningToShortlist: number;
  shortlistToInterview: number;
  interviewToOffer: number;
  offerToHire: number;
  overallConversion: number;
}

export class PipelineBottleneckDto {
  stage: string;
  dropOffRate: number;
  averageTimeInStage: number;
  candidatesInStage: number;
  isBottleneck: boolean;
}

export class AnalyticsSummaryDto {
  timeToFill: TimeToFillMetricsDto;
  conversionRates: ConversionRatesDto;
  bottlenecks: PipelineBottleneckDto[];
  totalApplications: number;
  totalHires: number;
  activePositions: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export class SourceAnalyticsDto {
  source: string;
  totalCandidates: number;
  qualifiedCandidates: number;
  hiredCandidates: number;
  conversionRate: number;
  qualityScore: number;
  costPerHire?: number;
  roi: number;
}

export class DiversityAnalyticsDto {
  totalApplicants: number;
  totalHired: number;
  diversityIndex: number; // 0-1 scale
  genderBalance: {
    applicants: Record<string, number>;
    hired: Record<string, number>;
    bias: number;
  };
  ethnicityBalance: {
    applicants: Record<string, number>;
    hired: Record<string, number>;
    bias: number;
  };
  ageBalance: {
    applicants: Record<string, number>;
    hired: Record<string, number>;
    bias: number;
  };
  educationBalance: {
    applicants: Record<string, number>;
    hired: Record<string, number>;
    bias: number;
  };
  biasAlerts: string[];
}
