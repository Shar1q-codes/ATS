import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { JobTemplateService } from '../services/job-template.service';
import { CreateJobTemplateDto } from '../dto/create-job-template.dto';
import { UpdateJobTemplateDto } from '../dto/update-job-template.dto';
import { JobTemplateResponseDto } from '../dto/job-template-response.dto';

@Controller('job-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobTemplateController {
  constructor(private readonly jobTemplateService: JobTemplateService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createJobTemplateDto: CreateJobTemplateDto,
  ): Promise<JobTemplateResponseDto> {
    return this.jobTemplateService.create(createJobTemplateDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findAll(
    @Query('jobFamilyId') jobFamilyId?: string,
  ): Promise<JobTemplateResponseDto[]> {
    if (jobFamilyId) {
      return this.jobTemplateService.findByJobFamily(jobFamilyId);
    }
    return this.jobTemplateService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobTemplateResponseDto> {
    return this.jobTemplateService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateJobTemplateDto: UpdateJobTemplateDto,
  ): Promise<JobTemplateResponseDto> {
    return this.jobTemplateService.update(id, updateJobTemplateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.jobTemplateService.remove(id);
  }
}
