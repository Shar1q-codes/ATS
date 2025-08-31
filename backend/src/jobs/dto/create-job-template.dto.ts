import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsPositive,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobLevel } from '../../entities/job-template.entity';
import { CreateRequirementItemDto } from './create-requirement-item.dto';

export class CreateJobTemplateDto {
  @IsUUID()
  jobFamilyId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(JobLevel)
  level?: JobLevel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceRangeMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceRangeMax?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  salaryRangeMin?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  salaryRangeMax?: number;

  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequirementItemDto)
  requirements?: CreateRequirementItemDto[];
}
