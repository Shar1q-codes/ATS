import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
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
import { UserRole } from '../../entities/user.entity';
import {
  EmailCompositionService,
  MergeFieldData,
} from '../services/email-composition.service';
import { CandidateService } from '../../candidates/services/candidate.service';
import { ApplicationService } from '../../applications/services/application.service';
import { CompanyProfileService } from '../../jobs/services/company-profile.service';
import {
  ComposeFromTemplateDto,
  ComposeCustomEmailDto,
  ComposedEmailResponseDto,
  MergeFieldsResponseDto,
  ValidateMergeFieldsResponseDto,
} from '../dto';

@ApiTags('Email Composition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('email/compose')
export class EmailCompositionController {
  constructor(
    private emailCompositionService: EmailCompositionService,
    private candidateService: CandidateService,
    private applicationService: ApplicationService,
    private companyProfileService: CompanyProfileService,
  ) {}

  @Post('from-template')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Compose email from template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email composed successfully',
    type: ComposedEmailResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async composeFromTemplate(
    @Body() dto: ComposeFromTemplateDto,
    @Request() req,
  ): Promise<ComposedEmailResponseDto> {
    const mergeData: MergeFieldData = {
      user: req.user,
      customFields: dto.customFields,
    };

    // Load related entities for merge fields
    if (dto.candidateId) {
      mergeData.candidate = await this.candidateService.findOne(
        dto.candidateId,
      );
    }

    if (dto.applicationId) {
      mergeData.application = await this.applicationService.findOne(
        dto.applicationId,
      );
      // If application is loaded but candidate isn't, load candidate from application
      if (!mergeData.candidate && mergeData.application?.candidateId) {
        mergeData.candidate = await this.candidateService.findOne(
          mergeData.application.candidateId,
        );
      }
    }

    if (dto.companyProfileId) {
      mergeData.company = await this.companyProfileService.findOne(
        dto.companyProfileId,
      );
    }

    const composedEmail =
      await this.emailCompositionService.composeFromTemplate(
        dto.templateId,
        mergeData,
        dto.recipientEmail,
      );

    return composedEmail;
  }

  @Post('custom')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Compose custom email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email composed successfully',
    type: ComposedEmailResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async composeCustomEmail(
    @Body() dto: ComposeCustomEmailDto,
    @Request() req,
  ): Promise<ComposedEmailResponseDto> {
    const mergeData: MergeFieldData = {
      user: req.user,
      customFields: dto.customFields,
    };

    // Load related entities for merge fields
    if (dto.candidateId) {
      mergeData.candidate = await this.candidateService.findOne(
        dto.candidateId,
      );
    }

    if (dto.applicationId) {
      mergeData.application = await this.applicationService.findOne(
        dto.applicationId,
      );
      // If application is loaded but candidate isn't, load candidate from application
      if (!mergeData.candidate && mergeData.application?.candidateId) {
        mergeData.candidate = await this.candidateService.findOne(
          mergeData.application.candidateId,
        );
      }
    }

    if (dto.companyProfileId) {
      mergeData.company = await this.companyProfileService.findOne(
        dto.companyProfileId,
      );
    }

    const composedEmail = await this.emailCompositionService.composeCustomEmail(
      dto.to,
      dto.subject,
      dto.htmlContent,
      dto.textContent,
      mergeData,
    );

    return {
      ...composedEmail,
      cc: dto.cc,
      bcc: dto.bcc,
    };
  }

  @Get('merge-fields')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Get available merge fields' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available merge fields retrieved',
    type: MergeFieldsResponseDto,
  })
  async getMergeFields(): Promise<MergeFieldsResponseDto> {
    const fields = this.emailCompositionService.getAvailableMergeFields();
    return { fields };
  }

  @Post('validate-merge-fields')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Validate merge fields in content' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Merge fields validation result',
    type: ValidateMergeFieldsResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async validateMergeFields(
    @Body() body: { content: string },
  ): Promise<ValidateMergeFieldsResponseDto> {
    const result = this.emailCompositionService.validateMergeFields(
      body.content,
    );
    return result;
  }
}
