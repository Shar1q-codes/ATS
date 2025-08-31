import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRequirementItemDto } from './create-requirement-item.dto';

export class CreateCompanyJobVariantDto {
  @IsUUID()
  jobTemplateId: string;

  @IsUUID()
  companyProfileId: string;

  @IsOptional()
  @IsString()
  customTitle?: string;

  @IsOptional()
  @IsString()
  customDescription?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequirementItemDto)
  additionalRequirements?: CreateRequirementItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequirementItemDto)
  modifiedRequirements?: CreateRequirementItemDto[];
}
