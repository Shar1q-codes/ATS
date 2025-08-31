import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities';
import { EmailTemplateService } from '../services/email-template.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTemplateResponseDto,
} from '../dto';
import { BaseController } from '../../common/base/base.controller';

@ApiTags('Email Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('email-templates')
export class EmailTemplateController extends BaseController {
  constructor(private readonly emailTemplateService: EmailTemplateService) {
    super();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Create a new email template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Email template created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Template with same name and type already exists',
  })
  async create(
    @Body() createEmailTemplateDto: CreateEmailTemplateDto,
    @Request() req: any,
  ) {
    const template = await this.emailTemplateService.create(
      createEmailTemplateDto,
      req.user.id,
    );
    return this.successResponse(
      template,
      'Email template created successfully',
    );
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Get all email templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email templates retrieved successfully',
  })
  async findAll(
    @Query('companyProfileId') companyProfileId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    let templates;

    if (type) {
      templates = await this.emailTemplateService.findByType(
        type as any,
        companyProfileId,
      );
    } else if (companyProfileId) {
      templates =
        await this.emailTemplateService.findByCompany(companyProfileId);
    } else {
      templates = await this.emailTemplateService.findAll({
        relations: ['companyProfile', 'creator', 'updater'],
        order: { type: 'ASC', createdAt: 'DESC' },
      });
    }

    return this.successResponse(
      templates,
      'Email templates retrieved successfully',
    );
  }

  @Get('global')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Get global email templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Global email templates retrieved successfully',
  })
  async findGlobalTemplates() {
    const templates = await this.emailTemplateService.findGlobalTemplates();
    return this.successResponse(
      templates,
      'Global email templates retrieved successfully',
    );
  }

  @Get('merge-fields')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Get available merge fields for email templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Merge fields retrieved successfully',
  })
  async getAvailableMergeFields() {
    const mergeFields =
      await this.emailTemplateService.getAvailableMergeFields();
    return this.successResponse(
      mergeFields,
      'Merge fields retrieved successfully',
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Get email template by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email template retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Email template not found',
  })
  async findOne(@Param('id') id: string) {
    const template = await this.emailTemplateService.findById(id, {
      relations: ['companyProfile', 'creator', 'updater'],
    });
    return this.successResponse(
      template,
      'Email template retrieved successfully',
    );
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Update email template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email template updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Email template not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Template with same name and type already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateEmailTemplateDto: UpdateEmailTemplateDto,
    @Request() req: any,
  ) {
    const template = await this.emailTemplateService.update(
      id,
      updateEmailTemplateDto,
      req.user.id,
    );
    return this.successResponse(
      template,
      'Email template updated successfully',
    );
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Activate email template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email template activated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Email template not found',
  })
  async activate(@Param('id') id: string, @Request() req: any) {
    const template = await this.emailTemplateService.activate(id, req.user.id);
    return this.successResponse(
      template,
      'Email template activated successfully',
    );
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Deactivate email template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email template deactivated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Email template not found',
  })
  async deactivate(@Param('id') id: string, @Request() req: any) {
    const template = await this.emailTemplateService.deactivate(
      id,
      req.user.id,
    );
    return this.successResponse(
      template,
      'Email template deactivated successfully',
    );
  }

  @Post(':id/duplicate')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Duplicate email template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Email template duplicated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Email template not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Template with new name already exists',
  })
  async duplicate(
    @Param('id') id: string,
    @Body('name') newName: string,
    @Request() req: any,
  ) {
    const template = await this.emailTemplateService.duplicate(
      id,
      newName,
      req.user.id,
    );
    return this.successResponse(
      template,
      'Email template duplicated successfully',
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Delete email template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email template deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Email template not found',
  })
  async remove(@Param('id') id: string) {
    await this.emailTemplateService.delete(id);
    return this.successResponse(null, 'Email template deleted successfully');
  }
}
