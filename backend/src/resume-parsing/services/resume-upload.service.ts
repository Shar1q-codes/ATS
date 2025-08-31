import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Candidate } from '../../entities/candidate.entity';
import { FileStorageService } from './file-storage.service';
import {
  UploadResumeDto,
  UploadResumeResponseDto,
} from '../dto/upload-resume.dto';

@Injectable()
export class ResumeUploadService {
  private readonly logger = new Logger(ResumeUploadService.name);

  constructor(
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectQueue('resume-processing')
    private resumeProcessingQueue: Queue,
    private fileStorageService: FileStorageService,
  ) {}

  async uploadResume(
    file: Express.Multer.File,
    uploadData: UploadResumeDto,
  ): Promise<UploadResumeResponseDto> {
    try {
      // Validate file
      if (!this.fileStorageService.validateFileType(file)) {
        throw new BadRequestException(
          'Invalid file type. Only PDF, DOCX, DOC, and image files are allowed.',
        );
      }

      if (!this.fileStorageService.validateFileSize(file, 10)) {
        throw new BadRequestException('File size exceeds 10MB limit.');
      }

      // Find or create candidate
      let candidate: Candidate;

      if (uploadData.candidateId) {
        candidate = await this.candidateRepository.findOne({
          where: { id: uploadData.candidateId },
        });

        if (!candidate) {
          throw new BadRequestException('Candidate not found');
        }
      } else if (uploadData.email) {
        // Check if candidate exists by email
        candidate = await this.candidateRepository.findOne({
          where: { email: uploadData.email },
        });

        if (!candidate) {
          // Create new candidate
          candidate = this.candidateRepository.create({
            email: uploadData.email,
            firstName: uploadData.firstName || '',
            lastName: uploadData.lastName || '',
            linkedinUrl: uploadData.linkedinUrl,
            consentGiven: true,
            consentDate: new Date(),
          });

          candidate = await this.candidateRepository.save(candidate);
          this.logger.log(`Created new candidate: ${candidate.id}`);
        }
      } else {
        throw new BadRequestException(
          'Either candidateId or email must be provided',
        );
      }

      // Upload file to storage
      const { url: fileUrl, path: filePath } =
        await this.fileStorageService.uploadFile(file, candidate.id);

      // Update candidate with resume URL
      candidate.resumeUrl = fileUrl;
      await this.candidateRepository.save(candidate);

      // Add job to processing queue
      const job = await this.resumeProcessingQueue.add(
        'process-resume',
        {
          candidateId: candidate.id,
          fileUrl,
          filePath,
          originalName: file.originalname,
          mimeType: file.mimetype,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      this.logger.log(
        `Resume processing job created: ${job.id} for candidate: ${candidate.id}`,
      );

      return {
        jobId: job.id.toString(),
        candidateId: candidate.id,
        fileUrl,
        status: 'queued',
      };
    } catch (error) {
      this.logger.error('Error uploading resume:', error);
      throw error;
    }
  }

  async getProcessingStatus(jobId: string): Promise<any> {
    try {
      const job = await this.resumeProcessingQueue.getJob(jobId);

      if (!job) {
        throw new BadRequestException('Job not found');
      }

      const state = await job.getState();
      const progress = job.progress();

      let status: string;
      switch (state) {
        case 'waiting':
        case 'delayed':
          status = 'queued';
          break;
        case 'active':
          status = 'processing';
          break;
        case 'completed':
          status = 'completed';
          break;
        case 'failed':
          status = 'failed';
          break;
        default:
          status = 'unknown';
      }

      const result = {
        jobId,
        status,
        progress: typeof progress === 'number' ? progress : undefined,
        attempts: job.attemptsMade,
        startedAt: job.processedOn
          ? new Date(job.processedOn).toISOString()
          : undefined,
        completedAt: job.finishedOn
          ? new Date(job.finishedOn).toISOString()
          : undefined,
      };

      if (state === 'failed' && job.failedReason) {
        result['error'] = job.failedReason;
      }

      if (state === 'completed' && job.returnvalue) {
        // Handle both old and new return value formats
        if (job.returnvalue.success !== undefined) {
          // New format with ProcessingResult
          if (job.returnvalue.success) {
            result['parsedData'] = job.returnvalue.parsedData;
          } else {
            result['error'] = job.returnvalue.error;
            result['status'] = 'failed';
          }
        } else {
          // Old format - backward compatibility
          result['parsedData'] = job.returnvalue;
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Error getting processing status:', error);
      throw error;
    }
  }

  async retryProcessing(jobId: string): Promise<void> {
    try {
      const job = await this.resumeProcessingQueue.getJob(jobId);

      if (!job) {
        throw new BadRequestException('Job not found');
      }

      await job.retry();
      this.logger.log(`Retrying job: ${jobId}`);
    } catch (error) {
      this.logger.error('Error retrying job:', error);
      throw error;
    }
  }
}
