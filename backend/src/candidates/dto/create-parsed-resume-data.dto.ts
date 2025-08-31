import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsArray,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Skill,
  WorkExperience,
  Education,
  Certification,
} from '../../entities/parsed-resume-data.entity';

export class CreateParsedResumeDataDto {
  @IsUUID()
  @IsNotEmpty()
  candidateId: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Skill)
  @IsArray()
  skills?: Skill[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkExperience)
  @IsArray()
  experience?: WorkExperience[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Education)
  @IsArray()
  education?: Education[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Certification)
  @IsArray()
  certifications?: Certification[];

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  rawText?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  parsingConfidence?: number;
}
