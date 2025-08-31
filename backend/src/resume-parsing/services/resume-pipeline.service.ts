import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Candidate } from '../../entities/candidate.entity';
import { ParsedResumeData } from '../../entities/parsed-resume-data.entity';
import { ResumeUploadService } from './resume-upload.service';
import { ResumeProcessingService } from './resume-processing.service';
import { FileStorageService } from './file-storage.service';
import {
  UploadResumeDto,
  UploadResumeResponseDto,
} from '../dto/upload-resume.dto';

export interface PipelineStatus {
  jobId: string;
  candidateId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retrying';
  progress: number;
  stage: 'upload' | 'validation' | 'parsing' | 'storage' | 'completed';
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
  parsedData?: any;
  notifications: PipelineNotification[];
}

export interface PipelineNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  stage: string;
}

export interface PipelineResult {
  success: boolean;
  candidateId: string;
  jobId: string;
  parsedData?: any;
  error?: string;
  processingTime: number;
  notifications: PipelineNotification[];
}

@Injectable()
export class ResumePipelineService {
  private readonly logger = new Logger(ResumePipelineService.name);
  private readonly pipelineStatuses = new Map<string, PipelineStatus>();

  constructor(
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(ParsedResumeData)
    private parsedResumeDataRepository: Repository<ParsedResumeData>,
    @InjectQueue('resume-processing')
    private resumeProcessingQueue: Queue,
    private resumeUploadService: ResumeUploadService,
    private resumeProcessingService: ResumeProcessingService,
    private fileStorageService: FileStorageService,
  ) {}

  async startPipeline(
    file: Express.Multer.File,
    uploadData: UploadResumeDto,
  ): Promise<UploadResumeResponseDto> {
    const startTime = Date.now();
    let jobId: string;
    let candidateId: string;

    try {
      this.logger.log('Starting resume processing pipeline');

      // Stage 1: Upload and queue processing
      const uploadResult = await this.resumeUploadService.uploadResume(
        file,
        uploadData,
      );

      jobId = uploadResult.jobId;
      candidateId = uploadResult.candidateId;

      // Initialize pipeline status tracking
      const pipelineStatus: PipelineStatus = {
        jobId,
        candidateId,
        status: 'queued',
        progress: 0,
        stage: 'upload',
        startedAt: new Date(),
        attempts: 0,
        maxAttempts: 3,
        notifications: [
          {
            type: 'info',
            message: 'Resume uploaded successfully and queued for processing',
            timestamp: new Date(),
            stage: 'upload',
          },
        ],
      };

      this.pipelineStatuses.set(jobId, pipelineStatus);

      this.logger.log(
        `Pipeline started for job ${jobId}, candidate ${candidateId}`,
      );

      return uploadResult;
    } catch (error) {
      this.logger.error('Error starting pipeline:', error);

      if (jobId) {
        await this.updatePipelineStatus(jobId, {
          status: 'failed',
          error: error.message,
          stage: 'upload',
          notifications: [
            {
              type: 'error',
              message: `Pipeline failed to start: ${error.message}`,
              timestamp: new Date(),
              stage: 'upload',
            },
          ],
        });
      }

      throw error;
    }
  }

  async getPipelineStatus(jobId: string): Promise<PipelineStatus | null> {
    // First check our in-memory status
    let pipelineStatus = this.pipelineStatuses.get(jobId);

    if (!pipelineStatus) {
      // Fallback to Bull queue status
      try {
        const bullStatus =
          await this.resumeUploadService.getProcessingStatus(jobId);

        // Convert Bull status to pipeline status
        pipelineStatus = {
          jobId,
          candidateId: bullStatus.candidateId || '',
          status: this.mapBullStatusToPipelineStatus(bullStatus.status),
          progress: bullStatus.progress || 0,
          stage: this.determineStageFromProgress(bullStatus.progress || 0),
          error: bullStatus.error,
          startedAt: bullStatus.startedAt
            ? new Date(bullStatus.startedAt)
            : undefined,
          completedAt: bullStatus.completedAt
            ? new Date(bullStatus.completedAt)
            : undefined,
          attempts: bullStatus.attempts || 0,
          maxAttempts: 3,
          parsedData: bullStatus.parsedData,
          notifications: [],
        };

        this.pipelineStatuses.set(jobId, pipelineStatus);
      } catch (error) {
        this.logger.error(`Error getting status for job ${jobId}:`, error);
        return null;
      }
    }

    return pipelineStatus;
  }

  async retryPipeline(jobId: string): Promise<void> {
    try {
      const pipelineStatus = await this.getPipelineStatus(jobId);

      if (!pipelineStatus) {
        throw new Error('Pipeline status not found');
      }

      if (pipelineStatus.attempts >= pipelineStatus.maxAttempts) {
        throw new Error('Maximum retry attempts exceeded');
      }

      // Update status to retrying
      await this.updatePipelineStatus(jobId, {
        status: 'retrying',
        stage: 'validation',
        progress: 0,
        notifications: [
          ...pipelineStatus.notifications,
          {
            type: 'info',
            message: `Retrying pipeline (attempt ${pipelineStatus.attempts + 1}/${pipelineStatus.maxAttempts})`,
            timestamp: new Date(),
            stage: 'retry',
          },
        ],
      });

      // Retry the Bull job
      await this.resumeUploadService.retryProcessing(jobId);

      this.logger.log(`Pipeline retry initiated for job ${jobId}`);
    } catch (error) {
      this.logger.error(`Error retrying pipeline for job ${jobId}:`, error);
      throw error;
    }
  }

