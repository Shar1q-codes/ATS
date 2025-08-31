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
  Response,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TenantAware } from '../../common/decorators/tenant.decorator';
import { ExportService } from '../services/export.service';
import { CreateExportDto, ExportFiltersDto } from '../dto/create-export.dto';
import { ExportFormat, ExportType } from '../../entities/export-job.entity';

@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
@TenantAware()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('jobs')
  @Roles('admin', 'recruiter')
  async createExportJob(
    @Body() createExportDto: CreateExportDto,
    @Request() req: any,
  ) {
    try {
      const exportJob = await this.exportService.createExportJob(
        createExportDto,
        req.user.organizationId,
        req.user.id,
      );

      // Start processing the export job asynchronously
      this.exportService.processExportJob(exportJob.id).catch((error) => {
        console.error('Export job processing failed:', error);
      });

      return {
        success: true,
        data: exportJob,
        message: 'Export job created successfully',
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
  async getExportJobs(@Request() req: any) {
    try {
      const exportJobs = await this.exportService.getExportJobs(
        req.user.organizationId,
      );

      return {
        success: true,
        data: exportJobs,
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
  async getExportJob(@Param('id') id: string, @Request() req: any) {
    try {
      const exportJob = await this.exportService.getExportJob(
        id,
        req.user.organizationId,
      );

      if (!exportJob) {
        throw new HttpException(
          {
            success: false,
            message: 'Export job not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: exportJob,
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

  @Post('candidates/immediate')
  @Roles('admin', 'recruiter')
  async exportCandidatesImmediate(
    @Body()
    body: {
      format: ExportFormat;
      filters?: ExportFiltersDto;
      selectedFields?: string[];
    },
    @Request() req: any,
    @Response() res: ExpressResponse,
  ) {
    try {
      const fileBuffer = await this.exportService.exportCandidatesImmediate(
        req.user.organizationId,
        body.format,
        body.filters,
        body.selectedFields,
      );

      const filename = `candidates-export-${new Date().toISOString().split('T')[0]}.${body.format}`;

      res.set({
        'Content-Type': this.getContentType(body.format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length,
      });

      res.send(fileBuffer);
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

  @Post('jobs/immediate')
  @Roles('admin', 'recruiter')
  async exportJobsImmediate(
    @Body()
    body: {
      format: ExportFormat;
      filters?: ExportFiltersDto;
      selectedFields?: string[];
    },
    @Request() req: any,
    @Response() res: ExpressResponse,
  ) {
    try {
      const fileBuffer = await this.exportService.exportJobsImmediate(
        req.user.organizationId,
        body.format,
        body.filters,
        body.selectedFields,
      );

      const filename = `jobs-export-${new Date().toISOString().split('T')[0]}.${body.format}`;

      res.set({
        'Content-Type': this.getContentType(body.format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length,
      });

      res.send(fileBuffer);
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

  @Post('applications/immediate')
  @Roles('admin', 'recruiter')
  async exportApplicationsImmediate(
    @Body()
    body: {
      format: ExportFormat;
      filters?: ExportFiltersDto;
      selectedFields?: string[];
    },
    @Request() req: any,
    @Response() res: ExpressResponse,
  ) {
    try {
      const fileBuffer = await this.exportService.exportApplicationsImmediate(
        req.user.organizationId,
        body.format,
        body.filters,
        body.selectedFields,
      );

      const filename = `applications-export-${new Date().toISOString().split('T')[0]}.${body.format}`;

      res.set({
        'Content-Type': this.getContentType(body.format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length,
      });

      res.send(fileBuffer);
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

  @Post('backup/full')
  @Roles('admin')
  async exportFullBackup(
    @Request() req: any,
    @Response() res: ExpressResponse,
  ) {
    try {
      const backup = await this.exportService.exportFullBackup(
        req.user.organizationId,
      );

      const filename = `full-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileBuffer = Buffer.from(JSON.stringify(backup, null, 2), 'utf-8');

      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length,
      });

      res.send(fileBuffer);
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

  @Get('templates/:type')
  @Roles('admin', 'recruiter')
  getExportTemplate(
    @Param('type') type: ExportType,
    @Query('format') format: ExportFormat = ExportFormat.CSV,
    @Response() res: ExpressResponse,
  ) {
    try {
      let templateData: any[] = [];
      let filename = '';

      switch (type) {
        case ExportType.CANDIDATES:
          templateData = [
            {
              email: 'candidate@company.com',
              firstName: 'Sample',
              lastName: 'Candidate',
              phone: '+1234567890',
              location: 'New York, NY',
              linkedinUrl: 'https://linkedin.com/in/johndoe',
              source: 'linkedin',
              totalExperience: 5,
              skills: 'JavaScript, React, Node.js',
            },
          ];
          filename = `candidate-import-template.${format}`;
          break;

        case ExportType.JOBS:
          templateData = [
            {
              name: 'Senior Software Engineer',
              jobFamilyId: 'uuid-here',
              level: 'senior',
              description: 'We are looking for a senior software engineer...',
              minSalary: 80000,
              maxSalary: 120000,
              currency: 'USD',
              minExperience: 3,
              maxExperience: 8,
            },
          ];
          filename = `job-import-template.${format}`;
          break;

        case ExportType.APPLICATIONS:
          templateData = [
            {
              candidateId: 'candidate-uuid-here',
              companyJobVariantId: 'job-variant-uuid-here',
              status: 'applied',
              fitScore: 85,
              appliedAt: new Date().toISOString(),
            },
          ];
          filename = `application-import-template.${format}`;
          break;

        case ExportType.COMPANIES:
          templateData = [
            {
              name: 'Tech Corp',
              industry: 'Technology',
              size: 'medium',
              location: 'San Francisco, CA',
              workArrangement: 'hybrid',
              benefits: 'Health insurance, 401k, PTO',
              culture: 'Innovation, Collaboration, Growth',
            },
          ];
          filename = `company-import-template.${format}`;
          break;

        default:
          throw new Error(`Unsupported template type: ${type}`);
      }

      let fileBuffer: Buffer;

      if (format === ExportFormat.CSV) {
        const headers = Object.keys(templateData[0]);
        const csvRows = [headers.join(',')];

        for (const record of templateData) {
          const values = headers.map((header) => String(record[header] || ''));
          csvRows.push(values.join(','));
        }

        fileBuffer = Buffer.from(csvRows.join('\n'), 'utf-8');
      } else {
        fileBuffer = Buffer.from(
          JSON.stringify(templateData, null, 2),
          'utf-8',
        );
      }

      res.set({
        'Content-Type': this.getContentType(format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length,
      });

      res.send(fileBuffer);
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
  async cancelExportJob(@Param('id') id: string, @Request() req: any) {
    try {
      await this.exportService.cancelExportJob(id, req.user.organizationId);

      return {
        success: true,
        message: 'Export job cancelled successfully',
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
  async deleteExportJob(@Param('id') id: string, @Request() req: any) {
    try {
      await this.exportService.deleteExportJob(id, req.user.organizationId);

      return {
        success: true,
        message: 'Export job deleted successfully',
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

  private getContentType(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.CSV:
        return 'text/csv';
      case ExportFormat.EXCEL:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case ExportFormat.JSON:
        return 'application/json';
      case ExportFormat.XML:
        return 'application/xml';
      default:
        return 'application/octet-stream';
    }
  }
}
