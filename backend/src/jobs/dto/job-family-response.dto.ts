import { RequirementItem } from '../../entities/requirement-item.entity';

export class JobFamilyResponseDto {
  id: string;
  name: string;
  description?: string;
  skillCategories?: string[];
  createdAt: Date;
  updatedAt: Date;
  baseRequirements?: RequirementItem[];
}
