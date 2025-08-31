import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsNotEmpty,
  IsArray,
} from 'class-validator';
import { ExportType, ExportFormat } from '../../entities/export-job.entity';

export class CreateExportDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ExportType)
  type: ExportType;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedFields?: string[];
}

export class ExportFiltersDto {
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  statuses?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class MigrationConfigDto {
  @IsString()
  @IsNotEmpty()
  sourceSystem: string; // 'greenhouse', 'lever', 'workday', etc.

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsOptional()
  @IsString()
  apiUrl?: string;

  @IsOptional()
  @IsObject()
  additionalConfig?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  dataTypes: string[]; // ['candidates', 'jobs', 'applications']
}
