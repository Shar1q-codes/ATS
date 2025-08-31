import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PipelineStage } from '../../entities/application.entity';

export class ApplicationFilterDto {
  @IsOptional()
  @IsEnum(PipelineStage)
  status?: PipelineStage;

  @IsOptional()
  @IsString()
  candidateId?: string;

  @IsOptional()
  @IsString()
  companyJobVariantId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minFitScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  maxFitScore?: number;
}
