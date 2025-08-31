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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ResumeUploadService } from '../services/resume-upload.service';
import {
  UploadResumeDto,
  UploadResumeResponseDto,
  ProcessingStatusDto,
} from '../dto/upload-resume.dto';

@ApiTags('Resume Upload')
@Controller('resume-upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ResumeUploadController {
  constructor(private readonly resumeUploadService: ResumeUploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload resume file for parsing' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Resume uploaded successfully and queued for processing',
    type: UploadResumeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or missing required data',
  })
  @Roles('admin', 'recruiter', 'hiring_manager')
  async uploadResume(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadData: UploadResumeDto,
  ): Promise<UploadResumeResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.resumeUploadService.uploadResume(file, uploadData);
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Get resume processing status' })
  @ApiResponse({
    status: 200,
    description: 'Processing status retrieved successfully',
    type: ProcessingStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @Roles('admin', 'recruiter', 'hiring_manager')
  async getProcessingStatus(
    @Param('jobId') jobId: string,
  ): Promise<ProcessingStatusDto> {
    return this.resumeUploadService.getProcessingStatus(jobId);
  }

  @Post('retry/:jobId')
  @ApiOperation({ summary: 'Retry failed resume processing' })
  @ApiResponse({
    status: 200,
    description: 'Processing retry initiated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @Roles('admin', 'recruiter')
  async retryProcessing(
    @Param('jobId') jobId: string,
  ): Promise<{ message: string }> {
    await this.resumeUploadService.retryProcessing(jobId);
    return { message: 'Processing retry initiated' };
  }
}