  async updatePipelineProgress(
    jobId: string,
    progress: number,
    stage: string,
    message?: string,
  ): Promise<void> {
    const pipelineStatus = this.pipelineStatuses.get(jobId);

    if (pipelineStatus) {
      pipelineStatus.progress = progress;
      pipelineStatus.stage = stage as any;
      pipelineStatus.status = progress === 100 ? 'completed' : 'processing';

      if (message) {
        pipelineStatus.notifications.push({
          type: 'info',
          message,
          timestamp: new Date(),
          stage,
        });
      }

      this.pipelineStatuses.set(jobId, pipelineStatus);
    }
  }

  async handlePipelineError(
    jobId: string,
    error: Error,
    stage: string,
    attempt: number,
  ): Promise<boolean> {
    const pipelineStatus = this.pipelineStatuses.get(jobId);

    if (pipelineStatus) {
      pipelineStatus.attempts = attempt;
      pipelineStatus.error = error.message;
      pipelineStatus.notifications.push({
        type: 'error',
        message: `Error in ${stage}: ${error.message}`,
        timestamp: new Date(),
        stage,
      });

      // Determine if error is retryable
      const isRetryable =
        await this.resumeProcessingService.handleProcessingError(
          error,
          { candidateId: pipelineStatus.candidateId } as any,
          attempt,
        );

      if (isRetryable && attempt < pipelineStatus.maxAttempts) {
        pipelineStatus.status = 'retrying';
        pipelineStatus.notifications.push({
          type: 'warning',
          message: `Will retry processing (attempt ${attempt + 1}/${pipelineStatus.maxAttempts})`,
          timestamp: new Date(),
          stage,
        });
      } else {
        pipelineStatus.status = 'failed';
        pipelineStatus.completedAt = new Date();
        pipelineStatus.notifications.push({
          type: 'error',
          message:
            'Processing failed - maximum attempts reached or non-retryable error',
          timestamp: new Date(),
          stage,
        });
      }

      this.pipelineStatuses.set(jobId, pipelineStatus);
      return isRetryable && attempt < pipelineStatus.maxAttempts;
    }

    return false;
  }

  async completePipeline(
    jobId: string,
    result: any,
    processingTime: number,
  ): Promise<void> {
    const pipelineStatus = this.pipelineStatuses.get(jobId);

    if (pipelineStatus) {
      pipelineStatus.status = result.success ? 'completed' : 'failed';
      pipelineStatus.progress = 100;
      pipelineStatus.stage = 'completed';
      pipelineStatus.completedAt = new Date();
      pipelineStatus.parsedData = result.parsedData;
      pipelineStatus.error = result.error;

      pipelineStatus.notifications.push({
        type: result.success ? 'success' : 'error',
        message: result.success
          ? `Resume processing completed successfully in ${processingTime}ms`
          : `Resume processing failed: ${result.error}`,
        timestamp: new Date(),
        stage: 'completed',
      });

      this.pipelineStatuses.set(jobId, pipelineStatus);

      // Clean up old statuses (keep for 24 hours)
      this.cleanupOldStatuses();
    }
  }

  private async updatePipelineStatus(
    jobId: string,
    updates: Partial<PipelineStatus>,
  ): Promise<void> {
    const pipelineStatus = this.pipelineStatuses.get(jobId);

    if (pipelineStatus) {
      Object.assign(pipelineStatus, updates);
      this.pipelineStatuses.set(jobId, pipelineStatus);
    }
  }

  private mapBullStatusToPipelineStatus(
    bullStatus: string,
  ): PipelineStatus['status'] {
    switch (bullStatus) {
      case 'queued':
        return 'queued';
      case 'processing':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'queued';
    }
  }

  private determineStageFromProgress(progress: number): string {
    if (progress < 10) return 'validation';
    if (progress < 40) return 'parsing';
    if (progress < 80) return 'storage';
    if (progress < 100) return 'processing';
    return 'completed';
  }

  private cleanupOldStatuses(): void {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const [jobId, status] of this.pipelineStatuses.entries()) {
      if (status.completedAt && status.completedAt < twentyFourHoursAgo) {
        this.pipelineStatuses.delete(jobId);
      }
    }
  }

  // Get all pipeline statuses for monitoring
  async getAllPipelineStatuses(): Promise<PipelineStatus[]> {
    return Array.from(this.pipelineStatuses.values());
  }

  // Get pipeline statistics
  async getPipelineStatistics(): Promise<{
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    retrying: number;
  }> {
    const statuses = Array.from(this.pipelineStatuses.values());

    return {
      total: statuses.length,
      queued: statuses.filter((s) => s.status === 'queued').length,
      processing: statuses.filter((s) => s.status === 'processing').length,
      completed: statuses.filter((s) => s.status === 'completed').length,
      failed: statuses.filter((s) => s.status === 'failed').length,
      retrying: statuses.filter((s) => s.status === 'retrying').length,
    };
  }
}
