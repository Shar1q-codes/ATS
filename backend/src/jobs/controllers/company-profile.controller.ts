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
import { CompanyProfileService } from '../services/company-profile.service';
import { CreateCompanyProfileDto } from '../dto/create-company-profile.dto';
import { UpdateCompanyProfileDto } from '../dto/update-company-profile.dto';
import { CompanyProfileResponseDto } from '../dto/company-profile-response.dto';

@Controller('company-profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyProfileController {
  constructor(private readonly companyProfileService: CompanyProfileService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCompanyProfileDto: CreateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    return this.companyProfileService.create(createCompanyProfileDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findAll(
    @Query('name') name?: string,
  ): Promise<CompanyProfileResponseDto[]> {
    if (name) {
      return this.companyProfileService.findByName(name);
    }
    return this.companyProfileService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CompanyProfileResponseDto> {
    return this.companyProfileService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCompanyProfileDto: UpdateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    return this.companyProfileService.update(id, updateCompanyProfileDto);
  }

  @Patch(':id/preferences')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async updatePreferences(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() preferences: any,
  ): Promise<CompanyProfileResponseDto> {
    return this.companyProfileService.updatePreferences(id, preferences);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.companyProfileService.remove(id);
  }
}
