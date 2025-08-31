import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CompanySize,
  WorkArrangement,
  CompanyPreferences,
} from '../../entities/company-profile.entity';

export class CreateCompanyProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsEnum(CompanySize)
  size?: CompanySize;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  culture?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsEnum(WorkArrangement)
  workArrangement?: WorkArrangement;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyPreferences)
  preferences?: CompanyPreferences;
}
