import { PartialType } from '@nestjs/mapped-types';
import { CreateJobFamilyDto } from './create-job-family.dto';

export class UpdateJobFamilyDto extends PartialType(CreateJobFamilyDto) {}
