import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  ResumePipelineService,
  PipelineStatus,
} from '../services/resume-pipeline.service';
import {
  UploadResumeDto,
  UploadResumeResponseDto,
} from '../dto/upload-resume.dto';

@ApiTags('Resume Pipeline')
@Controller('resume-pipeline')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ResumePipelineController {
  constructor(private readonly resumePipelineService: ResumePipelineService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload resume and start complete processing pipeline',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Resume uploaded and pipeline started successfully',
    type: UploadResumeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or missing required data',
  })
  @Roles('admin', 'recruiter', 'hiring_manager')
  async uploadAndProcess(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadData: UploadResumeDto,
  ): Promise<UploadResumeResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.resumePipelineService.startPipeline(file, uploadData);
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Get detailed pipeline status with notifications' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline status retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pipeline not found',
  })
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getPipelineStatus(
    @Param('jobId') jobId: string,
  ): Promise<PipelineStatus> {
    const status = await this.resumePipelineService.getPipelineStatus(jobId);

    if (!status) {
      throw new BadRequestException('Pipeline not found');
    }

    return status;
  }

  @Post('retry/:jobId')
  @ApiOperation({ summary: 'Retry failed pipeline processing' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline retry initiated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pipeline not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Pipeline cannot be retried (max attempts reached)',
  })
  @Roles('admin', 'recruiter')
  async retryPipeline(
    @Param('jobId') jobId: string,
  ): Promise<{ message: string }> {
    await this.resumePipelineService.retryPipeline(jobId);
    return { message: 'Pipeline retry initiated successfully' };
  }

  @Get('monitor/all')
  @ApiOperation({ summary: 'Get all pipeline statuses for monitoring' })
  @ApiResponse({
    status: 200,
    description: 'All pipeline statuses retrieved successfully',
  })
  @Roles('admin')
  async getAllPipelineStatuses(): Promise<PipelineStatus[]> {
    return this.resumePipelineService.getAllPipelineStatuses();
  }

  @Get('monitor/statistics')
  @ApiOperation({ summary: 'Get pipeline processing statistics' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline statistics retrieved successfully',
  })
  @Roles('admin', 'recruiter')
  async getPipelineStatistics(): Promise<{
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    retrying: number;
  }> {
    return this.resumePipelineService.getPipelineStatistics();
  }

  @Get('monitor/candidate/:candidateId')
  @ApiOperation({ summary: 'Get pipeline status for specific candidate' })
  @ApiResponse({
    status: 200,
    description: 'Candidate pipeline statuses retrieved successfully',
  })
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getCandidatePipelineStatuses(
    @Param('candidateId') candidateId: string,
  ): Promise<PipelineStatus[]> {
    const allStatuses =
      await this.resumePipelineService.getAllPipelineStatuses();
    return allStatuses.filter((status) => status.candidateId === candidateId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check pipeline health and queue status' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline health status',
  })
  @Roles('admin')
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    queueHealth: any;
    statistics: any;
    timestamp: string;
  }> {
    try {
      const statistics =
        await this.resumePipelineService.getPipelineStatistics();

      // Simple health check based on failure rate
      const failureRate =
        statistics.total > 0 ? statistics.failed / statistics.total : 0;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (failureRate > 0.5) {
        status = 'unhealthy';
      } else if (failureRate > 0.2) {
        status = 'degraded';
      }

      return {
        status,
        queueHealth: {
          processing: statistics.processing,
          queued: statistics.queued,
          retrying: statistics.retrying,
        },
        statistics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        queueHealth: null,
        statistics: null,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
