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
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { JdVersionService } from '../services/jd-version.service';
import { CreateJdVersionDto } from '../dto/create-jd-version.dto';
import { UpdateJdVersionDto } from '../dto/update-jd-version.dto';
import { JdVersionResponseDto } from '../dto/jd-version-response.dto';

@Controller('jd-versions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JdVersionController {
  constructor(private readonly jdVersionService: JdVersionService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createJdVersionDto: CreateJdVersionDto,
    @Request() req: any,
  ): Promise<JdVersionResponseDto> {
    return this.jdVersionService.create(createJdVersionDto, req.user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findAll(
    @Query('companyJobVariantId') companyJobVariantId?: string,
  ): Promise<JdVersionResponseDto[]> {
    if (companyJobVariantId) {
      return this.jdVersionService.findByCompanyJobVariant(companyJobVariantId);
    }
    return this.jdVersionService.findAll();
  }

  @Get('latest')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findLatest(
    @Query('companyJobVariantId') companyJobVariantId: string,
  ): Promise<JdVersionResponseDto> {
    if (!companyJobVariantId) {
      throw new Error('companyJobVariantId query parameter is required');
    }
    return this.jdVersionService.findLatestByCompanyJobVariant(
      companyJobVariantId,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JdVersionResponseDto> {
    return this.jdVersionService.findOne(id);
  }

  @Get(':id/published-content')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async getPublishedContent(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ content: string }> {
    const jdVersion = await this.jdVersionService.findOne(id);
    return { content: jdVersion.publishedContent || '' };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateJdVersionDto: UpdateJdVersionDto,
  ): Promise<JdVersionResponseDto> {
    return this.jdVersionService.update(id, updateJdVersionDto);
  }

  @Patch(':id/regenerate-description')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async regenerateDescription(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JdVersionResponseDto> {
    return this.jdVersionService.regenerateJobDescription(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.jdVersionService.remove(id);
  }
}
