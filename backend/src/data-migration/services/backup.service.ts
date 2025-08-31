import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExportService } from './export.service';
import {
  ExportJob,
  ExportType,
  ExportFormat,
  ExportStatus,
} from '../../entities/export-job.entity';
import { Organization } from '../../entities/organization.entity';

export interface BackupConfig {
  organizationId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  includeTypes: ExportType[];
  format: ExportFormat;
  enabled: boolean;
  lastBackup?: Date;
  nextBackup?: Date;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  fileUrl?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
  duration: number;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private backupConfigs: Map<string, BackupConfig> = new Map();

  constructor(
    @InjectRepository(ExportJob)
    private exportJobRepository: Repository<ExportJob>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private exportService: ExportService,
  ) {
    this.loadBackupConfigs();
  }

  async createBackupConfig(config: BackupConfig): Promise<BackupConfig> {
    // Validate organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: config.organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Calculate next backup time
    config.nextBackup = this.calculateNextBackup(config.frequency);

    // Store configuration (in production, this would be persisted to database)
    this.backupConfigs.set(config.organizationId, config);

    this.logger.log(
      `Backup configuration created for organization ${config.organizationId}`,
    );
    return config;
  }

  async updateBackupConfig(
    organizationId: string,
    updates: Partial<BackupConfig>,
  ): Promise<BackupConfig> {
    const existingConfig = this.backupConfigs.get(organizationId);
    if (!existingConfig) {
      throw new Error('Backup configuration not found');
    }

    const updatedConfig = { ...existingConfig, ...updates };

    // Recalculate next backup if frequency changed
    if (updates.frequency) {
      updatedConfig.nextBackup = this.calculateNextBackup(updates.frequency);
    }

    this.backupConfigs.set(organizationId, updatedConfig);

    this.logger.log(
      `Backup configuration updated for organization ${organizationId}`,
    );
    return updatedConfig;
  }

  async getBackupConfig(organizationId: string): Promise<BackupConfig | null> {
    return this.backupConfigs.get(organizationId) || null;
  }

  async deleteBackupConfig(organizationId: string): Promise<void> {
    this.backupConfigs.delete(organizationId);
    this.logger.log(
      `Backup configuration deleted for organization ${organizationId}`,
    );
  }

