import {
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
  IsObject,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
  to: string;

  @ApiPropertyOptional({ description: 'CC email addresses' })
  @IsOptional()
  @IsString()
  cc?: string;

  @ApiPropertyOptional({ description: 'BCC email addresses' })
  @IsOptional()
  @IsString()
  bcc?: string;

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'HTML content' })
  @IsString()
  htmlContent: string;

  @ApiPropertyOptional({ description: 'Plain text content' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'Email template ID' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Candidate ID' })
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @ApiPropertyOptional({ description: 'Application ID' })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Email priority',
    enum: ['low', 'normal', 'high'],
  })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high'])
  priority?: 'low' | 'normal' | 'high';

  @ApiPropertyOptional({ description: 'Schedule email for later sending' })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

export class BulkEmailDto {
  @ApiProperty({ description: 'Array of emails to send', type: [SendEmailDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SendEmailDto)
  emails: SendEmailDto[];

  @ApiPropertyOptional({
    description: 'Batch size for processing',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  batchSize?: number;

  @ApiPropertyOptional({
    description: 'Delay between batches in milliseconds',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  delayBetweenBatches?: number;

  @ApiPropertyOptional({
    description: 'Priority for all emails',
    enum: ['low', 'normal', 'high'],
  })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high'])
  priority?: 'low' | 'normal' | 'high';
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({
    description: 'Email delivery status',
    enum: [
      'pending',
      'sent',
      'delivered',
      'opened',
      'clicked',
      'bounced',
      'failed',
    ],
  })
  @IsEnum([
    'pending',
    'sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'failed',
  ])
  status: string;

  @ApiPropertyOptional({ description: 'Timestamp of status update' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({
    description: 'Error message for failed/bounced emails',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
