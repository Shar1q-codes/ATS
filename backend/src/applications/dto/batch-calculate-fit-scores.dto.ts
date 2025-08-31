import { IsString, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';

export class BatchCalculateFitScoresDto {
  @IsString()
  jobVariantId: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  candidateIds?: string[];
}
