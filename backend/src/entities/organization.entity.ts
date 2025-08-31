import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsUrl,
} from 'class-validator';
import { User } from './user.entity';
import { CompanyProfile } from './company-profile.entity';
import { JobFamily } from './job-family.entity';
import { Candidate } from './candidate.entity';
import { ImportJob } from './import-job.entity';
import { ExportJob } from './export-job.entity';
import { FieldMapping } from './field-mapping.entity';

export enum OrganizationType {
  STARTUP = 'startup',
  SMB = 'smb',
  AGENCY = 'agency',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  domain?: string;

  @Column({
    type: 'enum',
    enum: OrganizationType,
    default: OrganizationType.SMB,
  })
  @IsEnum(OrganizationType)
  type: OrganizationType;

  @Column({
    name: 'subscription_plan',
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  @IsEnum(SubscriptionPlan)
  subscriptionPlan: SubscriptionPlan;

  @Column({ name: 'is_active', default: true })
  @IsBoolean()
  isActive: boolean;

  @Column({ name: 'logo_url', nullable: true })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @Column({ name: 'primary_color', nullable: true })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @Column({ name: 'secondary_color', nullable: true })
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @Column('jsonb', { nullable: true })
  @IsOptional()
  settings?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => CompanyProfile, (company) => company.organization)
  companies: CompanyProfile[];

  @OneToMany(() => JobFamily, (jobFamily) => jobFamily.organization)
  jobFamilies: JobFamily[];

  @OneToMany(() => Candidate, (candidate) => candidate.organization)
  candidates: Candidate[];

  @OneToMany(() => ImportJob, (importJob) => importJob.organization)
  importJobs: ImportJob[];

  @OneToMany(() => ExportJob, (exportJob) => exportJob.organization)
  exportJobs: ExportJob[];

  @OneToMany(() => FieldMapping, (fieldMapping) => fieldMapping.organization)
  fieldMappings: FieldMapping[];
}
