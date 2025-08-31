import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateApplicationNoteDto {
  @IsString()
  applicationId: string;

  @IsString()
  note: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = true;
}
