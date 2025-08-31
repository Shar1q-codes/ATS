import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportService } from '../services/import.service';
import { ValidationService } from '../services/validation.service';
import { MappingService } from '../services/mapping.service';
import {
  ImportJob,
  ImportStatus,
  ImportType,
} from '../../entities/import-job.entity';
import { Candidate } from '../../entities/candidate.entity';
import { JobFamily } from '../../entities/job-family.entity';
import { Application } from '../../entities/application.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';
import { ParsedResumeData } from '../../entities/parsed-resume-data.entity';

describe('ImportService', () => {
  let service: ImportService;
  let importJobRepository: Repository<ImportJob>;
  let candidateRepository: Repository<Candidate>;
  let validationService: ValidationService;
  let mappingService: MappingService;

  const mockImportJobRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockCandidateRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockValidationService = {
    validateCandidateData: jest.fn(),
    validateJobData: jest.fn(),
    validateApplicationData: jest.fn(),
  };

  const mockMappingService = {
    detectFieldMapping: jest.fn(),
    transformRecord: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: getRepositoryToken(ImportJob),
          useValue: mockImportJobRepository,
        },
        {
          provide: getRepositoryToken(Candidate),
          useValue: mockCandidateRepository,
        },
        {
          provide: getRepositoryToken(JobFamily),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Application),
          useValue: {},
        },
        {
          provide: getRepositoryToken(CompanyProfile),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ParsedResumeData),
          useValue: {},
        },
        {
          provide: ValidationService,
          useValue: mockValidationService,
        },
        {
          provide: MappingService,
          useValue: mockMappingService,
        },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    importJobRepository = module.get<Repository<ImportJob>>(
      getRepositoryToken(ImportJob),
    );
    candidateRepository = module.get<Repository<Candidate>>(
      getRepositoryToken(Candidate),
    );
    validationService = module.get<ValidationService>(ValidationService);
    mappingService = module.get<MappingService>(MappingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createImportJob', () => {
    it('should create an import job successfully', async () => {
      const createImportDto = {
        filename: 'candidates.csv',
        fileUrl: 'https://example.com/candidates.csv',
        type: ImportType.CANDIDATES,
        fieldMapping: { Email: 'email', Name: 'firstName' },
      };

      const organizationId = 'org-123';
      const createdBy = 'user-123';

      const mockImportJob = {
        id: 'import-123',
        ...createImportDto,
        organizationId,
        createdBy,
        status: ImportStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockImportJobRepository.create.mockReturnValue(mockImportJob);
      mockImportJobRepository.save.mockResolvedValue(mockImportJob);

      const result = await service.createImportJob(
        createImportDto,
        organizationId,
        createdBy,
      );

      expect(mockImportJobRepository.create).toHaveBeenCalledWith({
        ...createImportDto,
        organizationId,
        createdBy,
        status: ImportStatus.PENDING,
      });
      expect(mockImportJobRepository.save).toHaveBeenCalledWith(mockImportJob);
      expect(result).toEqual(mockImportJob);
    });
  });

  describe('getImportJobs', () => {
    it('should return import jobs for organization', async () => {
      const organizationId = 'org-123';
      const mockImportJobs = [
        {
          id: 'import-1',
          filename: 'candidates1.csv',
          status: ImportStatus.COMPLETED,
          organizationId,
        },
        {
          id: 'import-2',
          filename: 'candidates2.csv',
          status: ImportStatus.PENDING,
          organizationId,
        },
      ];

      mockImportJobRepository.find.mockResolvedValue(mockImportJobs);

      const result = await service.getImportJobs(organizationId);

      expect(mockImportJobRepository.find).toHaveBeenCalledWith({
        where: { organizationId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockImportJobs);
    });
  });

  describe('getImportJob', () => {
    it('should return specific import job', async () => {
      const id = 'import-123';
      const organizationId = 'org-123';
      const mockImportJob = {
        id,
        filename: 'candidates.csv',
        organizationId,
        status: ImportStatus.COMPLETED,
      };

      mockImportJobRepository.findOne.mockResolvedValue(mockImportJob);

      const result = await service.getImportJob(id, organizationId);

      expect(mockImportJobRepository.findOne).toHaveBeenCalledWith({
        where: { id, organizationId },
      });
      expect(result).toEqual(mockImportJob);
    });

    it('should return null if import job not found', async () => {
      const id = 'import-123';
      const organizationId = 'org-123';

      mockImportJobRepository.findOne.mockResolvedValue(null);

      const result = await service.getImportJob(id, organizationId);

      expect(result).toBeNull();
    });
  });

  describe('generateImportPreview', () => {
    it('should generate preview with detected field mapping', async () => {
      const fileUrl = 'https://example.com/candidates.csv';
      const type = ImportType.CANDIDATES;

      // Mock parseFile to return sample data
      const mockData = [
        { Email: 'john@example.com', 'First Name': 'John', 'Last Name': 'Doe' },
        {
          Email: 'jane@example.com',
          'First Name': 'Jane',
          'Last Name': 'Smith',
        },
      ];

      const mockDetectedMapping = {
        Email: 'email',
        'First Name': 'firstName',
        'Last Name': 'lastName',
      };

      const mockTransformedPreview = [
        { email: 'john@example.com', firstName: 'John', lastName: 'Doe' },
        { email: 'jane@example.com', firstName: 'Jane', lastName: 'Smith' },
      ];

      // Mock private method parseFile
      jest.spyOn(service as any, 'parseFile').mockResolvedValue(mockData);
      mockMappingService.detectFieldMapping.mockReturnValue(
        mockDetectedMapping,
      );
      mockMappingService.transformRecord
        .mockReturnValueOnce(mockTransformedPreview[0])
        .mockReturnValueOnce(mockTransformedPreview[1]);

      const result = await service.generateImportPreview(fileUrl, type);

      expect(result).toEqual({
        headers: ['Email', 'First Name', 'Last Name'],
        preview: mockTransformedPreview,
        detectedMapping: mockDetectedMapping,
        totalRecords: 2,
      });
    });

    it('should throw error for empty file', async () => {
      const fileUrl = 'https://example.com/empty.csv';
      const type = ImportType.CANDIDATES;

      jest.spyOn(service as any, 'parseFile').mockResolvedValue([]);

      await expect(
        service.generateImportPreview(fileUrl, type),
      ).rejects.toThrow('File is empty or could not be parsed');
    });
  });

  describe('bulkImportCandidates', () => {
    it('should successfully import candidates', async () => {
      const bulkImportDto = {
        candidates: [
          {
            email: 'john@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890',
            skills: ['JavaScript', 'React'],
            experience: 5,
          },
          {
            email: 'jane@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            skills: ['Python', 'Django'],
            experience: 3,
          },
        ],
        source: 'bulk_import',
      };

      const organizationId = 'org-123';

      mockCandidateRepository.findOne.mockResolvedValue(null); // No existing candidates
      mockCandidateRepository.create.mockImplementation((data) => data);
      mockCandidateRepository.save.mockImplementation((data) => ({
        ...data,
        id: 'candidate-' + Math.random(),
      }));

      const result = await service.bulkImportCandidates(
        bulkImportDto,
        organizationId,
      );

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockCandidateRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle duplicate candidates', async () => {
      const bulkImportDto = {
        candidates: [
          {
            email: 'existing@example.com',
            firstName: 'Existing',
            lastName: 'User',
          },
        ],
      };

      const organizationId = 'org-123';

      mockCandidateRepository.findOne.mockResolvedValue({
        id: 'existing-candidate',
        email: 'existing@example.com',
      });

      const result = await service.bulkImportCandidates(
        bulkImportDto,
        organizationId,
      );

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('already exists');
    });
  });

  describe('cancelImportJob', () => {
    it('should cancel import job', async () => {
      const id = 'import-123';
      const organizationId = 'org-123';

      mockImportJobRepository.update.mockResolvedValue({ affected: 1 });

      await service.cancelImportJob(id, organizationId);

      expect(mockImportJobRepository.update).toHaveBeenCalledWith(
        { id, organizationId },
        { status: ImportStatus.CANCELLED },
      );
    });
  });

  describe('deleteImportJob', () => {
    it('should delete import job', async () => {
      const id = 'import-123';
      const organizationId = 'org-123';

      mockImportJobRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteImportJob(id, organizationId);

      expect(mockImportJobRepository.delete).toHaveBeenCalledWith({
        id,
        organizationId,
      });
    });
  });
});
