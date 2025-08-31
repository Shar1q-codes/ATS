import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  JobFamily,
  JobTemplate,
  CompanyProfile,
  CompanyJobVariant,
  RequirementItem,
  JdVersion,
  User,
} from '../entities';
import { JobFamilyService } from './services/job-family.service';
import { JobFamilyController } from './controllers/job-family.controller';
import { JobTemplateService } from './services/job-template.service';
import { JobTemplateController } from './controllers/job-template.controller';
import { CompanyProfileService } from './services/company-profile.service';
import { CompanyProfileController } from './controllers/company-profile.controller';
import { CompanyJobVariantService } from './services/company-job-variant.service';
import { CompanyJobVariantController } from './controllers/company-job-variant.controller';
import { RequirementItemService } from './services/requirement-item.service';
import { RequirementItemController } from './controllers/requirement-item.controller';
import { JdVersionService } from './services/jd-version.service';
import { JdVersionController } from './controllers/jd-version.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobFamily,
      JobTemplate,
      CompanyProfile,
      CompanyJobVariant,
      RequirementItem,
      JdVersion,
      User,
    ]),
  ],
  controllers: [
    JobFamilyController,
    JobTemplateController,
    CompanyProfileController,
    CompanyJobVariantController,
    RequirementItemController,
    JdVersionController,
  ],
  providers: [
    JobFamilyService,
    JobTemplateService,
    CompanyProfileService,
    CompanyJobVariantService,
    RequirementItemService,
    JdVersionService,
  ],
  exports: [
    TypeOrmModule,
    JobFamilyService,
    JobTemplateService,
    CompanyProfileService,
    CompanyJobVariantService,
    RequirementItemService,
    JdVersionService,
  ],
})
export class JobsModule {}
