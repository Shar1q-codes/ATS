import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { BadRequestException } from '@nestjs/common';
import { ResumeUploadService } from '../resume-upload.service';
import { FileStorageService } from '../file-storage.service';
import { Candidate } from '../../../entities/candidate.entity';

describe('ResumeUploadService', () => {
  let service: ResumeUploadService;
  let candidateRepository: Repository<Candidate>;
  let resumeProcessingQueue: Queue;
  let fileStorageService: FileStorageService;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-resume.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024 * 1024, // 1MB
    buffer: Buffer.from('test file content'),
    destination: '',
    filename: '',
    path: '',
    stream: null,
  };

  const mockCandidate = {
    id: 'test-candidate-id',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    resumeUrl: null,
    consentGiven: true,
    consentDate: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeUploadService,
        {
          provide: getRepositoryToken(Candidate),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getQueueToken('resume-processing'),
          useValue: {
            add: jest.fn(),
            getJob: jest.fn(),
          },
        },
        {
          provide: FileStorageService,
          useValue: {
            validateFileType: jest.fn(),
            validateFileSize: jest.fn(),
            uploadFile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResumeUploadService>(ResumeUploadService);
    candidateRepository = module.get<Repository<Candidate>>(
      getRepositoryToken(Candidate),
    );
    resumeProcessingQueue = module.get<Queue>(
      getQueueToken('resume-processing'),
    );
    fileStorageService = module.get<FileStorageService>(FileStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadResume', () => {
    it('should upload resume for existing candidate', async () => {
      const uploadData = { candidateId: 'test-candidate-id' };
      const mockUploadResult = {
        url: 'https://storage.example.com/resume.pdf',
        path: 'candidates/test-candidate-id/resume.pdf',
      };
      const mockJob = { id: 'job-123' };

      jest.spyOn(fileStorageService, 'validateFileType').mockReturnValue(true);
      jest.spyOn(fileStorageService, 'validateFileSize').mockReturnValue(true);
      jest
        .spyOn(candidateRepository, 'findOne')
        .mockResolvedValue(mockCandidate as any);
      jest
        .spyOn(fileStorageService, 'uploadFile')
        .mockResolvedValue(mockUploadResult);
      jest
        .spyOn(candidateRepository, 'save')
        .mockResolvedValue(mockCandidate as any);
      jest
        .spyOn(resumeProcessingQueue, 'add')
        .mockResolvedValue(mockJob as any);

      const result = await service.uploadResume(mockFile, uploadData);

      expect(fileStorageService.validateFileType).toHaveBeenCalledWith(
        mockFile,
      );
      expect(fileStorageService.validateFileSize).toHaveBeenCalledWith(
        mockFile,
        10,
      );
      expect(candidateRepository.findOne).toHaveBeenCalledWith({
        where: { id: uploadData.candidateId },
      });
      expect(fileStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        mockCandidate.id,
      );
      expect(resumeProcessingQueue.add).toHaveBeenCalledWith(
        'process-resume',
        {
          candidateId: mockCandidate.id,
          fileUrl: mockUploadResult.url,
          filePath: mockUploadResult.path,
          originalName: mockFile.originalname,
          mimeType: mockFile.mimetype,
        },
        expect.any(Object),
      );
      expect(result).toEqual({
        jobId: 'job-123',
        candidateId: mockCandidate.id,
        fileUrl: mockUploadResult.url,
        status: 'queued',
      });
    });

    it('should create new candidate and upload resume', async () => {
      const uploadData = {
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      };
      const mockUploadResult = {
        url: 'https://storage.example.com/resume.pdf',
        path: 'candidates/new-candidate-id/resume.pdf',
      };
      const mockNewCandidate = {
        ...mockCandidate,
        id: 'new-candidate-id',
        email: uploadData.email,
        firstName: uploadData.firstName,
        lastName: uploadData.lastName,
      };
      const mockJob = { id: 'job-456' };

      jest.spyOn(fileStorageService, 'validateFileType').mockReturnValue(true);
      jest.spyOn(fileStorageService, 'validateFileSize').mockReturnValue(true);
      jest.spyOn(candidateRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(candidateRepository, 'create')
        .mockReturnValue(mockNewCandidate as any);
      jest
        .spyOn(candidateRepository, 'save')
        .mockResolvedValue(mockNewCandidate as any);
      jest
        .spyOn(fileStorageService, 'uploadFile')
        .mockResolvedValue(mockUploadResult);
      jest
        .spyOn(resumeProcessingQueue, 'add')
        .mockResolvedValue(mockJob as any);

      const result = await service.uploadResume(mockFile, uploadData);

      expect(candidateRepository.findOne).toHaveBeenCalledWith({
        where: { email: uploadData.email },
      });
      expect(candidateRepository.create).toHaveBeenCalledWith({
        email: uploadData.email,
        firstName: uploadData.firstName,
        lastName: uploadData.lastName,
        linkedinUrl: undefined,
        consentGiven: true,
        consentDate: expect.any(Date),
      });
      expect(result.candidateId).toBe(mockNewCandidate.id);
    });

    it('should throw error for invalid file type', async () => {
      const uploadData = { candidateId: 'test-candidate-id' };

      jest.spyOn(fileStorageService, 'validateFileType').mockReturnValue(false);

      await expect(service.uploadResume(mockFile, uploadData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadResume(mockFile, uploadData)).rejects.toThrow(
        'Invalid file type. Only PDF, DOCX, DOC, and image files are allowed.',
      );
    });

    it('should throw error for file size exceeding limit', async () => {
      const uploadData = { candidateId: 'test-candidate-id' };

      jest.spyOn(fileStorageService, 'validateFileType').mockReturnValue(true);
      jest.spyOn(fileStorageService, 'validateFileSize').mockReturnValue(false);

      await expect(service.uploadResume(mockFile, uploadData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadResume(mockFile, uploadData)).rejects.toThrow(
        'File size exceeds 10MB limit.',
      );
    });

    it('should throw error when candidate not found', async () => {
      const uploadData = { candidateId: 'non-existent-id' };

      jest.spyOn(fileStorageService, 'validateFileType').mockReturnValue(true);
      jest.spyOn(fileStorageService, 'validateFileSize').mockReturnValue(true);
      jest.spyOn(candidateRepository, 'findOne').mockResolvedValue(null);

      await expect(service.uploadResume(mockFile, uploadData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadResume(mockFile, uploadData)).rejects.toThrow(
        'Candidate not found',
      );
    });

    it('should throw error when neither candidateId nor email provided', async () => {
      const uploadData = {};

      jest.spyOn(fileStorageService, 'validateFileType').mockReturnValue(true);
      jest.spyOn(fileStorageService, 'validateFileSize').mockReturnValue(true);

      await expect(service.uploadResume(mockFile, uploadData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadResume(mockFile, uploadData)).rejects.toThrow(
        'Either candidateId or email must be provided',
      );
    });
  });

  describe('getProcessingStatus', () => {
    it('should return job status for queued job', async () => {
      const jobId = 'job-123';
      const mockJob = {
        getState: jest.fn().mockResolvedValue('waiting'),
        progress: jest.fn().mockReturnValue(0),
        failedReason: null,
        returnvalue: null,
      };

      jest
        .spyOn(resumeProcessingQueue, 'getJob')
        .mockResolvedValue(mockJob as any);

      const result = await service.getProcessingStatus(jobId);

      expect(resumeProcessingQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(result).toEqual({
        jobId,
        status: 'queued',
        progress: 0,
      });
    });

    it('should return job status for completed job', async () => {
      const jobId = 'job-123';
      const mockReturnValue = { parsedData: 'test data' };
      const mockJob = {
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn().mockReturnValue(100),
        failedReason: null,
        returnvalue: mockReturnValue,
      };

      jest
        .spyOn(resumeProcessingQueue, 'getJob')
        .mockResolvedValue(mockJob as any);

      const result = await service.getProcessingStatus(jobId);

      expect(result).toEqual({
        jobId,
        status: 'completed',
        progress: 100,
        parsedData: mockReturnValue,
      });
    });

    it('should return job status for failed job', async () => {
      const jobId = 'job-123';
      const mockJob = {
        getState: jest.fn().mockResolvedValue('failed'),
        progress: jest.fn().mockReturnValue(50),
        failedReason: 'Processing error',
        returnvalue: null,
      };

      jest
        .spyOn(resumeProcessingQueue, 'getJob')
        .mockResolvedValue(mockJob as any);

      const result = await service.getProcessingStatus(jobId);

      expect(result).toEqual({
        jobId,
        status: 'failed',
        progress: 50,
        error: 'Processing error',
      });
    });

    it('should throw error when job not found', async () => {
      const jobId = 'non-existent-job';

      jest.spyOn(resumeProcessingQueue, 'getJob').mockResolvedValue(null);

      await expect(service.getProcessingStatus(jobId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getProcessingStatus(jobId)).rejects.toThrow(
        'Job not found',
      );
    });
  });

  describe('retryProcessing', () => {
    it('should retry failed job', async () => {
      const jobId = 'job-123';
      const mockJob = {
        retry: jest.fn().mockResolvedValue(undefined),
      };

      jest
        .spyOn(resumeProcessingQueue, 'getJob')
        .mockResolvedValue(mockJob as any);

      await service.retryProcessing(jobId);

      expect(resumeProcessingQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should throw error when job not found for retry', async () => {
      const jobId = 'non-existent-job';

      jest.spyOn(resumeProcessingQueue, 'getJob').mockResolvedValue(null);

      await expect(service.retryProcessing(jobId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.retryProcessing(jobId)).rejects.toThrow(
        'Job not found',
      );
    });
  });
});
