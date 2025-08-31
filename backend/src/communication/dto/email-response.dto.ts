import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmailStatus } from '../../entities/email-log.entity';

export class ComposedEmailResponseDto {
  @ApiProperty({ description: 'Recipient email address' })
  to: string;

  @ApiPropertyOptional({ description: 'CC email addresses' })
  cc?: string;

  @ApiPropertyOptional({ description: 'BCC email addresses' })
  bcc?: string;

  @ApiProperty({ description: 'Email subject' })
  subject: string;

  @ApiProperty({ description: 'HTML content' })
  htmlContent: string;

  @ApiPropertyOptional({ description: 'Plain text content' })
  textContent?: string;

  @ApiPropertyOptional({ description: 'Template ID used' })
  templateId?: string;
}

export class SendEmailResponseDto {
  @ApiProperty({ description: 'Email log ID' })
  id: string;

  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  message?: string;
}

export class BulkEmailResponseDto {
  @ApiProperty({ description: 'Array of email log IDs' })
  emailIds: string[];

  @ApiProperty({ description: 'Total number of emails queued' })
  totalQueued: number;

  @ApiProperty({ description: 'Success status' })
  success: boolean;
}

export class EmailDeliveryStatusResponseDto {
  @ApiProperty({ description: 'Email log ID' })
  id: string;

  @ApiProperty({ description: 'Current status', enum: EmailStatus })
  status: EmailStatus;

  @ApiPropertyOptional({ description: 'Sent timestamp' })
  sentAt?: Date;

  @ApiPropertyOptional({ description: 'Delivered timestamp' })
  deliveredAt?: Date;

  @ApiPropertyOptional({ description: 'Opened timestamp' })
  openedAt?: Date;

  @ApiPropertyOptional({ description: 'Clicked timestamp' })
  clickedAt?: Date;

  @ApiPropertyOptional({ description: 'Bounced timestamp' })
  bouncedAt?: Date;

  @ApiPropertyOptional({ description: 'Error message' })
  errorMessage?: string;
}

export class EmailHistoryResponseDto {
  @ApiProperty({ description: 'Array of email logs' })
  emails: any[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current page limit' })
  limit: number;

  @ApiProperty({ description: 'Current page offset' })
  offset: number;
}

export class MergeFieldsResponseDto {
  @ApiProperty({ description: 'Available merge fields by category' })
  fields: Record<string, string[]>;
}

export class ValidateMergeFieldsResponseDto {
  @ApiProperty({ description: 'Whether all merge fields are valid' })
  valid: boolean;

  @ApiPropertyOptional({ description: 'Array of invalid merge fields' })
  invalidFields?: string[];
}
