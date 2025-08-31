import { RequirementItem } from '../../entities/requirement-item.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';

export class ResolvedJobSpecDto {
  title: string;
  description: string;
  requirements: RequirementItem[];
  company: CompanyProfile;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  benefits: string[];
  workArrangement: string;
  location: string;
}
