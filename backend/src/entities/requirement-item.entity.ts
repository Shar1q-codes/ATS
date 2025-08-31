import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { JobFamily } from './job-family.entity';
import { JobTemplate } from './job-template.entity';
import { CompanyJobVariant } from './company-job-variant.entity';

export enum RequirementType {
  SKILL = 'skill',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  CERTIFICATION = 'certification',
  OTHER = 'other',
}

export enum RequirementCategory {
  MUST = 'must',
  SHOULD = 'should',
  NICE = 'nice',
}

@Entity('requirement_items')
export class RequirementItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: RequirementType,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(RequirementType)
  type?: RequirementType;

  @Column({
    type: 'enum',
    enum: RequirementCategory,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(RequirementCategory)
  category?: RequirementCategory;

  @Column('text')
  @IsString()
  @IsNotEmpty()
  description: string;

  @Column({ default: 5 })
  @IsNumber()
  @Min(1)
  @Max(10)
  weight: number;

  @Column('text', { array: true, nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternatives?: string[];

  @Column({ name: 'job_family_id', nullable: true })
  @IsOptional()
  jobFamilyId?: string;

  @Column({ name: 'job_template_id', nullable: true })
  @IsOptional()
  jobTemplateId?: string;

  @Column({ name: 'company_job_variant_id', nullable: true })
  @IsOptional()
  companyJobVariantId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => JobFamily, (jobFamily) => jobFamily.baseRequirements, {
    nullable: true,
  })
  @JoinColumn({ name: 'job_family_id' })
  jobFamily?: JobFamily;

  @ManyToOne(() => JobTemplate, (template) => template.requirements, {
    nullable: true,
  })
  @JoinColumn({ name: 'job_template_id' })
  jobTemplate?: JobTemplate;

  @ManyToOne(() => CompanyJobVariant, (variant) => variant.requirements, {
    nullable: true,
  })
  @JoinColumn({ name: 'company_job_variant_id' })
  companyJobVariant?: CompanyJobVariant;
}
