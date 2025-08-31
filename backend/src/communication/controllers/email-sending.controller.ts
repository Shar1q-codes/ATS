import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { EmailSendingService } from '../services/email-sending.service';
import {
  SendEmailDto,
  BulkEmailDto,
  UpdateDeliveryStatusDto,
  SendEmailResponseDto,
  BulkEmailResponseDto,
  EmailDeliveryStatusResponseDto,
  EmailHistoryResponseDto,
} from '../dto';

@ApiTags('Email Sending')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('email')
export class EmailSendingController {
  constructor(private emailSendingService: EmailSendingService) {}

  @Post('send')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Send single email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email queued for sending',
    type: SendEmailResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async sendEmail(
    @Body() dto: SendEmailDto,
    @Request() req,
  ): Promise<SendEmailResponseDto> {
    try {
      const emailLogId = await this.emailSendingService.sendEmail({
        ...dto,
        sentBy: req.user.id,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      });

      return {
        id: emailLogId,
        success: true,
      };
    } catch (error) {
      return {
        id: '',
        success: false,
        message: error.message,
      };
    }
  }

  @Post('send-bulk')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Send bulk emails' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Emails queued for bulk sending',
    type: BulkEmailResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async sendBulkEmails(
    @Body() dto: BulkEmailDto,
    @Request() req,
  ): Promise<BulkEmailResponseDto> {
    try {
      const emailsWithSender = dto.emails.map((email) => ({
        ...email,
        sentBy: req.user.id,
        scheduledFor: email.scheduledFor
          ? new Date(email.scheduledFor)
          : undefined,
      }));

      const emailIds = await this.emailSendingService.sendBulkEmails({
        ...dto,
        emails: emailsWithSender,
      });

      return {
        emailIds,
        totalQueued: emailIds.length,
        success: true,
      };
    } catch (error) {
      return {
        emailIds: [],
        totalQueued: 0,
        success: false,
      };
    }
  }

  @Get(':id/status')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Get email delivery status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email delivery status retrieved',
    type: EmailDeliveryStatusResponseDto,
  })
  async getDeliveryStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EmailDeliveryStatusResponseDto | null> {
    return this.emailSendingService.getDeliveryStatus(id);
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update email delivery status (webhook endpoint)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email delivery status updated',
  })
  @HttpCode(HttpStatus.OK)
  async updateDeliveryStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ): Promise<{ success: boolean }> {
    try {
      await this.emailSendingService.updateDeliveryStatus(
        id,
        dto.status as any,
        dto.timestamp ? new Date(dto.timestamp) : undefined,
        dto.errorMessage,
      );

      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Get email history' })
  @ApiQuery({
    name: 'candidateId',
    required: false,
    description: 'Filter by candidate ID',
  })
  @ApiQuery({
    name: 'applicationId',
    required: false,
    description: 'Filter by application ID',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of records to skip',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email history retrieved',
    type: EmailHistoryResponseDto,
  })
  async getEmailHistory(
    @Query('candidateId') candidateId?: string,
    @Query('applicationId') applicationId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
    @Query('offset', new ParseIntPipe({ optional: true })) offset = 0,
  ): Promise<EmailHistoryResponseDto> {
    const result = await this.emailSendingService.getEmailHistory(
      candidateId,
      applicationId,
      limit,
      offset,
    );

    return {
      ...result,
      limit,
      offset,
    };
  }

  @Post(':id/retry')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @ApiOperation({ summary: 'Retry failed email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email queued for retry',
  })
  @HttpCode(HttpStatus.OK)
  async retryFailedEmail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      await this.emailSendingService.retryFailedEmail(id);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
