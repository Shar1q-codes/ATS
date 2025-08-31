import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyJobVariantDto } from './create-company-job-variant.dto';

export class UpdateCompanyJobVariantDto extends PartialType(
  CreateCompanyJobVariantDto,
) {}
