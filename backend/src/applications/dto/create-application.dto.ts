import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { PipelineStage } from '../../entities/application.entity';

export class CreateApplicationDto {
  @IsString()
  candidateId: string;

  @IsString()
  companyJobVariantId: string;

  @IsOptional()
  @IsEnum(PipelineStage)
  status?: PipelineStage;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fitScore?: number;
}
