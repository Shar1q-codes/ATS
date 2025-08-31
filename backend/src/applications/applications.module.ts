import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import {
  Application,
  MatchExplanation,
  ApplicationNote,
  StageHistoryEntry,
  Candidate,
  CompanyJobVariant,
} from '../entities';
import { MatchingModule } from '../matching/matching.module';
import { ApplicationService } from './services/application.service';
import { ApplicationNoteService } from './services/application-note.service';
import { StageHistoryService } from './services/stage-history.service';
import { ApplicationController } from './controllers/application.controller';
import { ApplicationNoteController } from './controllers/application-note.controller';
import { StageHistoryController } from './controllers/stage-history.controller';
import { MatchingProcessor } from './processors/matching.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      MatchExplanation,
      ApplicationNote,
      StageHistoryEntry,
      Candidate,
      CompanyJobVariant,
    ]),
    BullModule.registerQueue({
      name: 'matching',
    }),
    MatchingModule,
  ],
  controllers: [
    ApplicationController,
    ApplicationNoteController,
    StageHistoryController,
  ],
  providers: [
    ApplicationService,
    ApplicationNoteService,
    StageHistoryService,
    MatchingProcessor,
  ],
  exports: [
    TypeOrmModule,
    ApplicationService,
    ApplicationNoteService,
    StageHistoryService,
  ],
})
export class ApplicationsModule {}
