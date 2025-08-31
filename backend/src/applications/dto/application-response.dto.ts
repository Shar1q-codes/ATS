import { PipelineStage } from '../../entities/application.entity';
import { CandidateResponseDto } from '../../candidates/dto/candidate-response.dto';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';
import { MatchExplanation } from '../../entities/match-explanation.entity';
import { ApplicationNote } from '../../entities/application-note.entity';
import { StageHistoryEntry } from '../../entities/stage-history-entry.entity';

export class ApplicationResponseDto {
  id: string;
  candidateId: string;
  companyJobVariantId: string;
  status: PipelineStage;
  fitScore?: number;
  appliedAt: Date;
  lastUpdated: Date;
  candidate?: CandidateResponseDto;
  companyJobVariant?: CompanyJobVariant;
  matchExplanation?: MatchExplanation;
  notes?: ApplicationNote[];
  stageHistory?: StageHistoryEntry[];
}
