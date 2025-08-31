import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from '../file-storage.service';

// Mock Supabase client
const mockSupabaseClient = {
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn(),
    download: jest.fn(),
    remove: jest.fn(),
    getPublicUrl: jest.fn(),
  },
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('FileStorageService', () => {
  let service: FileStorageService;
  let configService: ConfigService;

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
      providers: [
        FileStorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'SUPABASE_URL':
                  return 'https://test.supabase.co';
                case 'SUPABASE_ANON_KEY':
                  return 'test-anon-key';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if Supabase configuration is missing', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(null),
      };

      expect(() => {
        new FileStorageService(mockConfigService as any);
      }).toThrow('Supabase configuration is missing');
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const candidateId = 'test-candidate-id';
      const mockUploadResponse = {
        data: { path: 'candidates/test-candidate-id/resume_123456789.pdf' },
        error: null,
      };
      const mockUrlResponse = {
        data: {
          publicUrl:
            'https://test.supabase.co/storage/v1/object/public/resumes/candidates/test-candidate-id/resume_123456789.pdf',
        },
      };

      mockSupabaseClient.storage.upload.mockResolvedValue(mockUploadResponse);
      mockSupabaseClient.storage.getPublicUrl.mockReturnValue(mockUrlResponse);

      const result = await service.uploadFile(mockFile, candidateId);

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('resumes');
      expect(mockSupabaseClient.storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(
          /^candidates\/test-candidate-id\/resume_\d+\.pdf$/,
        ),
        mockFile.buffer,
        {
          contentType: mockFile.mimetype,
          upsert: false,
        },
      );
      expect(result.url).toBe(mockUrlResponse.data.publicUrl);
      expect(result.path).toMatch(
        /^candidates\/test-candidate-id\/resume_\d+\.pdf$/,
      );
    });

    it('should throw error if upload fails', async () => {
      const candidateId = 'test-candidate-id';
      const mockUploadResponse = {
        data: null,
        error: { message: 'Upload failed' },
      };

      mockSupabaseClient.storage.upload.mockResolvedValue(mockUploadResponse);

      await expect(service.uploadFile(mockFile, candidateId)).rejects.toThrow(
        'File upload failed: Upload failed',
      );
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const filePath = 'candidates/test-candidate-id/resume.pdf';
      const mockFileContent = 'test file content';
      const mockDownloadResponse = {
        data: new Blob([mockFileContent]),
        error: null,
      };

      mockSupabaseClient.storage.download.mockResolvedValue(
        mockDownloadResponse,
      );

      const result = await service.downloadFile(filePath);

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('resumes');
      expect(mockSupabaseClient.storage.download).toHaveBeenCalledWith(
        filePath,
      );
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw error if download fails', async () => {
      const filePath = 'candidates/test-candidate-id/resume.pdf';
      const mockDownloadResponse = {
        data: null,
        error: { message: 'Download failed' },
      };

      mockSupabaseClient.storage.download.mockResolvedValue(
        mockDownloadResponse,
      );

      await expect(service.downloadFile(filePath)).rejects.toThrow(
        'File download failed: Download failed',
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const filePath = 'candidates/test-candidate-id/resume.pdf';
      const mockDeleteResponse = {
        error: null,
      };

      mockSupabaseClient.storage.remove.mockResolvedValue(mockDeleteResponse);

      await service.deleteFile(filePath);

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('resumes');
      expect(mockSupabaseClient.storage.remove).toHaveBeenCalledWith([
        filePath,
      ]);
    });

    it('should throw error if deletion fails', async () => {
      const filePath = 'candidates/test-candidate-id/resume.pdf';
      const mockDeleteResponse = {
        error: { message: 'Deletion failed' },
      };

      mockSupabaseClient.storage.remove.mockResolvedValue(mockDeleteResponse);

      await expect(service.deleteFile(filePath)).rejects.toThrow(
        'File deletion failed: Deletion failed',
      );
    });
  });

  describe('validateFileType', () => {
    it('should return true for valid PDF file', () => {
      const result = service.validateFileType(mockFile);
      expect(result).toBe(true);
    });

    it('should return true for valid DOCX file', () => {
      const docxFile = {
        ...mockFile,
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      const result = service.validateFileType(docxFile);
      expect(result).toBe(true);
    });

    it('should return true for valid image file', () => {
      const imageFile = {
        ...mockFile,
        mimetype: 'image/jpeg',
      };
      const result = service.validateFileType(imageFile);
      expect(result).toBe(true);
    });

    it('should return false for invalid file type', () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'text/plain',
      };
      const result = service.validateFileType(invalidFile);
      expect(result).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should return true for file within size limit', () => {
      const result = service.validateFileSize(mockFile, 10);
      expect(result).toBe(true);
    });

    it('should return false for file exceeding size limit', () => {
      const largeFile = {
        ...mockFile,
        size: 15 * 1024 * 1024, // 15MB
      };
      const result = service.validateFileSize(largeFile, 10);
      expect(result).toBe(false);
    });

    it('should use default 10MB limit when not specified', () => {
      const result = service.validateFileSize(mockFile);
      expect(result).toBe(true);
    });
  });
});
