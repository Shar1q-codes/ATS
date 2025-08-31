import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('pipeline_metrics')
@Index(['companyId', 'jobVariantId', 'dateRange'])
@Index(['dateRange'])
export class PipelineMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'job_variant_id', nullable: true })
  jobVariantId?: string;

  @Column({ name: 'date_range' })
  dateRange: string; // Format: YYYY-MM-DD

  @Column({ name: 'total_applications', default: 0 })
  totalApplications: number;

  @Column({ name: 'applications_screened', default: 0 })
  applicationsScreened: number;

  @Column({ name: 'applications_shortlisted', default: 0 })
  applicationsShortlisted: number;

  @Column({ name: 'interviews_scheduled', default: 0 })
  interviewsScheduled: number;

  @Column({ name: 'interviews_completed', default: 0 })
  interviewsCompleted: number;

  @Column({ name: 'offers_extended', default: 0 })
  offersExtended: number;

  @Column({ name: 'offers_accepted', default: 0 })
  offersAccepted: number;

  @Column({ name: 'candidates_hired', default: 0 })
  candidatesHired: number;

  @Column({ name: 'candidates_rejected', default: 0 })
  candidatesRejected: number;

  @Column({
    name: 'avg_time_to_fill_days',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  avgTimeToFillDays?: number;

  @Column({
    name: 'avg_time_to_screen_days',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  avgTimeToScreenDays?: number;

  @Column({
    name: 'avg_time_to_interview_days',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  avgTimeToInterviewDays?: number;

  @Column({
    name: 'avg_time_to_offer_days',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  avgTimeToOfferDays?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
