import { PartialType } from '@nestjs/mapped-types';
import { CreateJdVersionDto } from './create-jd-version.dto';

export class UpdateJdVersionDto extends PartialType(CreateJdVersionDto) {}
