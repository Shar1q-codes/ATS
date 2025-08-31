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
import { CompanyJobVariantService } from '../services/company-job-variant.service';
import { CreateCompanyJobVariantDto } from '../dto/create-company-job-variant.dto';
import { UpdateCompanyJobVariantDto } from '../dto/update-company-job-variant.dto';
import { CompanyJobVariantResponseDto } from '../dto/company-job-variant-response.dto';
import { ResolvedJobSpecDto } from '../dto/resolved-job-spec.dto';

@Controller('company-job-variants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyJobVariantController {
  constructor(
    private readonly companyJobVariantService: CompanyJobVariantService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCompanyJobVariantDto: CreateCompanyJobVariantDto,
  ): Promise<CompanyJobVariantResponseDto> {
    return this.companyJobVariantService.create(createCompanyJobVariantDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findAll(
    @Query('companyProfileId') companyProfileId?: string,
    @Query('jobTemplateId') jobTemplateId?: string,
  ): Promise<CompanyJobVariantResponseDto[]> {
    if (companyProfileId) {
      return this.companyJobVariantService.findByCompany(companyProfileId);
    }
    if (jobTemplateId) {
      return this.companyJobVariantService.findByJobTemplate(jobTemplateId);
    }
    return this.companyJobVariantService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CompanyJobVariantResponseDto> {
    return this.companyJobVariantService.findOne(id);
  }

  @Get(':id/resolved-spec')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async getResolvedSpec(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResolvedJobSpecDto> {
    return this.companyJobVariantService.resolveJobSpec(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCompanyJobVariantDto: UpdateCompanyJobVariantDto,
  ): Promise<CompanyJobVariantResponseDto> {
    return this.companyJobVariantService.update(id, updateCompanyJobVariantDto);
  }

  @Patch(':id/publish')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CompanyJobVariantResponseDto> {
    return this.companyJobVariantService.publish(id);
  }

  @Patch(':id/unpublish')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async unpublish(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CompanyJobVariantResponseDto> {
    return this.companyJobVariantService.unpublish(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.companyJobVariantService.remove(id);
  }
}
