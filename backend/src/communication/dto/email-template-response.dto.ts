import { EmailTemplateType, EmailTemplateStatus } from '../../entities';

export class EmailTemplateResponseDto {
  id: string;
  name: string;
  type: EmailTemplateType;
  subject: string;
  htmlContent: string;
  textContent?: string;
  status: EmailTemplateStatus;
  mergeFields?: string[];
  description?: string;
  companyProfileId?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
