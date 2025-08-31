import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PipelineStage } from '../../entities/application.entity';

export class StageTransitionDto {
  @IsEnum(PipelineStage)
  toStage: PipelineStage;

  @IsOptional()
  @IsString()
  notes?: string;
}
