import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicationNoteDto } from './create-application-note.dto';

export class UpdateApplicationNoteDto extends PartialType(
  CreateApplicationNoteDto,
) {}
