import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
  Unique,
} from 'typeorm';
import { IsEnum, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { Candidate } from './candidate.entity';
import { CompanyJobVariant } from './company-job-variant.entity';
import { MatchExplanation } from './match-explanation.entity';
import { ApplicationNote } from './application-note.entity';
import { StageHistoryEntry } from './stage-history-entry.entity';

export enum PipelineStage {
  APPLIED = 'applied',
  SCREENING = 'screening',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  OFFER_EXTENDED = 'offer_extended',
  OFFER_ACCEPTED = 'offer_accepted',
  HIRED = 'hired',
  REJECTED = 'rejected',
}

@Entity('applications')
@Unique(['candidateId', 'companyJobVariantId'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'candidate_id' })
  candidateId: string;

  @Column({ name: 'company_job_variant_id' })
  companyJobVariantId: string;

  @Column({
    type: 'enum',
    enum: PipelineStage,
    default: PipelineStage.APPLIED,
  })
  @IsEnum(PipelineStage)
  status: PipelineStage;

  @Column({ name: 'fit_score', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fitScore?: number;

  @CreateDateColumn({ name: 'applied_at' })
  appliedAt: Date;

  @UpdateDateColumn({ name: 'last_updated' })
  lastUpdated: Date;

  // Relations
  @ManyToOne(() => Candidate, (candidate) => candidate.applications)
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;

  @ManyToOne(() => CompanyJobVariant, (variant) => variant.applications)
  @JoinColumn({ name: 'company_job_variant_id' })
  companyJobVariant: CompanyJobVariant;

  @OneToOne(() => MatchExplanation, (explanation) => explanation.application)
  matchExplanation: MatchExplanation;

  @OneToMany(() => ApplicationNote, (note) => note.application)
  notes: ApplicationNote[];

  @OneToMany(() => StageHistoryEntry, (entry) => entry.application)
  stageHistory: StageHistoryEntry[];
}
