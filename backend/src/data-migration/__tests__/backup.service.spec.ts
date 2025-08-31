import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackupService, BackupConfig } from '../services/backup.service';
import { ExportService } from '../services/export.service';
import {
  ExportJob,
  ExportType,
  ExportFormat,
  ExportStatus,
} from '../../entities/export-job.entity';
import { Organization } from '../../entities/organization.entity';

describe('BackupService', () => {
  let service: BackupService;
  let exportService: ExportService;
  let exportJobRepository: Repository<ExportJob>;
  let organizationRepository: Repository<Organization>;

  const mockExportJobRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockOrganizationRepository = {
    findOne: jest.fn(),
  };

  const mockExportService = {
    createExportJob: jest.fn(),
    processExportJob: jest.fn(),
    getExportJob: jest.fn(),
    deleteExportJob: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        {
          provide: getRepositoryToken(ExportJob),
          useValue: mockExportJobRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: ExportService,
          useValue: mockExportService,
        },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
    exportService = module.get<ExportService>(ExportService);
    exportJobRepository = module.get<Repository<ExportJob>>(
      getRepositoryToken(ExportJob),
    );
    organizationRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );

    mockExportJobRepository.createQueryBuilder.mockReturnValue(
      mockQueryBuilder,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBackupConfig', () => {
    it('should create backup configuration successfully', async () => {
      const config: BackupConfig = {
        organizationId: 'org-123',
        frequency: 'daily',
        retentionDays: 30,
        includeTypes: [ExportType.FULL_BACKUP],
        format: ExportFormat.JSON,
        enabled: true,
      };

      const mockOrganization = {
        id: 'org-123',
        name: 'Test Organization',
      };

      mockOrganizationRepository.findOne.mockResolvedValue(mockOrganization);

      const result = await service.createBackupConfig(config);

      expect(result.organizationId).toBe(config.organizationId);
      expect(result.frequency).toBe(config.frequency);
      expect(result.retentionDays).toBe(config.retentionDays);
      expect(result.nextBackup).toBeDefined();
      expect(result.nextBackup.getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw error for non-existent organization', async () => {
      const config: BackupConfig = {
        organizationId: 'non-existent-org',
        frequency: 'daily',
        retentionDays: 30,
        includeTypes: [ExportType.FULL_BACKUP],
        format: ExportFormat.JSON,
        enabled: true,
      };

      mockOrganizationRepository.findOne.mockResolvedValue(null);

      await expect(service.createBackupConfig(config)).rejects.toThrow(
        'Organization not found',
      );
    });
  });

  describe('updateBackupConfig', () => {
    it('should update existing backup configuration', async () => {
      const organizationId = 'org-123';
      const initialConfig: BackupConfig = {
        organizationId,
        frequency: 'daily',
        retentionDays: 30,
        includeTypes: [ExportType.FULL_BACKUP],
        format: ExportFormat.JSON,
        enabled: true,
        nextBackup: new Date(),
      };

      // First create the config
      const mockOrganization = { id: organizationId, name: 'Test Org' };
      mockOrganizationRepository.findOne.mockResolvedValue(mockOrganization);
      await service.createBackupConfig(initialConfig);

      // Then update it
      const updates = {
        frequency: 'weekly' as const,
        retentionDays: 60,
        enabled: false,
      };

      const result = await service.updateBackupConfig(organizationId, updates);

      expect(result.frequency).toBe('weekly');
      expect(result.retentionDays).toBe(60);
      expect(result.enabled).toBe(false);
      expect(result.nextBackup).toBeDefined();
    });

    it('should throw error for non-existent configuration', async () => {
      const organizationId = 'non-existent-org';
      const updates = { enabled: false };

      await expect(
        service.updateBackupConfig(organizationId, updates),
      ).rejects.toThrow('Backup configuration not found');
    });
  });

  describe('createManualBackup', () => {
    it('should create manual backup successfully', async () => {
      const organizationId = 'org-123';
      const types = [ExportType.FULL_BACKUP];
      const format = ExportFormat.JSON;

      const mockExportJob = {
        id: 'export-123',
        name: 'manual-backup-2024-01-01',
        type: ExportType.FULL_BACKUP,
        format: ExportFormat.JSON,
        status: ExportStatus.COMPLETED,
        fileUrl: 'https://storage.example.com/backup.json',
        fileSize: 1024000,
        recordCount: 1000,
      };

      mockExportService.createExportJob.mockResolvedValue(mockExportJob);
      mockExportService.processExportJob.mockResolvedValue(undefined);
      mockExportService.getExportJob.mockResolvedValue(mockExportJob);

      const result = await service.createManualBackup(
        organizationId,
        types,
        format,
      );

      expect(result.success).toBe(true);
      expect(result.backupId).toBe('export-123');
      expect(result.fileUrl).toBe('https://storage.example.com/backup.json');
      expect(result.fileSize).toBe(1024000);
      expect(result.recordCount).toBe(1000);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle backup failure', async () => {
      const organizationId = 'org-123';

      const mockExportJob = {
        id: 'export-123',
        status: ExportStatus.FAILED,
        errorMessage: 'Export failed due to database error',
      };

      mockExportService.createExportJob.mockResolvedValue(mockExportJob);
      mockExportService.processExportJob.mockResolvedValue(undefined);
      mockExportService.getExportJob.mockResolvedValue(mockExportJob);

      const result = await service.createManualBackup(organizationId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Export failed due to database error');
    });

    it('should handle export service errors', async () => {
      const organizationId = 'org-123';

      mockExportService.createExportJob.mockRejectedValue(
        new Error('Export service unavailable'),
      );

      const result = await service.createManualBackup(organizationId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Export service unavailable');
    });
  });

  describe('getBackupHistory', () => {
    it('should return backup history for organization', async () => {
      const organizationId = 'org-123';
      const limit = 5;

      const mockBackups = [
        {
          id: 'backup-1',
          name: 'scheduled-backup-daily-2024-01-01',
          type: ExportType.FULL_BACKUP,
          status: ExportStatus.COMPLETED,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'backup-2',
          name: 'manual-backup-2023-12-31',
          type: ExportType.FULL_BACKUP,
          status: ExportStatus.COMPLETED,
          createdAt: new Date('2023-12-31'),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockBackups);

      const result = await service.getBackupHistory(organizationId, limit);

      expect(result).toEqual(mockBackups);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'export.organizationId = :organizationId',
        { organizationId },
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(limit);
    });
  });

  describe('validateBackupIntegrity', () => {
    it('should validate completed backup', async () => {
      const backupId = 'backup-123';
      const organizationId = 'org-123';

      const mockBackup = {
        id: backupId,
        status: ExportStatus.COMPLETED,
        fileUrl: 'https://storage.example.com/backup.json',
        fileSize: 1024000,
      };

      mockExportService.getExportJob.mockResolvedValue(mockBackup);

      const result = await service.validateBackupIntegrity(
        backupId,
        organizationId,
      );

      expect(result.isValid).toBe(true);
      expect(result.details.fileExists).toBe(true);
      expect(result.details.fileSize).toBe(1024000);
    });

    it('should reject non-existent backup', async () => {
      const backupId = 'non-existent-backup';
      const organizationId = 'org-123';

      mockExportService.getExportJob.mockResolvedValue(null);

      const result = await service.validateBackupIntegrity(
        backupId,
        organizationId,
      );

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Backup not found');
    });

    it('should reject incomplete backup', async () => {
      const backupId = 'backup-123';
      const organizationId = 'org-123';

      const mockBackup = {
        id: backupId,
        status: ExportStatus.PROCESSING,
      };

      mockExportService.getExportJob.mockResolvedValue(mockBackup);

      const result = await service.validateBackupIntegrity(
        backupId,
        organizationId,
      );

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Backup is not completed');
    });
  });

  describe('restoreFromBackup', () => {
    it('should indicate restore functionality is not implemented', async () => {
      const backupId = 'backup-123';
      const organizationId = 'org-123';

      const mockBackup = {
        id: backupId,
        status: ExportStatus.COMPLETED,
        fileUrl: 'https://storage.example.com/backup.json',
      };

      mockExportService.getExportJob.mockResolvedValue(mockBackup);

      const result = await service.restoreFromBackup(backupId, organizationId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not yet implemented');
    });
  });

  describe('backup frequency calculations', () => {
    it('should calculate next daily backup correctly', async () => {
      const config: BackupConfig = {
        organizationId: 'org-123',
        frequency: 'daily',
        retentionDays: 30,
        includeTypes: [ExportType.FULL_BACKUP],
        format: ExportFormat.JSON,
        enabled: true,
      };

      mockOrganizationRepository.findOne.mockResolvedValue({ id: 'org-123' });

      const result = await service.createBackupConfig(config);

      expect(result.nextBackup).toBeDefined();

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0);

      expect(result.nextBackup.getTime()).toBeCloseTo(
        tomorrow.getTime(),
        -10000,
      ); // Within 10 seconds
    });

    it('should calculate next weekly backup correctly', async () => {
      const config: BackupConfig = {
        organizationId: 'org-123',
        frequency: 'weekly',
        retentionDays: 30,
        includeTypes: [ExportType.FULL_BACKUP],
        format: ExportFormat.JSON,
        enabled: true,
      };

      mockOrganizationRepository.findOne.mockResolvedValue({ id: 'org-123' });

      const result = await service.createBackupConfig(config);

      expect(result.nextBackup).toBeDefined();

      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(2, 0, 0, 0);

      expect(result.nextBackup.getTime()).toBeCloseTo(
        nextWeek.getTime(),
        -10000,
      );
    });

    it('should calculate next monthly backup correctly', async () => {
      const config: BackupConfig = {
        organizationId: 'org-123',
        frequency: 'monthly',
        retentionDays: 90,
        includeTypes: [ExportType.FULL_BACKUP],
        format: ExportFormat.JSON,
        enabled: true,
      };

      mockOrganizationRepository.findOne.mockResolvedValue({ id: 'org-123' });

      const result = await service.createBackupConfig(config);

      expect(result.nextBackup).toBeDefined();

      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setHours(2, 0, 0, 0);

      expect(result.nextBackup.getTime()).toBeCloseTo(
        nextMonth.getTime(),
        -10000,
      );
    });
  });
});
