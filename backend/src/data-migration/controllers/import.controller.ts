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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TenantAware } from '../../common/decorators/tenant.decorator';
import { ImportService } from '../services/import.service';
import { MappingService } from '../services/mapping.service';
import { ValidationService } from '../services/validation.service';
import {
  CreateImportDto,
  ImportPreviewDto,
  FieldMappingDto,
  BulkCandidateImportDto,
} from '../dto/create-import.dto';
import { ImportType } from '../../entities/import-job.entity';

@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
@TenantAware()
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly mappingService: MappingService,
    private readonly validationService: ValidationService,
  ) {}

  @Post('jobs')
  @Roles('admin', 'recruiter')
  async createImportJob(
    @Body() createImportDto: CreateImportDto,
    @Request() req: any,
  ) {
    try {
      const importJob = await this.importService.createImportJob(
        createImportDto,
        req.user.organizationId,
        req.user.id,
      );

      // Start processing the import job asynchronously
      this.importService.processImportJob(importJob.id).catch((error) => {
        console.error('Import job processing failed:', error);
      });

      return {
        success: true,
        data: importJob,
        message: 'Import job created successfully',
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

  @Get('jobs')
  @Roles('admin', 'recruiter')
  async getImportJobs(@Request() req: any) {
    try {
      const importJobs = await this.importService.getImportJobs(
        req.user.organizationId,
      );

      return {
        success: true,
        data: importJobs,
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

  @Get('jobs/:id')
  @Roles('admin', 'recruiter')
  async getImportJob(@Param('id') id: string, @Request() req: any) {
    try {
      const importJob = await this.importService.getImportJob(
        id,
        req.user.organizationId,
      );

      if (!importJob) {
        throw new HttpException(
          {
            success: false,
            message: 'Import job not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: importJob,
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

  @Post('preview')
  @Roles('admin', 'recruiter')
  async generateImportPreview(@Body() previewDto: ImportPreviewDto) {
    try {
      const preview = await this.importService.generateImportPreview(
        previewDto.fileUrl,
        previewDto.type,
        previewDto.fieldMapping,
      );

      return {
        success: true,
        data: preview,
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

  @Post('upload')
  @Roles('admin', 'recruiter')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: ImportType,
    @Request() req: any,
  ) {
    try {
      if (!file) {
        throw new HttpException(
          {
            success: false,
            message: 'No file uploaded',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate file type
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        throw new HttpException(
          {
            success: false,
            message:
              'Invalid file type. Please upload CSV or Excel files only.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Upload file to storage service
      const fileUrl = await this.uploadFileToStorage(file);

      // Generate preview
      const preview = await this.importService.generateImportPreview(
        fileUrl,
        type,
      );

      return {
        success: true,
        data: {
          fileUrl,
          filename: file.originalname,
          size: file.size,
          ...preview,
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

  @Post('candidates/bulk')
  @Roles('admin', 'recruiter')
  async bulkImportCandidates(
    @Body() bulkImportDto: BulkCandidateImportDto,
    @Request() req: any,
  ) {
    try {
      const result = await this.importService.bulkImportCandidates(
        bulkImportDto,
        req.user.organizationId,
      );

      return {
        success: true,
        data: result,
        message: `Import completed. ${result.successful} successful, ${result.failed} failed.`,
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

  @Put('jobs/:id/cancel')
  @Roles('admin', 'recruiter')
  async cancelImportJob(@Param('id') id: string, @Request() req: any) {
    try {
      await this.importService.cancelImportJob(id, req.user.organizationId);

      return {
        success: true,
        message: 'Import job cancelled successfully',
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

  @Delete('jobs/:id')
  @Roles('admin', 'recruiter')
  async deleteImportJob(@Param('id') id: string, @Request() req: any) {
    try {
      await this.importService.deleteImportJob(id, req.user.organizationId);

      return {
        success: true,
        message: 'Import job deleted successfully',
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

  // Field Mapping endpoints
  @Post('field-mappings')
  @Roles('admin', 'recruiter')
  async createFieldMapping(
    @Body() fieldMappingDto: FieldMappingDto,
    @Request() req: any,
  ) {
    try {
      const fieldMapping = await this.mappingService.createFieldMapping(
        fieldMappingDto.name,
        fieldMappingDto.type,
        fieldMappingDto.mapping,
        fieldMappingDto.transformations,
        req.user.organizationId,
        req.user.id,
        fieldMappingDto.isDefault,
      );

      return {
        success: true,
        data: fieldMapping,
        message: 'Field mapping created successfully',
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

  @Get('field-mappings')
  @Roles('admin', 'recruiter')
  async getFieldMappings(@Query('type') type: ImportType, @Request() req: any) {
    try {
      const fieldMappings = await this.mappingService.getFieldMappings(
        req.user.organizationId,
        type,
      );

      return {
        success: true,
        data: fieldMappings,
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

  @Get('field-mappings/defaults/:type')
  @Roles('admin', 'recruiter')
  getDefaultFieldMapping(@Param('type') type: ImportType, @Request() req: any) {
    try {
      let defaultMapping;

      switch (type) {
        case ImportType.CANDIDATES:
          defaultMapping = this.mappingService.getDefaultCandidateMapping();
          break;
        case ImportType.JOBS:
          defaultMapping = this.mappingService.getDefaultJobMapping();
          break;
        case ImportType.APPLICATIONS:
          defaultMapping = this.mappingService.getDefaultApplicationMapping();
          break;
        case ImportType.COMPANIES:
          defaultMapping = this.mappingService.getDefaultCompanyMapping();
          break;
        default:
          defaultMapping = {};
      }

      return {
        success: true,
        data: defaultMapping,
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

  @Put('field-mappings/:id')
  @Roles('admin', 'recruiter')
  async updateFieldMapping(
    @Param('id') id: string,
    @Body() updates: Partial<FieldMappingDto>,
    @Request() req: any,
  ) {
    try {
      const fieldMapping = await this.mappingService.updateFieldMapping(
        id,
        req.user.organizationId,
        updates,
      );

      return {
        success: true,
        data: fieldMapping,
        message: 'Field mapping updated successfully',
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

  @Delete('field-mappings/:id')
  @Roles('admin', 'recruiter')
  async deleteFieldMapping(@Param('id') id: string, @Request() req: any) {
    try {
      await this.mappingService.deleteFieldMapping(id, req.user.organizationId);

      return {
        success: true,
        message: 'Field mapping deleted successfully',
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
