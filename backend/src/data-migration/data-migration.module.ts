import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ImportController } from './controllers/import.controller';
import { ExportController } from './controllers/export.controller';
import { MigrationController } from './controllers/migration.controller';
import { ImportService } from './services/import.service';
import { ExportService } from './services/export.service';
import { ValidationService } from './services/validation.service';
import { MappingService } from './services/mapping.service';
import { MigrationService } from './services/migration.service';
import { BackupService } from './services/backup.service';
import { ImportJob } from '../entities/import-job.entity';
import { ExportJob } from '../entities/export-job.entity';
import { FieldMapping } from '../entities/field-mapping.entity';
import { Organization } from '../entities/organization.entity';
import { Candidate } from '../entities/candidate.entity';
import { JobFamily } from '../entities/job-family.entity';
import { Application } from '../entities/application.entity';
import { CompanyProfile } from '../entities/company-profile.entity';
import { JobTemplate } from '../entities/job-template.entity';
import { ParsedResumeData } from '../entities/parsed-resume-data.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      ImportJob,
      ExportJob,
      FieldMapping,
      Organization,
      Candidate,
      JobFamily,
      Application,
      CompanyProfile,
      JobTemplate,
      ParsedResumeData,
    ]),
  ],
  controllers: [ImportController, ExportController, MigrationController],
  providers: [
    ImportService,
    ExportService,
    ValidationService,
    MappingService,
    MigrationService,
    BackupService,
  ],
  exports: [ImportService, ExportService, MigrationService, BackupService],
})
export class DataMigrationModule {}
