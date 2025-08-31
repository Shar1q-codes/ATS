import { Processor, Process } from '@nestjs/bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import type { Job } from 'bull';
import {
  ResumeProcessingService,
  ProcessingResult,
} from '../services/resume-processing.service';
import { ResumePipelineService } from '../services/resume-pipeline.service';

export interface ResumeProcessingJobData {
  candidateId: string;
  fileUrl: string;
  filePath: string;
  originalName: string;
  mimeType: string;
}

@Processor('resume-processing')
export class ResumeProcessingProcessor {
  private readonly logger = new Logger(ResumeProcessingProcessor.name);

  constructor(
    private readonly resumeProcessingService: ResumeProcessingService,
    @Inject(forwardRef(() => ResumePipelineService))
    private readonly resumePipelineService: ResumePipelineService,
  ) {}

  @Process('process-resume')
  async handleResumeProcessing(
    job: Job<ResumeProcessingJobData>,
  ): Promise<ProcessingResult> {
    const { candidateId } = job.data;
    const startTime = Date.now();
    const jobId = job.id.toString();

    this.logger.log(
      `Processing resume job ${job.id} for candidate ${candidateId}`,
    );

    try {
      // Update pipeline status to processing
      await this.resumePipelineService.updatePipelineProgress(
        jobId,
        5,
        'validation',
        'Starting resume processing validation',
      );

      // Validate processing requirements
      await job.progress(5);
      await this.resumeProcessingService.validateProcessingRequirements(
        job.data,
      );

      await this.resumePipelineService.updatePipelineProgress(
        jobId,
        10,
        'parsing',
        'Validation completed, starting resume parsing',
      );

      // Update progress
      await job.progress(10);

      const result = await this.resumeProcessingService.processResume(
        job.data,
        async (progress: number) => {
          await job.progress(progress);

          // Update pipeline status with detailed progress
          let stage = 'parsing';
          let message = 'Processing resume content';

          if (progress >= 20 && progress < 40) {
            stage = 'parsing';
            message = 'Extracting text from resume';
          } else if (progress >= 40 && progress < 60) {
            stage = 'parsing';
            message = 'Parsing structured data with AI';
          } else if (progress >= 60 && progress < 80) {
            stage = 'storage';
            message = 'Saving parsed data to database';
          } else if (progress >= 80) {
            stage = 'storage';
            message = 'Finalizing data storage';
          }

          await this.resumePipelineService.updatePipelineProgress(
            jobId,
            progress,
            stage,
            message,
          );

          this.logger.debug(`Job ${job.id} progress: ${progress}%`);
        },
      );

      const processingTime = Date.now() - startTime;

      // Complete pipeline processing
      await this.resumePipelineService.completePipeline(
        jobId,
        result,
        processingTime,
      );

      if (result.success) {
        this.logger.log(
          `Resume processing completed successfully for job ${job.id} in ${processingTime}ms`,
        );
      } else {
        this.logger.error(
          `Resume processing failed for job ${job.id}: ${result.error}`,
        );

        // Check if this is a retryable error
        if (result.error && result.error.includes('rate limit')) {
          // Throw error to trigger Bull retry mechanism
          throw new Error(result.error);
        }
      }

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        `Resume processing failed for job ${job.id} after ${processingTime}ms:`,
        error,
      );

      // Handle pipeline error
      const shouldRetry = await this.resumePipelineService.handlePipelineError(
        jobId,
        error as Error,
        'processing',
        job.attemptsMade + 1,
      );

      if (shouldRetry) {
        // Let Bull handle the retry
        throw error;
      }

      // Complete pipeline with failure
      const failedResult = {
        candidateId,
        success: false,
        error:
          (error as Error).message ||
          'Unknown error occurred during processing',
        processingTime,
      };

      await this.resumePipelineService.completePipeline(
        jobId,
        failedResult,
        processingTime,
      );

      // Return failed result instead of throwing to prevent infinite retries
      return failedResult;
    }
  }
}
