import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbeddingService } from './services/embedding.service';
import { VectorStorageService } from './services/vector-storage.service';
import { MatchingService } from './services/matching.service';
import { MatchExplanationService } from './services/match-explanation.service';
import { MatchingController } from './controllers/matching.controller';
import { MatchExplanationController } from './controllers/match-explanation.controller';
import { Candidate } from '../entities/candidate.entity';
import { RequirementItem } from '../entities/requirement-item.entity';
import { CompanyJobVariant } from '../entities/company-job-variant.entity';
import { MatchExplanation } from '../entities/match-explanation.entity';
import { Application } from '../entities/application.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Candidate,
      RequirementItem,
      CompanyJobVariant,
      MatchExplanation,
      Application,
    ]),
  ],
  providers: [
    EmbeddingService,
    VectorStorageService,
    MatchingService,
    MatchExplanationService,
  ],
  controllers: [MatchingController, MatchExplanationController],
  exports: [
    EmbeddingService,
    VectorStorageService,
    MatchingService,
    MatchExplanationService,
  ],
})
export class MatchingModule {}
