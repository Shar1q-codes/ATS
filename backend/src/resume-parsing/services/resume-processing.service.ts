import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candidate } from '../../entities/candidate.entity';
import { ParsedResumeData } from '../../entities/parsed-resume-data.entity';
import { FileStorageService } from './file-storage.service';
import { OpenAIService } from './openai.service';
import { ResumeProcessingJobData } from '../processors/resume-processing.processor';

export interface ProcessingResult {
  candidateId: string;
  success: boolean;
  parsedData?: {
    skills: string[];
    experience: any[];
    education: any[];
    certifications: string[];
    summary?: string;
    totalExperience: number;
  };
  error?: string;
  processingTime?: number;
}

@Injectable()
export class ResumeProcessingService {
  private readonly logger = new Logger(ResumeProcessingService.name);

  constructor(
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(ParsedResumeData)
    private parsedResumeDataRepository: Repository<ParsedResumeData>,
    private fileStorageService: FileStorageService,
    private openaiService: OpenAIService,
  ) {}

  async processResume(
    jobData: ResumeProcessingJobData,
    progressCallback: (progress: number) => Promise<void>,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const { candidateId, filePath, mimeType } = jobData;

    try {
      this.logger.log(
        `Starting resume processing for candidate: ${candidateId}`,
      );

      // Download file from storage
      await progressCallback(20);
      const fileBuffer = await this.fileStorageService.downloadFile(filePath);

      // Extract text based on file type using OpenAI
      await progressCallback(40);
      let extractedText: string;

      if (mimeType === 'application/pdf') {
        extractedText = await this.openaiService.extractTextFromPDF(
          fileBuffer,
          jobData.originalName,
        );
      } else if (
        mimeType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        extractedText = await this.openaiService.extractTextFromDOCX(
          fileBuffer,
          jobData.originalName,
        );
      } else if (mimeType.startsWith('image/')) {
        extractedText = await this.openaiService.extractTextFromImage(
          fileBuffer,
          jobData.originalName,
        );
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Parse structured data using OpenAI
      await progressCallback(60);
      const parsedData =
        await this.openaiService.parseStructuredData(extractedText);

      // Save parsed data
      await progressCallback(80);
      const candidate = await this.candidateRepository.findOne({
        where: { id: candidateId },
        relations: ['parsedData'],
      });

      if (!candidate) {
        throw new Error(`Candidate not found: ${candidateId}`);
      }

      // Update candidate with personal info if available
      if (parsedData.personalInfo) {
        const personalInfo = parsedData.personalInfo;
        if (personalInfo.email && !candidate.email) {
          candidate.email = personalInfo.email;
        }
        if (personalInfo.phone && !candidate.phone) {
          candidate.phone = personalInfo.phone;
        }
        if (personalInfo.location && !candidate.location) {
          candidate.location = personalInfo.location;
        }
        if (personalInfo.linkedinUrl && !candidate.linkedinUrl) {
          candidate.linkedinUrl = personalInfo.linkedinUrl;
        }
        if (personalInfo.portfolioUrl && !candidate.portfolioUrl) {
          candidate.portfolioUrl = personalInfo.portfolioUrl;
        }

        await this.candidateRepository.save(candidate);
      }

      // Create or update parsed resume data
      let parsedResumeData = candidate.parsedData;
      if (!parsedResumeData) {
        parsedResumeData = this.parsedResumeDataRepository.create({
          candidate,
          skills: parsedData.skills || [],
          experience: parsedData.experience || [],
          education: parsedData.education || [],
          certifications: parsedData.certifications || [],
          summary: parsedData.summary,
          totalExperience: parsedData.totalExperience || 0,
        });
      } else {
        // Update existing data
        Object.assign(parsedResumeData, {
          skills: parsedData.skills || [],
          experience: parsedData.experience || [],
          education: parsedData.education || [],
          certifications: parsedData.certifications || [],
          summary: parsedData.summary,
          totalExperience: parsedData.totalExperience || 0,
        });
      }

      await this.parsedResumeDataRepository.save(parsedResumeData);

      await progressCallback(100);

      const processingTime = Date.now() - startTime;

      this.logger.log(
        `Resume processing completed for candidate: ${candidateId} in ${processingTime}ms`,
      );

      return {
        candidateId,
        success: true,
        parsedData: {
          skills: parsedResumeData.skills,
          experience: parsedResumeData.experience,
          education: parsedResumeData.education,
          certifications: parsedResumeData.certifications,
          summary: parsedResumeData.summary,
          totalExperience: parsedResumeData.totalExperience,
        },
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        `Error processing resume for candidate ${candidateId}:`,
        error,
      );

      return {
        candidateId,
        success: false,
        error: error.message || 'Unknown error occurred during processing',
        processingTime,
      };
    }
  }

  async validateProcessingRequirements(
    jobData: ResumeProcessingJobData,
  ): Promise<void> {
    const { candidateId, filePath, mimeType } = jobData;

    // Validate candidate exists
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new Error(`Candidate not found: ${candidateId}`);
    }

    // Validate file type
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    if (!supportedTypes.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    this.logger.log(`Validation passed for candidate: ${candidateId}`);
  }

  async handleProcessingError(
    error: Error,
    jobData: ResumeProcessingJobData,
    attempt: number,
  ): Promise<boolean> {
    const { candidateId } = jobData;

    this.logger.error(
      `Processing attempt ${attempt} failed for candidate ${candidateId}: ${error.message}`,
    );

    // Determine if error is retryable
    const retryableErrors = [
      'rate limit',
      'timeout',
      'network',
      'temporary',
      'service unavailable',
    ];

    const isRetryable = retryableErrors.some((retryableError) =>
      error.message.toLowerCase().includes(retryableError),
    );

    if (isRetryable && attempt < 3) {
      this.logger.log(
        `Error is retryable, will retry for candidate: ${candidateId}`,
      );
      return true;
    }

    this.logger.error(
      `Error is not retryable or max attempts reached for candidate: ${candidateId}`,
    );
    return false;
  }
}
