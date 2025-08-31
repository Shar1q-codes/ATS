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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { UserRole } from '../../entities/user.entity';
import { JobFamilyService } from '../services/job-family.service';
import { CreateJobFamilyDto } from '../dto/create-job-family.dto';
import { UpdateJobFamilyDto } from '../dto/update-job-family.dto';
import { JobFamilyResponseDto } from '../dto/job-family-response.dto';

@Controller('job-families')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobFamilyController {
  constructor(private readonly jobFamilyService: JobFamilyService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TenantId() tenantId: string,
    @Body() createJobFamilyDto: CreateJobFamilyDto,
  ): Promise<JobFamilyResponseDto> {
    return this.jobFamilyService.createJobFamily(tenantId, createJobFamilyDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findAll(@TenantId() tenantId: string): Promise<JobFamilyResponseDto[]> {
    return this.jobFamilyService.findAllJobFamilies(tenantId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobFamilyResponseDto> {
    return this.jobFamilyService.findOneJobFamily(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateJobFamilyDto: UpdateJobFamilyDto,
  ): Promise<JobFamilyResponseDto> {
    return this.jobFamilyService.updateJobFamily(
      tenantId,
      id,
      updateJobFamilyDto,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.jobFamilyService.removeJobFamily(tenantId, id);
  }
}
