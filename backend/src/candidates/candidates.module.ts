import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidate, ParsedResumeData } from '../entities';
import { CandidateService } from './services/candidate.service';
import { CandidateController } from './controllers/candidate.controller';
import { ParsedResumeDataService } from './services/parsed-resume-data.service';
import { ParsedResumeDataController } from './controllers/parsed-resume-data.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Candidate, ParsedResumeData])],
  controllers: [CandidateController, ParsedResumeDataController],
  providers: [CandidateService, ParsedResumeDataService],
  exports: [TypeOrmModule, CandidateService, ParsedResumeDataService],
})
export class CandidatesModule {}
