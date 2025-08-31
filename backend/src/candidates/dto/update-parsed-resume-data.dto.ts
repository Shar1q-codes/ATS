import { PartialType } from '@nestjs/mapped-types';
import { CreateParsedResumeDataDto } from './create-parsed-resume-data.dto';

export class UpdateParsedResumeDataDto extends PartialType(
  CreateParsedResumeDataDto,
) {}
