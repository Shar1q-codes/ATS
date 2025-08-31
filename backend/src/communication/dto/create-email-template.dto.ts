import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { EmailTemplateType, EmailTemplateStatus } from '../../entities';

export class CreateEmailTemplateDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEnum(EmailTemplateType)
  type: EmailTemplateType;

  @IsString()
  @MaxLength(500)
  subject: string;

  @IsString()
  htmlContent: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsEnum(EmailTemplateStatus)
  status?: EmailTemplateStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mergeFields?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  companyProfileId?: string;
}