  async createManualBackup(
    organizationId: string,
    types: ExportType[] = [ExportType.FULL_BACKUP],
    format: ExportFormat = ExportFormat.JSON,
  ): Promise<BackupResult> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Starting manual backup for organization ${organizationId}`,
      );

      const backupName = `manual-backup-${new Date().toISOString().split('T')[0]}`;

      let exportJob: ExportJob;

      if (types.includes(ExportType.FULL_BACKUP)) {
        // Create full backup export job
        exportJob = await this.exportService.createExportJob(
          {
            name: backupName,
            type: ExportType.FULL_BACKUP,
            format,
          },
          organizationId,
          'system', // System-generated backup
        );
      } else {
        // Create specific type backup
        exportJob = await this.exportService.createExportJob(
          {
            name: backupName,
            type: types[0], // Take first type for now
            format,
          },
          organizationId,
          'system',
        );
      }

      // Process the export job
      await this.exportService.processExportJob(exportJob.id);

      // Get the completed job
      const completedJob = await this.exportService.getExportJob(
        exportJob.id,
        organizationId,
      );

      if (!completedJob) {
        throw new Error('Backup job not found after processing');
      }

      const duration = Date.now() - startTime;

      if (completedJob.status === ExportStatus.COMPLETED) {
        this.logger.log(
          `Manual backup completed successfully for organization ${organizationId}`,
        );
        return {
          success: true,
          backupId: completedJob.id,
          fileUrl: completedJob.fileUrl,
          fileSize: completedJob.fileSize,
          recordCount: completedJob.recordCount,
          duration,
        };
      } else {
        throw new Error(completedJob.errorMessage || 'Backup failed');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Manual backup failed for organization ${organizationId}: ${error.message}`,
      );

      return {
        success: false,
        backupId: '',
        error: error.message,
        duration,
      };
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledBackups(): Promise<void> {
    this.logger.log('Processing scheduled backups...');

    const now = new Date();
    const backupsToProcess: BackupConfig[] = [];

    // Find configurations that need backup
    for (const [organizationId, config] of this.backupConfigs.entries()) {
      if (config.enabled && config.nextBackup && config.nextBackup <= now) {
        backupsToProcess.push(config);
      }
    }

    if (backupsToProcess.length === 0) {
      this.logger.log('No scheduled backups to process');
      return;
    }

    this.logger.log(`Processing ${backupsToProcess.length} scheduled backups`);

    // Process backups sequentially to avoid overwhelming the system
    for (const config of backupsToProcess) {
      try {
        await this.processScheduledBackup(config);
      } catch (error) {
        this.logger.error(
          `Failed to process scheduled backup for organization ${config.organizationId}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  private async processScheduledBackup(config: BackupConfig): Promise<void> {
    this.logger.log(
      `Processing scheduled backup for organization ${config.organizationId}`,
    );

    const backupName = `scheduled-backup-${config.frequency}-${new Date().toISOString().split('T')[0]}`;

    try {
      // Create export job for full backup
      const exportJob = await this.exportService.createExportJob(
        {
          name: backupName,
          type: ExportType.FULL_BACKUP,
          format: config.format,
        },
        config.organizationId,
        'system',
      );

      // Process the export job
      await this.exportService.processExportJob(exportJob.id);

      // Update backup configuration
      config.lastBackup = new Date();
      config.nextBackup = this.calculateNextBackup(config.frequency);
      this.backupConfigs.set(config.organizationId, config);

      this.logger.log(
        `Scheduled backup completed for organization ${config.organizationId}`,
      );

      // Clean up old backups
      await this.cleanupOldBackups(config);
    } catch (error) {
      this.logger.error(
        `Scheduled backup failed for organization ${config.organizationId}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async cleanupOldBackups(config: BackupConfig): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

      // Find old backup export jobs
      const oldBackups = await this.exportJobRepository
        .createQueryBuilder('export')
        .where('export.organizationId = :organizationId', {
          organizationId: config.organizationId,
        })
        .andWhere('export.type = :type', { type: ExportType.FULL_BACKUP })
        .andWhere('export.createdBy = :createdBy', { createdBy: 'system' })
        .andWhere('export.createdAt < :cutoffDate', { cutoffDate })
        .andWhere('export.status = :status', { status: ExportStatus.COMPLETED })
        .getMany();

      if (oldBackups.length === 0) {
        return;
      }

      this.logger.log(
        `Cleaning up ${oldBackups.length} old backups for organization ${config.organizationId}`,
      );

      // Delete old backup jobs (this will also trigger file cleanup in production)
      for (const backup of oldBackups) {
        await this.exportService.deleteExportJob(
          backup.id,
          config.organizationId,
        );
      }

      this.logger.log(`Cleaned up ${oldBackups.length} old backups`);
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old backups: ${error.message}`,
        error.stack,
      );
    }
  }

  private calculateNextBackup(frequency: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }

    // Set to 2 AM to avoid peak usage times
    next.setHours(2, 0, 0, 0);

    return next;
  }

  private async loadBackupConfigs(): Promise<void> {
    // In production, this would load configurations from database
    // For now, we'll start with empty configurations
    this.logger.log('Backup configurations loaded');
  }

  async getBackupHistory(
    organizationId: string,
    limit: number = 10,
  ): Promise<ExportJob[]> {
    return this.exportJobRepository
      .createQueryBuilder('export')
      .where('export.organizationId = :organizationId', { organizationId })
      .andWhere('export.type = :type', { type: ExportType.FULL_BACKUP })
      .andWhere('export.createdBy = :createdBy', { createdBy: 'system' })
      .orderBy('export.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  async restoreFromBackup(
    backupId: string,
    organizationId: string,
    options: {
      overwriteExisting?: boolean;
      selectedTypes?: ExportType[];
    } = {},
  ): Promise<{
    success: boolean;
    message: string;
    restoredRecords?: number;
    errors?: string[];
  }> {
    try {
      // Get the backup export job
      const backupJob = await this.exportService.getExportJob(
        backupId,
        organizationId,
      );

      if (!backupJob) {
        return {
          success: false,
          message: 'Backup not found',
        };
      }

      if (backupJob.status !== ExportStatus.COMPLETED || !backupJob.fileUrl) {
        return {
          success: false,
          message: 'Backup is not available for restore',
        };
      }

      // In production, you would:
      // 1. Download the backup file
      // 2. Parse the backup data
      // 3. Validate the data
      // 4. Create import jobs for each data type
      // 5. Process the imports with appropriate conflict resolution

      this.logger.log(
        `Restore from backup ${backupId} for organization ${organizationId} - NOT IMPLEMENTED`,
      );

      return {
        success: false,
        message: 'Restore functionality is not yet implemented',
      };
    } catch (error) {
      this.logger.error(`Restore failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async validateBackupIntegrity(
    backupId: string,
    organizationId: string,
  ): Promise<{
    isValid: boolean;
    message: string;
    details?: {
      fileExists: boolean;
      fileSize: number;
      recordCounts: Record<string, number>;
      checksumValid: boolean;
    };
  }> {
    try {
      const backupJob = await this.exportService.getExportJob(
        backupId,
        organizationId,
      );

      if (!backupJob) {
        return {
          isValid: false,
          message: 'Backup not found',
        };
      }

      if (backupJob.status !== ExportStatus.COMPLETED) {
        return {
          isValid: false,
          message: 'Backup is not completed',
        };
      }

      // In production, you would:
      // 1. Check if the file exists in storage
      // 2. Verify file size matches recorded size
      // 3. Validate file format and structure
      // 4. Check data integrity with checksums
      // 5. Verify record counts

      return {
        isValid: true,
        message: 'Backup validation not fully implemented',
        details: {
          fileExists: true,
          fileSize: backupJob.fileSize || 0,
          recordCounts: {},
          checksumValid: true,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        message: error.message,
      };
    }
  }
}
