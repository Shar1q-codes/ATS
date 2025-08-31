import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsNotEmpty,
  IsArray,
} from 'class-validator';
import { ImportType } from '../../entities/import-job.entity';

export class CreateImportDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsEnum(ImportType)
  type: ImportType;

  @IsOptional()
  @IsObject()
  fieldMapping?: Record<string, string>;

  @IsOptional()
  @IsString()
  fieldMappingId?: string;
}

export class ImportPreviewDto {
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsEnum(ImportType)
  type: ImportType;

  @IsOptional()
  @IsObject()
  fieldMapping?: Record<string, string>;
}

export class FieldMappingDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ImportType)
  type: ImportType;

  @IsObject()
  mapping: Record<string, string>;

  @IsOptional()
  @IsObject()
  transformations?: Record<
    string,
    {
      type: 'date' | 'number' | 'boolean' | 'string' | 'array';
      format?: string;
      defaultValue?: any;
      required?: boolean;
    }
  >;

  @IsOptional()
  isDefault?: boolean;
}

export class BulkCandidateImportDto {
  @IsArray()
  candidates: Array<{
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    source?: string;
    skills?: string[];
    experience?: number;
  }>;

  @IsOptional()
  @IsString()
  source?: string;
}
