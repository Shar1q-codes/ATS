import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MigrationService } from '../services/migration.service';
import { ImportService } from '../services/import.service';
import { ValidationService } from '../services/validation.service';
import { MappingService } from '../services/mapping.service';
import { ImportJob, ImportType } from '../../entities/import-job.entity';
import { MigrationConfigDto } from '../dto/create-export.dto';

describe('MigrationService', () => {
  let service: MigrationService;
  let importService: ImportService;
  let validationService: ValidationService;
  let mappingService: MappingService;

  const mockImportJobRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockImportService = {
    createImportJob: jest.fn(),
    processImportJob: jest.fn(),
    getImportJob: jest.fn(),
  };

  const mockValidationService = {
    validateCandidateData: jest.fn(),
    validateJobData: jest.fn(),
    validateApplicationData: jest.fn(),
  };

  const mockMappingService = {
    transformRecord: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationService,
        {
          provide: getRepositoryToken(ImportJob),
          useValue: mockImportJobRepository,
        },
        {
          provide: ImportService,
          useValue: mockImportService,
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

    service = module.get<MigrationService>(MigrationService);
    importService = module.get<ImportService>(ImportService);
    validationService = module.get<ValidationService>(ValidationService);
    mappingService = module.get<MappingService>(MappingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSupportedATSSystems', () => {
    it('should return list of supported ATS systems', async () => {
      const systems = await service.getSupportedATSSystems();

      expect(Array.isArray(systems)).toBe(true);
      expect(systems.length).toBeGreaterThan(0);

      const greenhouse = systems.find((s) => s.name === 'Greenhouse');
      expect(greenhouse).toBeDefined();
      expect(greenhouse.supportedDataTypes).toContain(ImportType.CANDIDATES);
      expect(greenhouse.authMethod).toBe('basic_auth');
    });
  });

  describe('validateATSConnection', () => {
    it('should validate supported ATS system with API key', async () => {
      const migrationConfig: MigrationConfigDto = {
        sourceSystem: 'greenhouse',
        apiKey: 'test-api-key',
        dataTypes: ['candidates'],
      };

      const result = await service.validateATSConnection(migrationConfig);

      expect(result.isValid).toBe(true);
      expect(result.message).toContain('validated successfully');
      expect(result.supportedDataTypes).toContain(ImportType.CANDIDATES);
    });

    it('should reject unsupported ATS system', async () => {
      const migrationConfig: MigrationConfigDto = {
        sourceSystem: 'unsupported-ats',
        apiKey: 'test-api-key',
        dataTypes: ['candidates'],
      };

      const result = await service.validateATSConnection(migrationConfig);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Unsupported ATS system');
    });

    it('should reject missing API key', async () => {
      const migrationConfig: MigrationConfigDto = {
        sourceSystem: 'greenhouse',
        apiKey: '',
        dataTypes: ['candidates'],
      };

      const result = await service.validateATSConnection(migrationConfig);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('API key is required');
    });
  });

  describe('estimateMigrationTime', () => {
    it('should estimate migration time for candidates', async () => {
      const migrationConfig: MigrationConfigDto = {
        sourceSystem: 'greenhouse',
        apiKey: 'test-api-key',
        dataTypes: ['candidates'],
      };

      const estimate = await service.estimateMigrationTime(migrationConfig);

      expect(estimate.estimatedDuration).toBeGreaterThan(0);
      expect(estimate.estimatedRecords).toBeGreaterThan(0);
      expect(estimate.breakdown).toHaveProperty('candidates');
      expect(estimate.breakdown.candidates.records).toBeGreaterThan(0);
      expect(estimate.breakdown.candidates.duration).toBeGreaterThan(0);
    });

    it('should estimate migration time for multiple data types', async () => {
      const migrationConfig: MigrationConfigDto = {
        sourceSystem: 'lever',
        apiKey: 'test-api-key',
        dataTypes: ['candidates', 'jobs', 'applications'],
      };

      const estimate = await service.estimateMigrationTime(migrationConfig);

      expect(estimate.breakdown).toHaveProperty('candidates');
      expect(estimate.breakdown).toHaveProperty('jobs');
      expect(estimate.breakdown).toHaveProperty('applications');

      const totalEstimated = Object.values(estimate.breakdown).reduce(
        (sum, item) => sum + item.records,
        0,
      );
      expect(estimate.estimatedRecords).toBe(totalEstimated);
    });

    it('should throw error for unsupported ATS system', async () => {
      const migrationConfig: MigrationConfigDto = {
        sourceSystem: 'unsupported-ats',
        apiKey: 'test-api-key',
        dataTypes: ['candidates'],
      };

      await expect(
        service.estimateMigrationTime(migrationConfig),
      ).rejects.toThrow('Unsupported ATS system');
    });
  });

  describe('migrateFromATS', () => {
    it('should successfully migrate candidates from Greenhouse', async () => {
      const migrationConfig: MigrationConfigDto = {
        sourceSystem: 'greenhouse',
        apiKey: 'test-api-key',
        dataTypes: ['candidates'],
      };

      const organizationId = 'org-123';
      const createdBy = 'user-123';

      // Mock validation result
      mockValidationService.validateCandidateData.mockResolvedValue({
        isValid: true,
        errors: [],
        validRecords: [
          { email: 'john@example.com', firstName: 'John', lastName: 'Doe' },
          { email: 'jane@example.com', firstName: 'Jane', lastName: 'Smith' },
        ],
        invalidRecords: [],
      });

      // Mock import job creation and processing
      const mockImportJob = {
        id: 'import-123',
        successfulRecords: 2,
        failedRecords: 0,
      };

      mockImportService.createImportJob.mockResolvedValue(mockImportJob);
      mockImportService.processImportJob.mockResolvedValue(undefined);
      mockImportService.getImportJob.mockResolvedValue(mockImportJob);

      // Mock field mapping transformation
      mockMappingService.transformRecord.mockImplementation((record) => record);

      const result = await service.migrateFromATS(
        migrationConfig,
        organizationId,
        createdBy,
      );

      expect(result.totalRecords).toBe(2);
      expect(result.successfulRecords).toBe(2);
      expect(result.failedRecords).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.importJobs).toHaveLength(1);
      expect(result.importJobs[0]).toBe('import-123');
    });

    it('should handle unsupported data types', async () => {
      const migrationConfig: MigrationConfigDto = {
        sourceSystem: 'bamboohr',
        apiKey: 'test-api-key',
        dataTypes: ['jobs'], // BambooHR doesn't support jobs
      };

      const result = await service.migrateFromATS(
        migrationConfig,
        'org-123',
        'user-123',
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('unsupported_data_type');
      expect(result.errors[0].message).toContain(
        'does not support jobs migration',
      );
    });

    it('should handle validation errors', async () => {
      const migrationConfig: MigrationConfigDto = {
        sourceSystem: 'greenhouse',
        apiKey: 'test-api-key',
        dataTypes: ['candidates'],
      };

      // Mock validation result with errors
      mockValidationService.validateCandidateData.mockResolvedValue({
        isValid: false,
        errors: [
          {
            row: 1,
            message: 'Invalid email format',
            data: { email: 'invalid' },
          },
          { row: 2, message: 'Missing required field', data: {} },
        ],
        validRecords: [
          { email: 'valid@example.com', firstName: 'Valid', lastName: 'User' },
        ],
        invalidRecords: [{ email: 'invalid' }, {}],
      });

      const mockImportJob = {
        id: 'import-123',
        successfulRecords: 1,
        failedRecords: 0,
      };

      mockImportService.createImportJob.mockResolvedValue(mockImportJob);
      mockImportService.processImportJob.mockResolvedValue(undefined);
      mockImportService.getImportJob.mockResolvedValue(mockImportJob);
      mockMappingService.transformRecord.mockImplementation((record) => record);

      const result = await service.migrateFromATS(
        migrationConfig,
        'org-123',
        'user-123',
      );

      expect(result.totalRecords).toBe(3);
      expect(result.successfulRecords).toBe(1);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].type).toBe('validation_error');
      expect(result.errors[1].type).toBe('validation_error');
    });

    it('should handle migration errors gracefully', async () => {
      const migrationConfig: MigrationConfigDto = {
        sourceSystem: 'greenhouse',
        apiKey: 'test-api-key',
        dataTypes: ['candidates'],
      };

      // Mock validation to throw error
      mockValidationService.validateCandidateData.mockRejectedValue(
        new Error('Validation service error'),
      );

      const result = await service.migrateFromATS(
        migrationConfig,
        'org-123',
        'user-123',
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('migration_error');
      expect(result.errors[0].message).toContain(
        'Failed to migrate candidates',
      );
    });
  });

  describe('ATS-specific field mappings', () => {
    it('should have correct field mappings for Greenhouse', async () => {
      const systems = await service.getSupportedATSSystems();
      const greenhouse = systems.find((s) => s.name === 'Greenhouse');

      expect(greenhouse).toBeDefined();
      expect(greenhouse.supportedDataTypes).toContain(ImportType.CANDIDATES);
      expect(greenhouse.supportedDataTypes).toContain(ImportType.JOBS);
      expect(greenhouse.supportedDataTypes).toContain(ImportType.APPLICATIONS);
    });

    it('should have correct field mappings for Lever', async () => {
      const systems = await service.getSupportedATSSystems();
      const lever = systems.find((s) => s.name === 'Lever');

      expect(lever).toBeDefined();
      expect(lever.authMethod).toBe('api_key');
      expect(lever.supportedDataTypes).toContain(ImportType.CANDIDATES);
    });

    it('should have correct field mappings for Workday', async () => {
      const systems = await service.getSupportedATSSystems();
      const workday = systems.find((s) => s.name === 'Workday');

      expect(workday).toBeDefined();
      expect(workday.authMethod).toBe('oauth');
      expect(workday.supportedDataTypes).toContain(ImportType.CANDIDATES);
      expect(workday.supportedDataTypes).toContain(ImportType.JOBS);
    });

    it('should have correct field mappings for BambooHR', async () => {
      const systems = await service.getSupportedATSSystems();
      const bamboohr = systems.find((s) => s.name === 'BambooHR');

      expect(bamboohr).toBeDefined();
      expect(bamboohr.authMethod).toBe('api_key');
      expect(bamboohr.supportedDataTypes).toContain(ImportType.CANDIDATES);
      expect(bamboohr.supportedDataTypes).not.toContain(ImportType.JOBS);
    });
  });
});
