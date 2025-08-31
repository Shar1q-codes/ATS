import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ResumeUploadController } from '../resume-upload.controller';
import { ResumeUploadService } from '../../services/resume-upload.service';

describe('ResumeUploadController', () => {
  let controller: ResumeUploadController;
  let resumeUploadService: ResumeUploadService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResumeUploadController],
      providers: [
        {
          provide: ResumeUploadService,
          useValue: {
            uploadResume: jest.fn(),
            getProcessingStatus: jest.fn(),
            retryProcessing: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ResumeUploadController>(ResumeUploadController);
    resumeUploadService = module.get<ResumeUploadService>(ResumeUploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadResume', () => {
    it('should upload resume successfully', async () => {
      const uploadData = { candidateId: 'test-candidate-id' };
      const expectedResult = {
        jobId: 'job-123',
        candidateId: 'test-candidate-id',
        fileUrl: 'https://storage.example.com/resume.pdf',
        status: 'queued',
      };

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockResolvedValue(expectedResult);

      const result = await controller.uploadResume(mockFile, uploadData);

      expect(resumeUploadService.uploadResume).toHaveBeenCalledWith(
        mockFile,
        uploadData,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      const uploadData = { candidateId: 'test-candidate-id' };

      await expect(controller.uploadResume(null, uploadData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.uploadResume(null, uploadData)).rejects.toThrow(
        'No file uploaded',
      );
    });

    it('should handle service errors', async () => {
      const uploadData = { candidateId: 'test-candidate-id' };
      const serviceError = new BadRequestException('Invalid file type');

      jest
        .spyOn(resumeUploadService, 'uploadResume')
        .mockRejectedValue(serviceError);

      await expect(
        controller.uploadResume(mockFile, uploadData),
      ).rejects.toThrow(serviceError);
    });
  });

  describe('getProcessingStatus', () => {
    it('should return processing status', async () => {
      const jobId = 'job-123';
      const expectedStatus = {
        jobId,
        status: 'processing',
        progress: 50,
      };

      jest
        .spyOn(resumeUploadService, 'getProcessingStatus')
        .mockResolvedValue(expectedStatus);

      const result = await controller.getProcessingStatus(jobId);

      expect(resumeUploadService.getProcessingStatus).toHaveBeenCalledWith(
        jobId,
      );
      expect(result).toEqual(expectedStatus);
    });

    it('should handle service errors for status check', async () => {
      const jobId = 'non-existent-job';
      const serviceError = new BadRequestException('Job not found');

      jest
        .spyOn(resumeUploadService, 'getProcessingStatus')
        .mockRejectedValue(serviceError);

      await expect(controller.getProcessingStatus(jobId)).rejects.toThrow(
        serviceError,
      );
    });
  });

  describe('retryProcessing', () => {
    it('should retry processing successfully', async () => {
      const jobId = 'job-123';

      jest
        .spyOn(resumeUploadService, 'retryProcessing')
        .mockResolvedValue(undefined);

      const result = await controller.retryProcessing(jobId);

      expect(resumeUploadService.retryProcessing).toHaveBeenCalledWith(jobId);
      expect(result).toEqual({ message: 'Processing retry initiated' });
    });

    it('should handle service errors for retry', async () => {
      const jobId = 'non-existent-job';
      const serviceError = new BadRequestException('Job not found');

      jest
        .spyOn(resumeUploadService, 'retryProcessing')
        .mockRejectedValue(serviceError);

      await expect(controller.retryProcessing(jobId)).rejects.toThrow(
        serviceError,
      );
    });
  });
});
