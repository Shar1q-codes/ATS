import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import {
  EmailTemplate,
  EmailLog,
  User,
  CompanyProfile,
  Candidate,
  Application,
  CommunicationHistory,
  CandidateCommunicationPreferences,
} from '../entities';
import { EmailService } from './services/email.service';
import { EmailTemplateService } from './services/email-template.service';
import { EmailCompositionService } from './services/email-composition.service';
import { EmailSendingService } from './services/email-sending.service';
import { CommunicationHistoryService } from './services/communication-history.service';
import { CandidateCommunicationPreferencesService } from './services/candidate-communication-preferences.service';
import { AutomatedCommunicationService } from './services/automated-communication.service';
import { EmailTemplateController } from './controllers/email-template.controller';
import { EmailCompositionController } from './controllers/email-composition.controller';
import { EmailSendingController } from './controllers/email-sending.controller';
import { CommunicationHistoryController } from './controllers/communication-history.controller';
import { CandidateCommunicationPreferencesController } from './controllers/candidate-communication-preferences.controller';
import { EmailProcessor } from './processors/email.processor';
import { CandidatesModule } from '../candidates/candidates.module';
import { ApplicationsModule } from '../applications/applications.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmailTemplate,
      EmailLog,
      User,
      CompanyProfile,
      Candidate,
      Application,
      CommunicationHistory,
      CandidateCommunicationPreferences,
    ]),
    BullModule.registerQueue({
      name: 'email',
    }),
    CandidatesModule,
    ApplicationsModule,
    JobsModule,
  ],
  controllers: [
    EmailTemplateController,
    EmailCompositionController,
    EmailSendingController,
    CommunicationHistoryController,
    CandidateCommunicationPreferencesController,
  ],
  providers: [
    EmailService,
    EmailTemplateService,
    EmailCompositionService,
    EmailSendingService,
    CommunicationHistoryService,
    CandidateCommunicationPreferencesService,
    AutomatedCommunicationService,
    EmailProcessor,
  ],
  exports: [
    TypeOrmModule,
    EmailService,
    EmailTemplateService,
    EmailCompositionService,
    EmailSendingService,
    CommunicationHistoryService,
    CandidateCommunicationPreferencesService,
    AutomatedCommunicationService,
  ],
})
export class CommunicationModule {}
