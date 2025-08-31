import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { ResumeUploadService } from '../services/resume-upload.service';
import { ResumeProcessingService } from '../services/resume-processing.service';
import { FileStorageService } from '../services/file-storage.service';
import { OpenAIService } from '../services/openai.service';
import { ResumeProcessingProcessor } from '../processors/resume-processing.processor';
import { Candidate } from '../../entities/candidate.entity';
import { ParsedResumeData } from '../../entities/parsed-resume-data.entity';

describe('Resume Processing Pipeline E2E', () => {
  let resumeUploadService: ResumeUploadService;
  let resumeProcessingService: ResumeProcessingService;
  let resumeProcessingProcessor: ResumeProcessingProcessor;
  let candidateRepository: Repository<Candidate>;
  let parsedResumeDataRepository: Repository<ParsedResumeData>;
  let resumeProcessingQueue: Queue;
  let fileStorageService: FileStorageService;
  let openaiService: OpenAIService;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'john-doe-resume.pdf',
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
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    resumeUrl: null,
    consentGiven: true,
    consentDate: new Date(),
  };

  const mockParsedData = {
    personalInfo: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      location: 'New York, NY',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      portfolioUrl: 'https://johndoe.dev',
    },
    summary: 'Experienced software engineer with 5 years of experience',
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
    experience: [
      {
        company: 'Tech Corp',
        position: 'Senior Software Engineer',
        startDate: '2020-01',
        endDate: '2023-12',
        description:
          'Led development of web applications using React and Node.js',
        technologies: ['React', 'Node.js', 'TypeScript'],
      },
    ],
    education: [
      {
        institution: 'University of Technology',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationYear: 2019,
        gpa: '3.8',
      },
    ],
    certifications: [
      'AWS Certified Developer',
      'React Developer Certification',
    ],
    totalExperience: 5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeUploadService,
        ResumeProcessingService,
        ResumeProcessingProcessor,
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
        {
          provide: OpenAIService,
          useValue: {
            extractTextFromPDF: jest.fn(),
            parseStructuredData: jest.fn(),
          },
        },
      ],
    }).compile();

    resumeUploadService = module.get<ResumeUploadService>(ResumeUploadService);
    resumeProcessingService = module.get<ResumeProcessingService>(
      ResumeProcessingService,
    );
    resumeProcessingProcessor = module.get<ResumeProcessingProcessor>(
      ResumeProcessingProcessor,
    );
    candidateRepository = module.get<Repository<Candidate>>(
      getRepositoryToken(Candidate),
    );
    parsedResumeDataRepository = module.get<Repository<ParsedResumeData>>(
      getRepositoryToken(ParsedResumeData),
    );
    resumeProcessingQueue = module.get<Queue>(
      getQueueToken('resume-processing'),
    );
    fileStorageService = module.get<FileStorageService>(FileStorageService);
    openaiService = module.get<OpenAIService>(OpenAIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Resume Processing Pipeline', () => {
    it('should successfully process a complete resume upload and parsing workflow', async () => {
      // Step 1: Upload resume
      const uploadData = {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      const mockUploadResult = {
        url: 'https://storage.example.com/resume.pdf',
        path: 'candidates/test-candidate-id/resume.pdf',
      };
      const mockJob = { id: 'job-123' };

      // Mock upload service dependencies
      jest.spyOn(fileStorageService, 'validateFileType').mockReturnValue(true);
      jest.spyOn(fileStorageService, 'validateFileSize').mockReturnValue(true);
      jest.spyOn(candidateRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(candidateRepository, 'create')
        .mockReturnValue(mockCandidate as any);
      jest
        .spyOn(candidateRepository, 'save')
        .mockResolvedValue(mockCandidate as any);
      jest
        .spyOn(fileStorageService, 'uploadFile')
        .mockResolvedValue(mockUploadResult);
      jest
        .spyOn(resumeProcessingQueue, 'add')
        .mockResolvedValue(mockJob as any);

      const uploadResult = await resumeUploadService.uploadResume(
        mockFile,
        uploadData,
      );

      expect(uploadResult).toEqual({
        jobId: 'job-123',
        candidateId: mockCandidate.id,
        fileUrl: mockUploadResult.url,
        status: 'queued',
      });

      // Step 2: Process resume
      const jobData = {
        candidateId: mockCandidate.id,
        fileUrl: mockUploadResult.url,
        filePath: mockUploadResult.path,
        originalName: mockFile.originalname,
        mimeType: mockFile.mimetype,
      };

      const mockFileBuffer = Buffer.from('PDF file content');
      const extractedText = 'John Doe\nSoftware Engineer\n...resume content...';

      // Mock processing service dependencies
      jest.spyOn(candidateRepository, 'findOne').mockResolvedValue({
        ...mockCandidate,
        parsedData: null,
      } as any);
      jest
        .spyOn(fileStorageService, 'downloadFile')
        .mockResolvedValue(mockFileBuffer);
      jest
        .spyOn(openaiService, 'extractTextFromPDF')
        .mockResolvedValue(extractedText);
      jest
        .spyOn(openaiService, 'parseStructuredData')
        .mockResolvedValue(mockParsedData);

      const mockParsedResumeData = {
        id: 'parsed-data-id',
        skills: mockParsedData.skills,
        experience: mockParsedData.experience,
        education: mockParsedData.education,
        certifications: mockParsedData.certifications,
        summary: mockParsedData.summary,
        totalExperience: mockParsedData.totalExperience,
      };

      jest
        .spyOn(parsedResumeDataRepository, 'create')
        .mockReturnValue(mockParsedResumeData as any);
      jest
        .spyOn(parsedResumeDataRepository, 'save')
        .mockResolvedValue(mockParsedResumeData as any);

      const mockProgressCallback = jest.fn();
      const processingResult = await resumeProcessingService.processResume(
        jobData,
        mockProgressCallback,
      );

      expect(processingResult.success).toBe(true);
      expect(processingResult.candidateId).toBe(mockCandidate.id);
      expect(processingResult.parsedData).toEqual({
        skills: mockParsedData.skills,
        experience: mockParsedData.experience,
        education: mockParsedData.education,
        certifications: mockParsedData.certifications,
        summary: mockParsedData.summary,
        totalExperience: mockParsedData.totalExperience,
      });

      // Step 3: Process through job processor
      const mockJobWithData = {
        id: 'job-123',
        data: jobData,
        progress: jest.fn(),
        attemptsMade: 0,
      };

      const processorResult =
        await resumeProcessingProcessor.handleResumeProcessing(
          mockJobWithData as any,
        );

      expect(processorResult.success).toBe(true);
      expect(processorResult.candidateId).toBe(mockCandidate.id);
      expect(mockJobWithData.progress).toHaveBeenCalledWith(5); // Validation
      expect(mockJobWithData.progress).toHaveBeenCalledWith(10); // Start processing
      expect(mockJobWithData.progress).toHaveBeenCalledWith(100); // Complete

      // Verify all services were called correctly
      expect(fileStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        mockCandidate.id,
      );
      expect(fileStorageService.downloadFile).toHaveBeenCalledWith(
        mockUploadResult.path,
      );
      expect(openaiService.extractTextFromPDF).toHaveBeenCalledWith(
        mockFileBuffer,
        mockFile.originalname,
      );
      expect(openaiService.parseStructuredData).toHaveBeenCalledWith(
        extractedText,
      );
      expect(parsedResumeDataRepository.save).toHaveBeenCalledWith(
        mockParsedResumeData,
      );
    });

    it('should handle processing failures gracefully', async () => {
      const jobData = {
        candidateId: 'test-candidate-id',
        fileUrl: 'https://storage.example.com/resume.pdf',
        filePath: 'candidates/test-candidate-id/resume.pdf',
        originalName: 'resume.pdf',
        mimeType: 'application/pdf',
      };

      // Mock validation failure
      jest.spyOn(candidateRepository, 'findOne').mockResolvedValue(null);

      const mockJobWithData = {
        id: 'job-123',
        data: jobData,
        progress: jest.fn(),
        attemptsMade: 0,
      };

      const processorResult =
        await resumeProcessingProcessor.handleResumeProcessing(
          mockJobWithData as any,
        );

      expect(processorResult.success).toBe(false);
      expect(processorResult.error).toContain('Candidate not found');
      expect(processorResult.candidateId).toBe(jobData.candidateId);
    });

    it('should handle retryable errors correctly', async () => {
      const jobData = {
        candidateId: 'test-candidate-id',
        fileUrl: 'https://storage.example.com/resume.pdf',
        filePath: 'candidates/test-candidate-id/resume.pdf',
        originalName: 'resume.pdf',
        mimeType: 'application/pdf',
      };

      // Mock candidate exists
      jest
        .spyOn(candidateRepository, 'findOne')
        .mockResolvedValue(mockCandidate as any);

      // Mock retryable error (rate limit)
      const rateLimitError = new Error(
        'Rate limit exceeded - please try again later',
      );
      jest
        .spyOn(fileStorageService, 'downloadFile')
        .mockRejectedValue(rateLimitError);

      const mockJobWithData = {
        id: 'job-123',
        data: jobData,
        progress: jest.fn(),
        attemptsMade: 0,
      };

      // Should throw error for Bull to handle retry
      await expect(
        resumeProcessingProcessor.handleResumeProcessing(
          mockJobWithData as any,
        ),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle non-retryable errors correctly', async () => {
      const jobData = {
        candidateId: 'test-candidate-id',
        fileUrl: 'https://storage.example.com/resume.pdf',
        filePath: 'candidates/test-candidate-id/resume.pdf',
        originalName: 'resume.pdf',
        mimeType: 'application/pdf',
      };

      // Mock candidate exists
      jest
        .spyOn(candidateRepository, 'findOne')
        .mockResolvedValue(mockCandidate as any);

      // Mock non-retryable error
      const nonRetryableError = new Error('Invalid file format');
      jest
        .spyOn(fileStorageService, 'downloadFile')
        .mockRejectedValue(nonRetryableError);

      const mockJobWithData = {
        id: 'job-123',
        data: jobData,
        progress: jest.fn(),
        attemptsMade: 2, // Max attempts reached
      };

      const processorResult =
        await resumeProcessingProcessor.handleResumeProcessing(
          mockJobWithData as any,
        );

      expect(processorResult.success).toBe(false);
      expect(processorResult.error).toContain('Invalid file format');
    });

    it('should track processing status correctly', async () => {
      const jobId = 'job-123';
      const mockJob = {
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn().mockReturnValue(100),
        attemptsMade: 1,
        processedOn: Date.now() - 5000,
        finishedOn: Date.now(),
        failedReason: null,
        returnvalue: {
          success: true,
          candidateId: 'test-candidate-id',
          parsedData: {
            skills: ['JavaScript', 'React'],
            experience: [],
            education: [],
            certifications: [],
            summary: 'Test summary',
            totalExperience: 3,
          },
        },
      };

      jest
        .spyOn(resumeProcessingQueue, 'getJob')
        .mockResolvedValue(mockJob as any);

      const status = await resumeUploadService.getProcessingStatus(jobId);

      expect(status).toEqual({
        jobId,
        status: 'completed',
        progress: 100,
        attempts: 1,
        startedAt: expect.any(String),
        completedAt: expect.any(String),
        parsedData: mockJob.returnvalue.parsedData,
      });
    });
  });
});
