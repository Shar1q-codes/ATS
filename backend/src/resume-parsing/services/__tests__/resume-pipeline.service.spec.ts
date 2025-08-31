import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import type { Queue } from 'bull';
import { ResumePipelineService } from '../resume-pipeline.service';
import { ResumeUploadService } from '../resume-upload.service';
import { ResumeProcessingService } from '../resume-processing.service';
import { FileStorageService } from '../file-storage.service';
import { Candidate } from '../../../entities/candidate.entity';
import { ParsedResumeData } from '../../../entities/parsed-resume-data.entity';

describe('ResumePipelineService', () => {
  let service: ResumePipelineService;
  let candidateRepository: Repository<Candidate>;
  let parsedResumeDataRepository: Repository<ParsedResumeData>;
  let resumeProcessingQueue: Queue;
  let resumeUploadService: ResumeUploadService;
  let resumeProcessingService: ResumeProcessingService;
  let fileStorageService: FileStorageService;

  const mockCandidate = {
    id: 'test-candidate-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    resumeUrl: null,
    consentGiven: true,
    consentDate: new Date(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-resume.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024 * 1024,
    buffer: Buffer.from('test file content'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumePipelineService,
        {
          provide: getRepositoryToken(Candidate),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ParsedResumeData),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getQueueToken('resume-processing'),
          useValue: {
            add: jest.fn(),
            getJob: jest.fn(),
            empty: jest.fn(),
            close: jest.fn(),
          },
        },
        {
          provide: ResumeUploadService,
          useValue: {
            uploadResume: jest.fn(),
            getProcessingStatus: jest.fn(),
            retryProcessing: jest.fn(),
          },
        },
        {
          provide: ResumeProcessingService,
          useValue: {
            processResume: jest.fn(),
            validateProcessingRequirements: jest.fn(),
            handleProcessingError: jest.fn(),
          },
        },
        {
          provide: FileStorageService,
          useValue: {
            validateFileType: jest.fn(),
            validateFileSize: jest.fn(),
            uploadFile: jest.fn(),
            downloadFile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResumePipelineService>(ResumePipelineService);
    candidateRepository = module.get<Repository<Candidate>>(
      getRepositoryToken(Candidate),
    );
    parsedResumeDataRepository = module.get<Repository<ParsedResumeData>>(
      getRepositoryToken(ParsedResumeData),
    );
    resumeProcessingQueue = module.get<Queue>(
      getQueueToken('resume-processing'),
    );
    resumeUploadService = module.get<ResumeUploadService>(ResumeUploadService);
    resumeProcessingService = module.get<ResumeProcessingService>(
      ResumeProcessingService,
    );
    fileStorageService = module.get<FileStorageService>(FileStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startPipeline', () => {
    it('should start pipeline successfully', async () => {
      const uploadData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockUploadResult = {
        jobId: 'job-123',
        candidateId: 'candidate-123',
        fileUrl: 'https://storage.example.com/resume.pdf',
        status: 'queued',
      };

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockResolvedValue(mockUploadResult);

      const result = await service.startPipeline(mockFile, uploadData);

      expect(result).toEqual(mockUploadResult);
      expect(resumeUploadService.uploadResume).toHaveBeenCalledWith(
        mockFile,
        uploadData,
      );

      // Check that pipeline status was initialized
      const status = await service.getPipelineStatus('job-123');
      expect(status).toBeDefined();
      expect(status?.status).toBe('queued');
      expect(status?.candidateId).toBe('candidate-123');
      expect(status?.notifications.length).toBeGreaterThan(0);
    });

    it('should handle upload errors', async () => {
      const uploadData = { email: 'test@example.com' };
      const uploadError = new Error('Upload failed');

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockRejectedValue(uploadError);

      await expect(service.startPipeline(mockFile, uploadData)).rejects.toThrow(
        'Upload failed',
      );
    });
  });

  describe('getPipelineStatus', () => {
    it('should return pipeline status from memory', async () => {
      const uploadData = { email: 'test@example.com' };
      const mockUploadResult = {
        jobId: 'job-123',
        candidateId: 'candidate-123',
        fileUrl: 'https://storage.example.com/resume.pdf',
        status: 'queued',
      };

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockResolvedValue(mockUploadResult);

      // Start pipeline to create status
      await service.startPipeline(mockFile, uploadData);

      // Get status
      const status = await service.getPipelineStatus('job-123');

      expect(status).toBeDefined();
      expect(status?.jobId).toBe('job-123');
      expect(status?.candidateId).toBe('candidate-123');
      expect(status?.status).toBe('queued');
    });

    it('should fallback to Bull queue status when not in memory', async () => {
      const mockBullStatus = {
        jobId: 'job-456',
        candidateId: 'candidate-456',
        status: 'completed',
        progress: 100,
        attempts: 1,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        parsedData: { skills: ['JavaScript'] },
      };

      jest
        .spyOn(resumeUploadService, 'getProcessingStatus')
        .mockResolvedValue(mockBullStatus);

      const status = await service.getPipelineStatus('job-456');

      expect(status).toBeDefined();
      expect(status?.jobId).toBe('job-456');
      expect(status?.status).toBe('completed');
      expect(resumeUploadService.getProcessingStatus).toHaveBeenCalledWith(
        'job-456',
      );
    });

    it('should return null for non-existent job', async () => {
      jest
        .spyOn(resumeUploadService, 'getProcessingStatus')
        .mockRejectedValue(new Error('Job not found'));

      const status = await service.getPipelineStatus('non-existent-job');

      expect(status).toBeNull();
    });
  });

  describe('updatePipelineProgress', () => {
    it('should update pipeline progress', async () => {
      const uploadData = { email: 'test@example.com' };
      const mockUploadResult = {
        jobId: 'job-123',
        candidateId: 'candidate-123',
        fileUrl: 'https://storage.example.com/resume.pdf',
        status: 'queued',
      };

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockResolvedValue(mockUploadResult);

      // Start pipeline
      await service.startPipeline(mockFile, uploadData);

      // Update progress
      await service.updatePipelineProgress(
        'job-123',
        50,
        'parsing',
        'Parsing in progress',
      );

      const status = await service.getPipelineStatus('job-123');
      expect(status?.progress).toBe(50);
      expect(status?.stage).toBe('parsing');
      expect(status?.status).toBe('processing');
      expect(status?.notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Parsing in progress',
            stage: 'parsing',
          }),
        ]),
      );
    });
  });

  describe('handlePipelineError', () => {
    it('should handle retryable errors', async () => {
      const uploadData = { email: 'test@example.com' };
      const mockUploadResult = {
        jobId: 'job-123',
        candidateId: 'candidate-123',
        fileUrl: 'https://storage.example.com/resume.pdf',
        status: 'queued',
      };

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockResolvedValue(mockUploadResult);
      jest
        .spyOn(resumeProcessingService, 'handleProcessingError')
        .mockResolvedValue(true);

      // Start pipeline
      await service.startPipeline(mockFile, uploadData);

      // Handle error
      const error = new Error('Rate limit exceeded');
      const shouldRetry = await service.handlePipelineError(
        'job-123',
        error,
        'parsing',
        1,
      );

      expect(shouldRetry).toBe(true);
      expect(resumeProcessingService.handleProcessingError).toHaveBeenCalled();

      const status = await service.getPipelineStatus('job-123');
      expect(status?.status).toBe('retrying');
      expect(status?.error).toBe('Rate limit exceeded');
    });

    it('should handle non-retryable errors', async () => {
      const uploadData = { email: 'test@example.com' };
      const mockUploadResult = {
        jobId: 'job-123',
        candidateId: 'candidate-123',
        fileUrl: 'https://storage.example.com/resume.pdf',
        status: 'queued',
      };

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockResolvedValue(mockUploadResult);
      jest
        .spyOn(resumeProcessingService, 'handleProcessingError')
        .mockResolvedValue(false);

      // Start pipeline
      await service.startPipeline(mockFile, uploadData);

      // Handle error
      const error = new Error('Invalid file format');
      const shouldRetry = await service.handlePipelineError(
        'job-123',
        error,
        'parsing',
        3,
      );

      expect(shouldRetry).toBe(false);

      const status = await service.getPipelineStatus('job-123');
      expect(status?.status).toBe('failed');
      expect(status?.error).toBe('Invalid file format');
    });
  });

  describe('completePipeline', () => {
    it('should complete pipeline successfully', async () => {
      const uploadData = { email: 'test@example.com' };
      const mockUploadResult = {
        jobId: 'job-123',
        candidateId: 'candidate-123',
        fileUrl: 'https://storage.example.com/resume.pdf',
        status: 'queued',
      };

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockResolvedValue(mockUploadResult);

      // Start pipeline
      await service.startPipeline(mockFile, uploadData);

      // Complete pipeline
      const result = {
        success: true,
        candidateId: 'candidate-123',
        parsedData: { skills: ['JavaScript'] },
      };

      await service.completePipeline('job-123', result, 5000);

      const status = await service.getPipelineStatus('job-123');
      expect(status?.status).toBe('completed');
      expect(status?.progress).toBe(100);
      expect(status?.stage).toBe('completed');
      expect(status?.parsedData).toEqual(result.parsedData);
      expect(status?.completedAt).toBeDefined();
    });

    it('should complete pipeline with failure', async () => {
      const uploadData = { email: 'test@example.com' };
      const mockUploadResult = {
        jobId: 'job-123',
        candidateId: 'candidate-123',
        fileUrl: 'https://storage.example.com/resume.pdf',
        status: 'queued',
      };

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockResolvedValue(mockUploadResult);

      // Start pipeline
      await service.startPipeline(mockFile, uploadData);

      // Complete pipeline with failure
      const result = {
        success: false,
        candidateId: 'candidate-123',
        error: 'Processing failed',
      };

      await service.completePipeline('job-123', result, 3000);

      const status = await service.getPipelineStatus('job-123');
      expect(status?.status).toBe('failed');
      expect(status?.error).toBe('Processing failed');
      expect(status?.completedAt).toBeDefined();
    });
  });

  describe('retryPipeline', () => {
    it('should retry pipeline successfully', async () => {
      const uploadData = { email: 'test@example.com' };
      const mockUploadResult = {
        jobId: 'job-123',
        candidateId: 'candidate-123',
        fileUrl: 'https://storage.example.com/resume.pdf',
        status: 'queued',
      };

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockResolvedValue(mockUploadResult);
      jest.spyOn(resumeUploadService, 'retryProcessing').mockResolvedValue();

      // Start pipeline
      await service.startPipeline(mockFile, uploadData);

      // Set pipeline to failed state
      await service.handlePipelineError(
        'job-123',
        new Error('Test error'),
        'parsing',
        1,
      );

      // Retry pipeline
      await service.retryPipeline('job-123');

      expect(resumeUploadService.retryProcessing).toHaveBeenCalledWith(
        'job-123',
      );

      const status = await service.getPipelineStatus('job-123');
      expect(status?.status).toBe('retrying');
    });

    it('should throw error when max attempts exceeded', async () => {
      const uploadData = { email: 'test@example.com' };
      const mockUploadResult = {
        jobId: 'job-123',
        candidateId: 'candidate-123',
        fileUrl: 'https://storage.example.com/resume.pdf',
        status: 'queued',
      };

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockResolvedValue(mockUploadResult);

      // Start pipeline
      await service.startPipeline(mockFile, uploadData);

      // Set attempts to max
      const status = await service.getPipelineStatus('job-123');
      if (status) {
        status.attempts = 3;
      }

      // Try to retry
      await expect(service.retryPipeline('job-123')).rejects.toThrow(
        'Maximum retry attempts exceeded',
      );
    });

    it('should throw error for non-existent pipeline', async () => {
      await expect(service.retryPipeline('non-existent-job')).rejects.toThrow(
        'Pipeline status not found',
      );
    });
  });

  describe('getPipelineStatistics', () => {
    it('should return correct statistics', async () => {
      // Create multiple pipelines with different statuses
      const uploadData = { email: 'test@example.com' };
      const mockUploadResults = [
        {
          jobId: 'job-1',
          candidateId: 'candidate-1',
          fileUrl: 'url1',
          status: 'queued',
        },
        {
          jobId: 'job-2',
          candidateId: 'candidate-2',
          fileUrl: 'url2',
          status: 'queued',
        },
        {
          jobId: 'job-3',
          candidateId: 'candidate-3',
          fileUrl: 'url3',
          status: 'queued',
        },
      ];

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockResolvedValueOnce(mockUploadResults[0])
        .mockResolvedValueOnce(mockUploadResults[1])
        .mockResolvedValueOnce(mockUploadResults[2]);

      // Start pipelines
      await service.startPipeline(mockFile, uploadData);
      await service.startPipeline(mockFile, { email: 'test2@example.com' });
      await service.startPipeline(mockFile, { email: 'test3@example.com' });

      // Update statuses
      await service.updatePipelineProgress('job-1', 50, 'processing');
      await service.handlePipelineError(
        'job-2',
        new Error('Test error'),
        'parsing',
        1,
      );
      await service.completePipeline(
        'job-3',
        { success: true, candidateId: 'candidate-3' },
        1000,
      );

      const stats = await service.getPipelineStatistics();

      expect(stats.total).toBe(3);
      expect(stats.queued).toBe(0);
      expect(stats.processing).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1); // Error handling sets status to failed initially
      expect(stats.retrying).toBe(0);
    });
  });

  describe('getAllPipelineStatuses', () => {
    it('should return all pipeline statuses', async () => {
      const uploadData = { email: 'test@example.com' };
      const mockUploadResult = {
        jobId: 'job-123',
        candidateId: 'candidate-123',
        fileUrl: 'https://storage.example.com/resume.pdf',
        status: 'queued',
      };

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockResolvedValue(mockUploadResult);

      // Start pipeline
      await service.startPipeline(mockFile, uploadData);

      const allStatuses = await service.getAllPipelineStatuses();

      expect(allStatuses).toHaveLength(1);
      expect(allStatuses[0].jobId).toBe('job-123');
      expect(allStatuses[0].candidateId).toBe('candidate-123');
    });
  });
});
