import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateJdVersionDto {
  @IsUUID()
  companyJobVariantId: string;

  @IsOptional()
  @IsString()
  customDescription?: string;

  @IsOptional()
  @IsString()
  customTitle?: string;
}
