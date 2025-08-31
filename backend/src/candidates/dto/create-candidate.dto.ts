import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUrl,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateCandidateDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;

  @IsOptional()
  @IsUrl()
  resumeUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalExperience?: number;

  @IsOptional()
  @IsBoolean()
  consentGiven?: boolean;
}
