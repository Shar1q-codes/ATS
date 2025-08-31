import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyJobVariant } from './company-job-variant.entity';
import { User } from './user.entity';
import { CompanyProfile } from './company-profile.entity';
import { RequirementItem } from './requirement-item.entity';

export class ResolvedJobSpec {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @ValidateNested({ each: true })
  @Type(() => RequirementItem)
  requirements: RequirementItem[];

  @ValidateNested()
  @Type(() => CompanyProfile)
  company: CompanyProfile;

  @IsOptional()
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };

  @IsOptional()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsString()
  workArrangement?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

@Entity('jd_versions')
export class JdVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_job_variant_id' })
  companyJobVariantId: string;

  @Column({ default: 1 })
  @IsNumber()
  version: number;

  @Column('jsonb', { name: 'resolved_spec' })
  @ValidateNested()
  @Type(() => ResolvedJobSpec)
  resolvedSpec: ResolvedJobSpec;

  @Column({ name: 'published_content', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  publishedContent?: string;

  @Column({ name: 'created_by' })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => CompanyJobVariant, (variant) => variant.jdVersions)
  @JoinColumn({ name: 'company_job_variant_id' })
  companyJobVariant: CompanyJobVariant;

  @ManyToOne(() => User, (user) => user.jdVersions)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}
