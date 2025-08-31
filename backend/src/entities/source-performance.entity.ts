import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('source_performance')
@Index(['companyId', 'source', 'dateRange'])
@Index(['dateRange'])
export class SourcePerformance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column()
  source: string; // e.g., 'linkedin', 'indeed', 'referral', 'company_website'

  @Column({ name: 'date_range' })
  dateRange: string; // Format: YYYY-MM-DD

  @Column({ name: 'total_candidates', default: 0 })
  totalCandidates: number;

  @Column({ name: 'qualified_candidates', default: 0 })
  qualifiedCandidates: number;

  @Column({ name: 'interviewed_candidates', default: 0 })
  interviewedCandidates: number;

  @Column({ name: 'hired_candidates', default: 0 })
  hiredCandidates: number;

  @Column({
    name: 'conversion_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  conversionRate: number; // Percentage

  @Column({
    name: 'quality_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  qualityScore?: number; // Average fit score of candidates from this source

  @Column({
    name: 'cost_per_hire',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  costPerHire?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
