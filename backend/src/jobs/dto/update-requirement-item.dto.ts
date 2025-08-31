import { PartialType } from '@nestjs/mapped-types';
import { CreateRequirementItemDto } from './create-requirement-item.dto';

export class UpdateRequirementItemDto extends PartialType(
  CreateRequirementItemDto,
) {}
