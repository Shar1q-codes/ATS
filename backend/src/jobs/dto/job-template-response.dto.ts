import { JobLevel } from '../../entities/job-template.entity';
import { RequirementItem } from '../../entities/requirement-item.entity';
import { JobFamily } from '../../entities/job-family.entity';

export class JobTemplateResponseDto {
  id: string;
  jobFamilyId: string;
  name: string;
  level?: JobLevel;
  experienceRangeMin?: number;
  experienceRangeMax?: number;
  salaryRangeMin?: number;
  salaryRangeMax?: number;
  salaryCurrency: string;
  createdAt: Date;
  updatedAt: Date;
  jobFamily?: JobFamily;
  requirements?: RequirementItem[];
}
