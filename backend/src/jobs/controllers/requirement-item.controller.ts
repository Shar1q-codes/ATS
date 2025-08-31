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
import {
  RequirementType,
  RequirementCategory,
} from '../../entities/requirement-item.entity';
import {
  RequirementItemService,
  RequirementItemResponseDto,
} from '../services/requirement-item.service';
import { CreateRequirementItemDto } from '../dto/create-requirement-item.dto';
import { UpdateRequirementItemDto } from '../dto/update-requirement-item.dto';

@Controller('requirement-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequirementItemController {
  constructor(
    private readonly requirementItemService: RequirementItemService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createRequirementItemDto: CreateRequirementItemDto,
    @Query('parentId') parentId?: string,
    @Query('parentType')
    parentType?: 'job-family' | 'job-template' | 'company-job-variant',
  ): Promise<RequirementItemResponseDto> {
    return this.requirementItemService.create(
      createRequirementItemDto,
      parentId,
      parentType,
    );
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findAll(
    @Query('jobFamilyId') jobFamilyId?: string,
    @Query('jobTemplateId') jobTemplateId?: string,
    @Query('companyJobVariantId') companyJobVariantId?: string,
    @Query('category') category?: RequirementCategory,
    @Query('type') type?: RequirementType,
  ): Promise<RequirementItemResponseDto[]> {
    if (jobFamilyId) {
      return this.requirementItemService.findByJobFamily(jobFamilyId);
    }
    if (jobTemplateId) {
      return this.requirementItemService.findByJobTemplate(jobTemplateId);
    }
    if (companyJobVariantId) {
      return this.requirementItemService.findByCompanyJobVariant(
        companyJobVariantId,
      );
    }
    if (category) {
      return this.requirementItemService.findByCategory(category);
    }
    if (type) {
      return this.requirementItemService.findByType(type);
    }
    return this.requirementItemService.findAll();
  }

  @Get('categorize')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async categorizeRequirements(
    @Query('jobFamilyId') jobFamilyId?: string,
    @Query('jobTemplateId') jobTemplateId?: string,
    @Query('companyJobVariantId') companyJobVariantId?: string,
  ): Promise<{
    must: RequirementItemResponseDto[];
    should: RequirementItemResponseDto[];
    nice: RequirementItemResponseDto[];
  }> {
    let requirements: RequirementItemResponseDto[] = [];

    if (jobFamilyId) {
      requirements =
        await this.requirementItemService.findByJobFamily(jobFamilyId);
    } else if (jobTemplateId) {
      requirements =
        await this.requirementItemService.findByJobTemplate(jobTemplateId);
    } else if (companyJobVariantId) {
      requirements =
        await this.requirementItemService.findByCompanyJobVariant(
          companyJobVariantId,
        );
    } else {
      requirements = await this.requirementItemService.findAll();
    }

    // Convert to RequirementItem entities for categorization
    const requirementEntities = requirements.map((req) => ({
      ...req,
      jobFamily: undefined,
      jobTemplate: undefined,
      companyJobVariant: undefined,
    })) as any[];

    const categorized =
      await this.requirementItemService.categorizeRequirements(
        requirementEntities,
      );

    return {
      must: categorized.must.map((req) =>
        this.requirementItemService['toResponseDto'](req),
      ),
      should: categorized.should.map((req) =>
        this.requirementItemService['toResponseDto'](req),
      ),
      nice: categorized.nice.map((req) =>
        this.requirementItemService['toResponseDto'](req),
      ),
    };
  }

  @Post('validate')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async validateRequirements(
    @Body() requirements: RequirementItemResponseDto[],
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    // Convert to RequirementItem entities for validation
    const requirementEntities = requirements.map((req) => ({
      ...req,
      jobFamily: undefined,
      jobTemplate: undefined,
      companyJobVariant: undefined,
    })) as any[];

    return this.requirementItemService.validateRequirementLogic(
      requirementEntities,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RequirementItemResponseDto> {
    return this.requirementItemService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRequirementItemDto: UpdateRequirementItemDto,
  ): Promise<RequirementItemResponseDto> {
    return this.requirementItemService.update(id, updateRequirementItemDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.requirementItemService.remove(id);
  }
}
