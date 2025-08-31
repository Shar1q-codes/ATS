import { ResolvedJobSpec } from '../../entities/jd-version.entity';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';
import { User } from '../../entities/user.entity';

export class JdVersionResponseDto {
  id: string;
  companyJobVariantId: string;
  version: number;
  resolvedSpec: ResolvedJobSpec;
  publishedContent?: string;
  createdById: string;
  createdAt: Date;
  companyJobVariant?: CompanyJobVariant;
  createdBy?: User;
}
