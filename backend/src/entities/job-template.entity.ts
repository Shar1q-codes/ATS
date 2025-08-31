import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsPositive,
} from 'class-validator';
import { JobFamily } from './job-family.entity';
import { RequirementItem } from './requirement-item.entity';
import { CompanyJobVariant } from './company-job-variant.entity';

export enum JobLevel {
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
  PRINCIPAL = 'principal',
}

@Entity('job_templates')
export class JobTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_family_id' })
  jobFamilyId: string;

  @Column()
  @IsString()
  name: string;

  @Column({
    type: 'enum',
    enum: JobLevel,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(JobLevel)
  level?: JobLevel;

  @Column({ name: 'experience_range_min', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceRangeMin?: number;

  @Column({ name: 'experience_range_max', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceRangeMax?: number;

  @Column({ name: 'salary_range_min', nullable: true })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  salaryRangeMin?: number;

  @Column({ name: 'salary_range_max', nullable: true })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  salaryRangeMax?: number;

  @Column({ name: 'salary_currency', default: 'USD' })
  @IsOptional()
  @IsString()
  salaryCurrency: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => JobFamily, (jobFamily) => jobFamily.jobTemplates)
  @JoinColumn({ name: 'job_family_id' })
  jobFamily: JobFamily;

  @OneToMany(() => RequirementItem, (requirement) => requirement.jobTemplate)
  requirements: RequirementItem[];

  @OneToMany(() => CompanyJobVariant, (variant) => variant.jobTemplate)
  companyJobVariants: CompanyJobVariant[];
}
