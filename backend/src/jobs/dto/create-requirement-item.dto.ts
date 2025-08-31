import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import {
  RequirementType,
  RequirementCategory,
} from '../../entities/requirement-item.entity';

export class CreateRequirementItemDto {
  @IsOptional()
  @IsEnum(RequirementType)
  type?: RequirementType;

  @IsOptional()
  @IsEnum(RequirementCategory)
  category?: RequirementCategory;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  weight?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternatives?: string[];
}
