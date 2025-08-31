import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportService } from '../services/export.service';
import {
  ExportJob,
  ExportStatus,
  ExportType,
  ExportFormat,
} from '../../entities/export-job.entity';
import { Candidate } from '../../entities/candidate.entity';
import { JobFamily } from '../../entities/job-family.entity';
import { Application } from '../../entities/application.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';

describe('ExportService', () => {
  let service: ExportService;
  let exportJobRepository: Repository<ExportJob>;
  let candidateRepository: Repository<Candidate>;

  const mockExportJobRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockCandidateRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: getRepositoryToken(ExportJob),
          useValue: mockExportJobRepository,
        },
        {
          provide: getRepositoryToken(Candidate),
          useValue: mockCandidateRepository,
        },
        {
          provide: getRepositoryToken(JobFamily),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(Application),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(CompanyProfile),
          useValue: { createQueryBuilder: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    exportJobRepository = module.get<Repository<ExportJob>>(
      getRepositoryToken(ExportJob),
    );
    candidateRepository = module.get<Repository<Candidate>>(
      getRepositoryToken(Candidate),
    );

    mockCandidateRepository.createQueryBuilder.mockReturnValue(
      mockQueryBuilder,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createExportJob', () => {
    it('should create an export job successfully', async () => {
      const createExportDto = {
        name: 'Candidates Export',
        type: ExportType.CANDIDATES,
        format: ExportFormat.CSV,
        filters: { dateFrom: '2024-01-01' },
        selectedFields: ['email', 'firstName', 'lastName'],
      };

      const organizationId = 'org-123';
      const createdBy = 'user-123';

      const mockExportJob = {
        id: 'export-123',
        ...createExportDto,
        organizationId,
        createdBy,
        status: ExportStatus.PENDING,
        expiresAt: expect.any(Date),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockExportJobRepository.create.mockReturnValue(mockExportJob);
      mockExportJobRepository.save.mockResolvedValue(mockExportJob);

      const result = await service.createExportJob(
        createExportDto,
        organizationId,
        createdBy,
      );

      expect(mockExportJobRepository.create).toHaveBeenCalledWith({
        ...createExportDto,
        organizationId,
        createdBy,
        status: ExportStatus.PENDING,
        expiresAt: expect.any(Date),
      });
      expect(mockExportJobRepository.save).toHaveBeenCalledWith(mockExportJob);
      expect(result).toEqual(mockExportJob);
    });
  });

  describe('getExportJobs', () => {
    it('should return export jobs for organization', async () => {
      const organizationId = 'org-123';
      const mockExportJobs = [
        {
          id: 'export-1',
          name: 'Candidates Export 1',
          status: ExportStatus.COMPLETED,
          organizationId,
        },
        {
          id: 'export-2',
          name: 'Jobs Export 1',
          status: ExportStatus.PENDING,
          organizationId,
        },
      ];

      mockExportJobRepository.find.mockResolvedValue(mockExportJobs);

      const result = await service.getExportJobs(organizationId);

      expect(mockExportJobRepository.find).toHaveBeenCalledWith({
        where: { organizationId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockExportJobs);
    });
  });

  describe('exportCandidatesImmediate', () => {
    it('should export candidates as CSV', async () => {
      const organizationId = 'org-123';
      const format = ExportFormat.CSV;
      const filters = { dateFrom: '2024-01-01' };

      const mockCandidates = [
        {
          id: 'candidate-1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          location: 'New York',
          totalExperience: 5,
          parsedData: {
            skills: [{ name: 'JavaScript' }, { name: 'React' }],
          },
          applications: [],
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: 'candidate-2',
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+1234567891',
          location: 'San Francisco',
          totalExperience: 3,
          parsedData: {
            skills: [{ name: 'Python' }, { name: 'Django' }],
          },
          applications: [],
          createdAt: new Date('2024-01-16'),
          updatedAt: new Date('2024-01-16'),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockCandidates);

      const result = await service.exportCandidatesImmediate(
        organizationId,
        format,
        filters,
      );

      expect(result).toBeInstanceOf(Buffer);

      // Convert buffer to string and check CSV content
      const csvContent = result.toString('utf-8');
      expect(csvContent).toContain('id,email,firstName,lastName');
      expect(csvContent).toContain('john@example.com');
      expect(csvContent).toContain('jane@example.com');
    });

    it('should export candidates as JSON', async () => {
      const organizationId = 'org-123';
      const format = ExportFormat.JSON;

      const mockCandidates = [
        {
          id: 'candidate-1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          parsedData: null,
          applications: [],
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockCandidates);

      const result = await service.exportCandidatesImmediate(
        organizationId,
        format,
      );

      expect(result).toBeInstanceOf(Buffer);

      // Convert buffer to string and parse JSON
      const jsonContent = JSON.parse(result.toString('utf-8'));
      expect(jsonContent).toHaveLength(1);
      expect(jsonContent[0].email).toBe('john@example.com');
    });
  });

  describe('exportFullBackup', () => {
    it('should export complete organization data', async () => {
      const organizationId = 'org-123';

      // Mock all repository queries
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.exportFullBackup(organizationId);

      expect(result).toHaveProperty('candidates');
      expect(result).toHaveProperty('jobs');
      expect(result).toHaveProperty('applications');
      expect(result).toHaveProperty('companies');
      expect(Array.isArray(result.candidates)).toBe(true);
      expect(Array.isArray(result.jobs)).toBe(true);
      expect(Array.isArray(result.applications)).toBe(true);
      expect(Array.isArray(result.companies)).toBe(true);
    });
  });

  describe('generateFile', () => {
    it('should generate CSV file correctly', async () => {
      const data = [
        { name: 'John', email: 'john@example.com', age: 30 },
        { name: 'Jane', email: 'jane@example.com', age: 25 },
      ];

      const result = await (service as any).generateFile(
        data,
        ExportFormat.CSV,
      );

      expect(result).toBeInstanceOf(Buffer);

      const csvContent = result.toString('utf-8');
      const lines = csvContent.split('\n');

      expect(lines[0]).toBe('name,email,age');
      expect(lines[1]).toBe('John,john@example.com,30');
      expect(lines[2]).toBe('Jane,jane@example.com,25');
    });

    it('should generate JSON file correctly', async () => {
      const data = [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' },
      ];

      const result = await (service as any).generateFile(
        data,
        ExportFormat.JSON,
      );

      expect(result).toBeInstanceOf(Buffer);

      const jsonContent = JSON.parse(result.toString('utf-8'));
      expect(jsonContent).toHaveLength(2);
      expect(jsonContent[0].name).toBe('John');
      expect(jsonContent[1].name).toBe('Jane');
    });

    it('should generate XML file correctly', async () => {
      const data = [{ name: 'John', email: 'john@example.com' }];

      const result = await (service as any).generateFile(
        data,
        ExportFormat.XML,
      );

      expect(result).toBeInstanceOf(Buffer);

      const xmlContent = result.toString('utf-8');
      expect(xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlContent).toContain('<export>');
      expect(xmlContent).toContain('<record>');
      expect(xmlContent).toContain('<name>John</name>');
      expect(xmlContent).toContain('<email>john@example.com</email>');
    });

    it('should filter fields when selectedFields is provided', async () => {
      const data = [
        { name: 'John', email: 'john@example.com', age: 30, phone: '123456' },
      ];
      const selectedFields = ['name', 'email'];

      const result = await (service as any).generateFile(
        data,
        ExportFormat.JSON,
        selectedFields,
      );

      const jsonContent = JSON.parse(result.toString('utf-8'));
      expect(jsonContent[0]).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
      expect(jsonContent[0]).not.toHaveProperty('age');
      expect(jsonContent[0]).not.toHaveProperty('phone');
    });
  });

  describe('cancelExportJob', () => {
    it('should cancel export job', async () => {
      const id = 'export-123';
      const organizationId = 'org-123';

      mockExportJobRepository.update.mockResolvedValue({ affected: 1 });

      await service.cancelExportJob(id, organizationId);

      expect(mockExportJobRepository.update).toHaveBeenCalledWith(
        { id, organizationId },
        { status: ExportStatus.CANCELLED },
      );
    });
  });

  describe('deleteExportJob', () => {
    it('should delete export job', async () => {
      const id = 'export-123';
      const organizationId = 'org-123';

      mockExportJobRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteExportJob(id, organizationId);

      expect(mockExportJobRepository.delete).toHaveBeenCalledWith({
        id,
        organizationId,
      });
    });
  });

  describe('cleanupExpiredExports', () => {
    it('should cleanup expired export jobs', async () => {
      const expiredExports = [
        { id: 'export-1', status: ExportStatus.COMPLETED },
        { id: 'export-2', status: ExportStatus.COMPLETED },
      ];

      mockExportJobRepository.find.mockResolvedValue(expiredExports);
      mockExportJobRepository.delete.mockResolvedValue({ affected: 1 });

      await service.cleanupExpiredExports();

      expect(mockExportJobRepository.find).toHaveBeenCalledWith({
        where: {
          expiresAt: expect.any(Date),
          status: ExportStatus.COMPLETED,
        },
      });
      expect(mockExportJobRepository.delete).toHaveBeenCalledTimes(2);
    });
  });
});
