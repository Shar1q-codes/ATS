import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('diversity_metrics')
@Index(['companyId', 'jobVariantId', 'dateRange'])
@Index(['dateRange'])
export class DiversityMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'job_variant_id', nullable: true })
  jobVariantId?: string;

  @Column({ name: 'date_range' })
  dateRange: string; // Format: YYYY-MM-DD

  @Column({ name: 'total_applicants', default: 0 })
  totalApplicants: number;

  @Column({ name: 'gender_distribution', type: 'jsonb', nullable: true })
  genderDistribution?: {
    male: number;
    female: number;
    nonBinary: number;
    preferNotToSay: number;
    unknown: number;
  };

  @Column({ name: 'ethnicity_distribution', type: 'jsonb', nullable: true })
  ethnicityDistribution?: Record<string, number>;

  @Column({ name: 'age_distribution', type: 'jsonb', nullable: true })
  ageDistribution?: {
    under25: number;
    '25-34': number;
    '35-44': number;
    '45-54': number;
    over55: number;
    unknown: number;
  };

  @Column({ name: 'education_distribution', type: 'jsonb', nullable: true })
  educationDistribution?: {
    highSchool: number;
    bachelors: number;
    masters: number;
    phd: number;
    other: number;
    unknown: number;
  };

  @Column({ name: 'hired_diversity', type: 'jsonb', nullable: true })
  hiredDiversity?: {
    gender: Record<string, number>;
    ethnicity: Record<string, number>;
    age: Record<string, number>;
    education: Record<string, number>;
  };

  @Column({ name: 'bias_indicators', type: 'jsonb', nullable: true })
  biasIndicators?: {
    genderBias: number; // -1 to 1, where 0 is no bias
    ethnicityBias: number;
    ageBias: number;
    educationBias: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
