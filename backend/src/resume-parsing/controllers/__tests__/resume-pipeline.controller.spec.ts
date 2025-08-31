import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ResumePipelineController } from '../resume-pipeline.controller';
import {
  ResumePipelineService,
  PipelineStatus,
} from '../../services/resume-pipeline.service';

describe('ResumePipelineController', () => {
  let controller: ResumePipelineController;
  let resumePipelineService: ResumePipelineService;

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

  const mockPipelineStatus: PipelineStatus = {
    jobId: 'job-123',
    candidateId: 'candidate-123',
    status: 'processing',
    progress: 50,
    stage: 'parsing',
    startedAt: new Date(),
    attempts: 1,
    maxAttempts: 3,
    notifications: [
      {
        type: 'info',
        message: 'Processing started',
        timestamp: new Date(),
        stage: 'upload',
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResumePipelineController],
      providers: [
        {
          provide: ResumePipelineService,
          useValue: {
            startPipeline: jest.fn(),
            getPipelineStatus: jest.fn(),
            retryPipeline: jest.fn(),
            getAllPipelineStatuses: jest.fn(),
            getPipelineStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ResumePipelineController>(ResumePipelineController);
    resumePipelineService = module.get<ResumePipelineService>(
      ResumePipelineService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadAndProcess', () => {
    it('should upload and start pipeline processing', async () => {
      const uploadData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockResult = {
        jobId: 'job-123',
        candidateId: 'candidate-123',
        fileUrl: 'https://storage.example.com/resume.pdf',
        status: 'queued',
      };

      jest
        .spyOn(resumePipelineService, 'startPipeline')
        .mockResolvedValue(mockResult);

      const result = await controller.uploadAndProcess(mockFile, uploadData);

      expect(result).toEqual(mockResult);
      expect(resumePipelineService.startPipeline).toHaveBeenCalledWith(
        mockFile,
        uploadData,
      );
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      const uploadData = { email: 'test@example.com' };

      await expect(
        controller.uploadAndProcess(null as any, uploadData),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.uploadAndProcess(null as any, uploadData),
      ).rejects.toThrow('No file uploaded');
    });

    it('should handle service errors', async () => {
      const uploadData = { email: 'test@example.com' };
      const serviceError = new Error('Service error');

      jest
        .spyOn(resumePipelineService, 'startPipeline')
        .mockRejectedValue(serviceError);

      await expect(
        controller.uploadAndProcess(mockFile, uploadData),
      ).rejects.toThrow('Service error');
    });
  });

  describe('getPipelineStatus', () => {
    it('should return pipeline status', async () => {
      const jobId = 'job-123';

      jest
        .spyOn(resumePipelineService, 'getPipelineStatus')
        .mockResolvedValue(mockPipelineStatus);

      const result = await controller.getPipelineStatus(jobId);

      expect(result).toEqual(mockPipelineStatus);
      expect(resumePipelineService.getPipelineStatus).toHaveBeenCalledWith(
        jobId,
      );
    });

    it('should throw BadRequestException when pipeline not found', async () => {
      const jobId = 'non-existent-job';

      jest
        .spyOn(resumePipelineService, 'getPipelineStatus')
        .mockResolvedValue(null);

      await expect(controller.getPipelineStatus(jobId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getPipelineStatus(jobId)).rejects.toThrow(
        'Pipeline not found',
      );
    });
  });

  describe('retryPipeline', () => {
    it('should retry pipeline successfully', async () => {
      const jobId = 'job-123';

      jest.spyOn(resumePipelineService, 'retryPipeline').mockResolvedValue();

      const result = await controller.retryPipeline(jobId);

      expect(result).toEqual({
        message: 'Pipeline retry initiated successfully',
      });
      expect(resumePipelineService.retryPipeline).toHaveBeenCalledWith(jobId);
    });

    it('should handle retry errors', async () => {
      const jobId = 'job-123';
      const retryError = new Error('Maximum retry attempts exceeded');

      jest
        .spyOn(resumePipelineService, 'retryPipeline')
        .mockRejectedValue(retryError);

      await expect(controller.retryPipeline(jobId)).rejects.toThrow(
        'Maximum retry attempts exceeded',
      );
    });
  });

  describe('getAllPipelineStatuses', () => {
    it('should return all pipeline statuses', async () => {
      const mockStatuses = [mockPipelineStatus];

      jest
        .spyOn(resumePipelineService, 'getAllPipelineStatuses')
        .mockResolvedValue(mockStatuses);

      const result = await controller.getAllPipelineStatuses();

      expect(result).toEqual(mockStatuses);
      expect(resumePipelineService.getAllPipelineStatuses).toHaveBeenCalled();
    });
  });

  describe('getPipelineStatistics', () => {
    it('should return pipeline statistics', async () => {
      const mockStats = {
        total: 10,
        queued: 2,
        processing: 3,
        completed: 4,
        failed: 1,
        retrying: 0,
      };

      jest
        .spyOn(resumePipelineService, 'getPipelineStatistics')
        .mockResolvedValue(mockStats);

      const result = await controller.getPipelineStatistics();

      expect(result).toEqual(mockStats);
      expect(resumePipelineService.getPipelineStatistics).toHaveBeenCalled();
    });
  });

  describe('getCandidatePipelineStatuses', () => {
    it('should return pipeline statuses for specific candidate', async () => {
      const candidateId = 'candidate-123';
      const mockStatuses = [mockPipelineStatus];

      jest
        .spyOn(resumePipelineService, 'getAllPipelineStatuses')
        .mockResolvedValue(mockStatuses);

      const result = await controller.getCandidatePipelineStatuses(candidateId);

      expect(result).toEqual(mockStatuses);
      expect(resumePipelineService.getAllPipelineStatuses).toHaveBeenCalled();
    });

    it('should filter statuses by candidate ID', async () => {
      const candidateId = 'candidate-123';
      const mockStatuses = [
        { ...mockPipelineStatus, candidateId: 'candidate-123' },
        {
          ...mockPipelineStatus,
          candidateId: 'candidate-456',
          jobId: 'job-456',
        },
      ];

      jest
        .spyOn(resumePipelineService, 'getAllPipelineStatuses')
        .mockResolvedValue(mockStatuses);

      const result = await controller.getCandidatePipelineStatuses(candidateId);

      expect(result).toHaveLength(1);
      expect(result[0].candidateId).toBe('candidate-123');
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status', async () => {
      const mockStats = {
        total: 10,
        queued: 2,
        processing: 3,
        completed: 4,
        failed: 1,
        retrying: 0,
      };

      jest
        .spyOn(resumePipelineService, 'getPipelineStatistics')
        .mockResolvedValue(mockStats);

      const result = await controller.getHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.queueHealth).toEqual({
        processing: 3,
        queued: 2,
        retrying: 0,
      });
      expect(result.statistics).toEqual(mockStats);
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded status for high failure rate', async () => {
      const mockStats = {
        total: 10,
        queued: 1,
        processing: 1,
        completed: 5,
        failed: 3, // 30% failure rate
        retrying: 0,
      };

      jest
        .spyOn(resumePipelineService, 'getPipelineStatistics')
        .mockResolvedValue(mockStats);

      const result = await controller.getHealthStatus();

      expect(result.status).toBe('degraded');
    });

    it('should return unhealthy status for very high failure rate', async () => {
      const mockStats = {
        total: 10,
        queued: 0,
        processing: 0,
        completed: 4,
        failed: 6, // 60% failure rate
        retrying: 0,
      };

      jest
        .spyOn(resumePipelineService, 'getPipelineStatistics')
        .mockResolvedValue(mockStats);

      const result = await controller.getHealthStatus();

      expect(result.status).toBe('unhealthy');
    });

    it('should return unhealthy status when service throws error', async () => {
      jest
        .spyOn(resumePipelineService, 'getPipelineStatistics')
        .mockRejectedValue(new Error('Service unavailable'));

      const result = await controller.getHealthStatus();

      expect(result.status).toBe('unhealthy');
      expect(result.queueHealth).toBeNull();
      expect(result.statistics).toBeNull();
    });

    it('should handle zero total pipelines', async () => {
      const mockStats = {
        total: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        retrying: 0,
      };

      jest
        .spyOn(resumePipelineService, 'getPipelineStatistics')
        .mockResolvedValue(mockStats);

      const result = await controller.getHealthStatus();

      expect(result.status).toBe('healthy'); // No failures when no pipelines
    });
  });
});
