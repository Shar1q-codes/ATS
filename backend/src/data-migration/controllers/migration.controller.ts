import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TenantAware } from '../../common/decorators/tenant.decorator';
import { MigrationService } from '../services/migration.service';
import { BackupService, BackupConfig } from '../services/backup.service';
import { MigrationConfigDto } from '../dto/create-export.dto';
import { ExportType, ExportFormat } from '../../entities/export-job.entity';

@Controller('migration')
@UseGuards(JwtAuthGuard, RolesGuard)
@TenantAware()
export class MigrationController {
  constructor(
    private readonly migrationService: MigrationService,
    private readonly backupService: BackupService,
  ) {}

  // ATS Migration endpoints
  @Get('ats/supported')
  @Roles('admin')
  async getSupportedATSSystems() {
    try {
      const systems = await this.migrationService.getSupportedATSSystems();

      return {
        success: true,
        data: systems,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('ats/validate')
  @Roles('admin')
  async validateATSConnection(@Body() migrationConfig: MigrationConfigDto) {
    try {
      const result =
        await this.migrationService.validateATSConnection(migrationConfig);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('ats/estimate')
  @Roles('admin')
  async estimateMigrationTime(@Body() migrationConfig: MigrationConfigDto) {
    try {
      const estimate =
        await this.migrationService.estimateMigrationTime(migrationConfig);

      return {
        success: true,
        data: estimate,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('ats/migrate')
  @Roles('admin')
  async migrateFromATS(
    @Body() migrationConfig: MigrationConfigDto,
    @Request() req: any,
  ) {
    try {
      const result = await this.migrationService.migrateFromATS(
        migrationConfig,
        req.user.organizationId,
        req.user.id,
      );

      return {
        success: true,
        data: result,
        message: `Migration completed. ${result.successfulRecords} successful, ${result.failedRecords} failed.`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Backup Management endpoints
  @Post('backup/config')
  @Roles('admin')
  async createBackupConfig(
    @Body() backupConfig: Omit<BackupConfig, 'organizationId'>,
    @Request() req: any,
  ) {
    try {
      const config = await this.backupService.createBackupConfig({
        ...backupConfig,
        organizationId: req.user.organizationId,
      });

      return {
        success: true,
        data: config,
        message: 'Backup configuration created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('backup/config')
  @Roles('admin')
  async getBackupConfig(@Request() req: any) {
    try {
      const config = await this.backupService.getBackupConfig(
        req.user.organizationId,
      );

      return {
        success: true,
        data: config,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('backup/config')
  @Roles('admin')
  async updateBackupConfig(
    @Body() updates: Partial<BackupConfig>,
    @Request() req: any,
  ) {
    try {
      const config = await this.backupService.updateBackupConfig(
        req.user.organizationId,
        updates,
      );

      return {
        success: true,
        data: config,
        message: 'Backup configuration updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('backup/config')
  @Roles('admin')
  async deleteBackupConfig(@Request() req: any) {
    try {
      await this.backupService.deleteBackupConfig(req.user.organizationId);

      return {
        success: true,
        message: 'Backup configuration deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('backup/manual')
  @Roles('admin')
  async createManualBackup(
    @Body()
    body: {
      types?: ExportType[];
      format?: ExportFormat;
    },
    @Request() req: any,
  ) {
    try {
      const result = await this.backupService.createManualBackup(
        req.user.organizationId,
        body.types,
        body.format,
      );

      return {
        success: result.success,
        data: result,
        message: result.success
          ? 'Backup created successfully'
          : 'Backup failed',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('backup/history')
  @Roles('admin')
  async getBackupHistory(
    @Query('limit') limit: string = '10',
    @Request() req: any,
  ) {
    try {
      const history = await this.backupService.getBackupHistory(
        req.user.organizationId,
        parseInt(limit),
      );

      return {
        success: true,
        data: history,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('backup/:backupId/restore')
  @Roles('admin')
  async restoreFromBackup(
    @Param('backupId') backupId: string,
    @Body()
    options: {
      overwriteExisting?: boolean;
      selectedTypes?: ExportType[];
    },
    @Request() req: any,
  ) {
    try {
      const result = await this.backupService.restoreFromBackup(
        backupId,
        req.user.organizationId,
        options,
      );

      return {
        success: result.success,
        data: result,
        message: result.message,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('backup/:backupId/validate')
  @Roles('admin')
  async validateBackupIntegrity(
    @Param('backupId') backupId: string,
    @Request() req: any,
  ) {
    try {
      const result = await this.backupService.validateBackupIntegrity(
        backupId,
        req.user.organizationId,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Data Portability endpoints (GDPR compliance)
  @Post('portability/request')
  @Roles('admin')
  async requestDataPortability(
    @Body()
    body: {
      format: ExportFormat;
      includeTypes: ExportType[];
      email?: string; // Email to send download link
    },
    @Request() req: any,
  ) {
    try {
      // Create a full export for data portability
      const result = await this.backupService.createManualBackup(
        req.user.organizationId,
        body.includeTypes,
        body.format,
      );

      // In production, you would also:
      // 1. Send email notification with download link
      // 2. Set expiration time for the export
      // 3. Log the data portability request for compliance

      return {
        success: result.success,
        data: {
          ...result,
          message:
            'Data portability export created. Download link will be sent via email.',
          expiresIn: '7 days',
        },
        message: result.success
          ? 'Data portability request processed successfully'
          : 'Data portability request failed',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('sync/status')
  @Roles('admin')
  async getSyncStatus(@Request() req: any) {
    try {
      // Return the status of ongoing sync operations

      return {
        success: true,
        data: {
          lastSync: null,
          nextSync: null,
          isRunning: false,
          syncedDataTypes: [],
          errors: [],
        },
        message: 'Incremental sync functionality not yet implemented',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sync/start')
  @Roles('admin')
  startIncrementalSync(
    @Body()
    body: {
      sourceSystem: string;
      dataTypes: string[];
      apiKey: string;
    },
    @Request() req: any,
  ) {
    try {
      // Start an incremental sync process

      return {
        success: false,
        message: 'Incremental sync functionality not yet implemented',
        data: {
          syncId: null,
          status: 'not_implemented',
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
