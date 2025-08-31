import {
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
  IsObject,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ComposeFromTemplateDto {
  @ApiProperty({ description: 'Email template ID' })
  @IsUUID()
  templateId: string;

  @ApiPropertyOptional({
    description: 'Recipient email address (overrides candidate email)',
  })
  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @ApiPropertyOptional({ description: 'Candidate ID for merge fields' })
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @ApiPropertyOptional({ description: 'Application ID for merge fields' })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({ description: 'Company profile ID for merge fields' })
  @IsOptional()
  @IsUUID()
  companyProfileId?: string;

  @ApiPropertyOptional({ description: 'Custom merge fields' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}

export class ComposeCustomEmailDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
  to: string;

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

  @ApiPropertyOptional({ description: 'CC email addresses' })
  @IsOptional()
  @IsString()
  cc?: string;

  @ApiPropertyOptional({ description: 'BCC email addresses' })
  @IsOptional()
  @IsString()
  bcc?: string;

  @ApiPropertyOptional({ description: 'Candidate ID for merge fields' })
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @ApiPropertyOptional({ description: 'Application ID for merge fields' })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({ description: 'Company profile ID for merge fields' })
  @IsOptional()
  @IsUUID()
  companyProfileId?: string;

  @ApiPropertyOptional({ description: 'Custom merge fields' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}
