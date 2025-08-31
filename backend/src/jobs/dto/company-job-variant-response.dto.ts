import { JobTemplate } from '../../entities/job-template.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';
import { RequirementItem } from '../../entities/requirement-item.entity';

export class CompanyJobVariantResponseDto {
  id: string;
  jobTemplateId: string;
  companyProfileId: string;
  customTitle?: string;
  customDescription?: string;
  isActive: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  jobTemplate?: JobTemplate;
  companyProfile?: CompanyProfile;
  requirements?: RequirementItem[];
}
