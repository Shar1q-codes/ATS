import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeProcessingService } from '../resume-processing.service';
import { FileStorageService } from '../file-storage.service';
import { OpenAIService } from '../openai.service';
import { Candidate } from '../../../entities/candidate.entity';
import { ParsedResumeData } from '../../../entities/parsed-resume-data.entity';

describe('ResumeProcessingService', () => {
  let service: ResumeProcessingService;
  let candidateRepository: Repository<Candidate>;
  let parsedResumeDataRepository: Repository<ParsedResumeData>;
  let fileStorageService: FileStorageService;
  let openaiService: OpenAIService;

  const mockCandidate = {
    id: 'test-candidate-id',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    parsedData: null,
  };

  const mockJobData = {
    candidateId: 'test-candidate-id',
    fileUrl: 'https://storage.example.com/resume.pdf',
    filePath: 'candidates/test-candidate-id/resume.pdf',
    originalName: 'resume.pdf',
    mimeType: 'application/pdf',
  };

  const mockParsedData = {
    personalInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      location: 'New York, NY',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      portfolioUrl: 'https://johndoe.dev',
    },
    summary: 'Experienced software engineer',
    skills: ['JavaScript', 'TypeScript', 'React'],
    experience: [
      {
        company: 'Tech Corp',
        position: 'Senior Developer',
        startDate: '2020-01',
        endDate: '2023-12',
        description: 'Led development team',
        technologies: ['React', 'Node.js'],
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
    certifications: ['AWS Certified Developer'],
    totalExperience: 4,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeProcessingService,
        {
          provide: getRepositoryToken(Candidate),
          useValue: {
            findOne: jest.fn(),
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
          provide: FileStorageService,
          useValue: {
            downloadFile: jest.fn(),
          },
        },
        {
          provide: OpenAIService,
          useValue: {
            extractTextFromPDF: jest.fn(),
            extractTextFromDOCX: jest.fn(),
            extractTextFromImage: jest.fn(),
            parseStructuredData: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResumeProcessingService>(ResumeProcessingService);
    candidateRepository = module.get<Repository<Candidate>>(
      getRepositoryToken(Candidate),
    );
    parsedResumeDataRepository = module.get<Repository<ParsedResumeData>>(
      getRepositoryToken(ParsedResumeData),
    );
    fileStorageService = module.get<FileStorageService>(FileStorageService);
    openaiService = module.get<OpenAIService>(OpenAIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processResume', () => {
    const mockProgressCallback = jest.fn();
    const mockFileBuffer = Buffer.from('test file content');

    beforeEach(() => {
      mockProgressCallback.mockClear();
    });

    it('should process PDF resume successfully', async () => {
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
        .spyOn(fileStorageService, 'downloadFile')
        .mockResolvedValue(mockFileBuffer);
      jest
        .spyOn(openaiService, 'extractTextFromPDF')
        .mockResolvedValue('Extracted PDF text');
      jest
        .spyOn(openaiService, 'parseStructuredData')
        .mockResolvedValue(mockParsedData);
      jest.spyOn(candidateRepository, 'findOne').mockResolvedValue({
        ...mockCandidate,
        parsedData: null,
      } as any);
      jest
        .spyOn(candidateRepository, 'save')
        .mockResolvedValue(mockCandidate as any);
      jest
        .spyOn(parsedResumeDataRepository, 'create')
        .mockReturnValue(mockParsedResumeData as any);
      jest
        .spyOn(parsedResumeDataRepository, 'save')
        .mockResolvedValue(mockParsedResumeData as any);

      const result = await service.processResume(
        mockJobData,
        mockProgressCallback,
      );

      expect(fileStorageService.downloadFile).toHaveBeenCalledWith(
        mockJobData.filePath,
      );
      expect(openaiService.extractTextFromPDF).toHaveBeenCalledWith(
        mockFileBuffer,
        mockJobData.originalName,
      );
      expect(openaiService.parseStructuredData).toHaveBeenCalledWith(
        'Extracted PDF text',
      );
      expect(candidateRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockJobData.candidateId },
        relations: ['parsedData'],
      });

      // Should update candidate with personal info
      expect(candidateRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: mockParsedData.personalInfo.phone,
          location: mockParsedData.personalInfo.location,
          linkedinUrl: mockParsedData.personalInfo.linkedinUrl,
          portfolioUrl: mockParsedData.personalInfo.portfolioUrl,
        }),
      );

      expect(parsedResumeDataRepository.create).toHaveBeenCalledWith({
        candidate: expect.any(Object),
        skills: mockParsedData.skills,
        experience: mockParsedData.experience,
        education: mockParsedData.education,
        certifications: mockParsedData.certifications,
        summary: mockParsedData.summary,
        totalExperience: mockParsedData.totalExperience,
      });

      expect(parsedResumeDataRepository.save).toHaveBeenCalledWith(
        mockParsedResumeData,
      );

      expect(mockProgressCallback).toHaveBeenCalledWith(20);
      expect(mockProgressCallback).toHaveBeenCalledWith(40);
      expect(mockProgressCallback).toHaveBeenCalledWith(60);
      expect(mockProgressCallback).toHaveBeenCalledWith(80);
      expect(mockProgressCallback).toHaveBeenCalledWith(100);

      expect(result).toEqual({
        candidateId: mockJobData.candidateId,
        success: true,
        parsedData: {
          skills: mockParsedData.skills,
          experience: mockParsedData.experience,
          education: mockParsedData.education,
          certifications: mockParsedData.certifications,
          summary: mockParsedData.summary,
          totalExperience: mockParsedData.totalExperience,
        },
        processingTime: expect.any(Number),
      });
    });

    it('should process DOCX resume successfully', async () => {
      const docxJobData = {
        ...mockJobData,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      jest
        .spyOn(fileStorageService, 'downloadFile')
        .mockResolvedValue(mockFileBuffer);
      jest
        .spyOn(openaiService, 'extractTextFromDOCX')
        .mockResolvedValue('Extracted DOCX text');
      jest
        .spyOn(openaiService, 'parseStructuredData')
        .mockResolvedValue(mockParsedData);
      jest
        .spyOn(candidateRepository, 'findOne')
        .mockResolvedValue({ ...mockCandidate, parsedData: null } as any);
      jest
        .spyOn(candidateRepository, 'save')
        .mockResolvedValue(mockCandidate as any);
      jest
        .spyOn(parsedResumeDataRepository, 'create')
        .mockReturnValue({} as any);
      jest
        .spyOn(parsedResumeDataRepository, 'save')
        .mockResolvedValue({} as any);

      await service.processResume(docxJobData, mockProgressCallback);

      expect(openaiService.extractTextFromDOCX).toHaveBeenCalledWith(
        mockFileBuffer,
        docxJobData.originalName,
      );
    });

    it('should process image resume successfully', async () => {
      const imageJobData = { ...mockJobData, mimeType: 'image/jpeg' };

      jest
        .spyOn(fileStorageService, 'downloadFile')
        .mockResolvedValue(mockFileBuffer);
      jest
        .spyOn(openaiService, 'extractTextFromImage')
        .mockResolvedValue('Extracted image text');
      jest
        .spyOn(openaiService, 'parseStructuredData')
        .mockResolvedValue(mockParsedData);
      jest
        .spyOn(candidateRepository, 'findOne')
        .mockResolvedValue({ ...mockCandidate, parsedData: null } as any);
      jest
        .spyOn(candidateRepository, 'save')
        .mockResolvedValue(mockCandidate as any);
      jest
        .spyOn(parsedResumeDataRepository, 'create')
        .mockReturnValue({} as any);
      jest
        .spyOn(parsedResumeDataRepository, 'save')
        .mockResolvedValue({} as any);

      await service.processResume(imageJobData, mockProgressCallback);

      expect(openaiService.extractTextFromImage).toHaveBeenCalledWith(
        mockFileBuffer,
        imageJobData.originalName,
      );
    });

    it('should update existing parsed resume data', async () => {
      const existingParsedData = {
        id: 'existing-parsed-data-id',
        skills: ['Old Skill'],
        experience: [],
        education: [],
        certifications: [],
        summary: 'Old summary',
        totalExperience: 0,
      };

      const candidateWithExistingData = {
        ...mockCandidate,
        parsedData: existingParsedData,
      };

      jest
        .spyOn(fileStorageService, 'downloadFile')
        .mockResolvedValue(mockFileBuffer);
      jest
        .spyOn(openaiService, 'extractTextFromPDF')
        .mockResolvedValue('Extracted PDF text');
      jest
        .spyOn(openaiService, 'parseStructuredData')
        .mockResolvedValue(mockParsedData);
      jest
        .spyOn(candidateRepository, 'findOne')
        .mockResolvedValue(candidateWithExistingData as any);
      jest
        .spyOn(candidateRepository, 'save')
        .mockResolvedValue(mockCandidate as any);
      jest
        .spyOn(parsedResumeDataRepository, 'save')
        .mockResolvedValue(existingParsedData as any);

      await service.processResume(mockJobData, mockProgressCallback);

      expect(parsedResumeDataRepository.create).not.toHaveBeenCalled();
      expect(parsedResumeDataRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: mockParsedData.skills,
          experience: mockParsedData.experience,
          education: mockParsedData.education,
          certifications: mockParsedData.certifications,
          summary: mockParsedData.summary,
          totalExperience: mockParsedData.totalExperience,
        }),
      );
    });

    it('should not overwrite existing candidate personal info', async () => {
      const candidateWithExistingInfo = {
        ...mockCandidate,
        email: 'existing@example.com',
        phone: '+9876543210',
        location: 'Existing Location',
        linkedinUrl: 'https://linkedin.com/in/existing',
        portfolioUrl: 'https://existing.dev',
      };

      jest
        .spyOn(fileStorageService, 'downloadFile')
        .mockResolvedValue(mockFileBuffer);
      jest
        .spyOn(openaiService, 'extractTextFromPDF')
        .mockResolvedValue('Extracted PDF text');
      jest
        .spyOn(openaiService, 'parseStructuredData')
        .mockResolvedValue(mockParsedData);
      jest.spyOn(candidateRepository, 'findOne').mockResolvedValue({
        ...candidateWithExistingInfo,
        parsedData: null,
      } as any);
      jest
        .spyOn(candidateRepository, 'save')
        .mockResolvedValue(candidateWithExistingInfo as any);
      jest
        .spyOn(parsedResumeDataRepository, 'create')
        .mockReturnValue({} as any);
      jest
        .spyOn(parsedResumeDataRepository, 'save')
        .mockResolvedValue({} as any);

      await service.processResume(mockJobData, mockProgressCallback);

      // Should not overwrite existing personal info
      expect(candidateRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'existing@example.com', // Should keep existing
          phone: '+9876543210', // Should keep existing
          location: 'Existing Location', // Should keep existing
          linkedinUrl: 'https://linkedin.com/in/existing', // Should keep existing
          portfolioUrl: 'https://existing.dev', // Should keep existing
        }),
      );
    });

    it('should return error for unsupported file type', async () => {
      const unsupportedJobData = { ...mockJobData, mimeType: 'text/plain' };

      jest
        .spyOn(fileStorageService, 'downloadFile')
        .mockResolvedValue(mockFileBuffer);

      const result = await service.processResume(
        unsupportedJobData,
        mockProgressCallback,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file type: text/plain');
      expect(result.candidateId).toBe(unsupportedJobData.candidateId);
    });

    it('should return error when candidate not found', async () => {
      jest
        .spyOn(fileStorageService, 'downloadFile')
        .mockResolvedValue(mockFileBuffer);
      jest
        .spyOn(openaiService, 'extractTextFromPDF')
        .mockResolvedValue('Extracted PDF text');
      jest
        .spyOn(openaiService, 'parseStructuredData')
        .mockResolvedValue(mockParsedData);
      jest.spyOn(candidateRepository, 'findOne').mockResolvedValue(null);

      const result = await service.processResume(
        mockJobData,
        mockProgressCallback,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Candidate not found: test-candidate-id');
      expect(result.candidateId).toBe(mockJobData.candidateId);
    });

    it('should return error for file download failures', async () => {
      const downloadError = new Error('File download failed');
      jest
        .spyOn(fileStorageService, 'downloadFile')
        .mockRejectedValue(downloadError);

      const result = await service.processResume(
        mockJobData,
        mockProgressCallback,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('File download failed');
      expect(result.candidateId).toBe(mockJobData.candidateId);
    });

    it('should return error for OpenAI extraction failures', async () => {
      const extractionError = new Error('Text extraction failed');
      jest
        .spyOn(fileStorageService, 'downloadFile')
        .mockResolvedValue(mockFileBuffer);
      jest
        .spyOn(openaiService, 'extractTextFromPDF')
        .mockRejectedValue(extractionError);

      const result = await service.processResume(
        mockJobData,
        mockProgressCallback,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Text extraction failed');
      expect(result.candidateId).toBe(mockJobData.candidateId);
    });

    it('should return error for OpenAI parsing failures', async () => {
      const parsingError = new Error('Structured data parsing failed');
      jest
        .spyOn(fileStorageService, 'downloadFile')
        .mockResolvedValue(mockFileBuffer);
      jest
        .spyOn(openaiService, 'extractTextFromPDF')
        .mockResolvedValue('Extracted PDF text');
      jest
        .spyOn(openaiService, 'parseStructuredData')
        .mockRejectedValue(parsingError);

      const result = await service.processResume(
        mockJobData,
        mockProgressCallback,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Structured data parsing failed');
      expect(result.candidateId).toBe(mockJobData.candidateId);
    });
  });
});
