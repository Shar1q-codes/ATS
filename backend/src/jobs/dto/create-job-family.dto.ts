import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class CreateJobFamilyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillCategories?: string[];
}
