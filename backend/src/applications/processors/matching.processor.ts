import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ApplicationService } from '../services/application.service';

export interface MatchingJobData {
  applicationId: string;
}

@Processor('matching')
export class MatchingProcessor {
  private readonly logger = new Logger(MatchingProcessor.name);

  constructor(private readonly applicationService: ApplicationService) {}

  @Process('calculate-fit-score')
  async handleFitScoreCalculation(job: Job<MatchingJobData>): Promise<void> {
    const { applicationId } = job.data;

    try {
      this.logger.log(
        `Processing fit score calculation for application ${applicationId}`,
      );

      await this.applicationService.calculateAndUpdateFitScore(applicationId);

      this.logger.log(
        `Successfully processed fit score calculation for application ${applicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process fit score calculation for application ${applicationId}: ${error.message}`,
      );
      throw error; // This will mark the job as failed and trigger retries
    }
  }
}
