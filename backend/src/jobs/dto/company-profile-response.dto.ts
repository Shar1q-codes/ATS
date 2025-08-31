import {
  CompanySize,
  WorkArrangement,
  CompanyPreferences,
} from '../../entities/company-profile.entity';

export class CompanyProfileResponseDto {
  id: string;
  name: string;
  industry?: string;
  size?: CompanySize;
  culture?: string[];
  benefits?: string[];
  workArrangement?: WorkArrangement;
  location?: string;
  preferences?: CompanyPreferences;
  createdAt: Date;
  updatedAt: Date;
}
