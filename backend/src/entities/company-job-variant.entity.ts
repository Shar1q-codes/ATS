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
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { JobTemplate } from './job-template.entity';
import { CompanyProfile } from './company-profile.entity';
import { RequirementItem } from './requirement-item.entity';
import { JdVersion } from './jd-version.entity';
import { Application } from './application.entity';

@Entity('company_job_variants')
export class CompanyJobVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_template_id' })
  jobTemplateId: string;

  @Column({ name: 'company_profile_id' })
  companyProfileId: string;

  @Column({ name: 'custom_title', nullable: true })
  @IsOptional()
  @IsString()
  customTitle?: string;

  @Column({ name: 'custom_description', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  customDescription?: string;

  @Column({ name: 'is_active', default: true })
  @IsBoolean()
  isActive: boolean;

  @Column({ name: 'published_at', nullable: true })
  @IsOptional()
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => JobTemplate, (template) => template.companyJobVariants)
  @JoinColumn({ name: 'job_template_id' })
  jobTemplate: JobTemplate;

  @ManyToOne(() => CompanyProfile, (profile) => profile.jobVariants)
  @JoinColumn({ name: 'company_profile_id' })
  companyProfile: CompanyProfile;

  @OneToMany(
    () => RequirementItem,
    (requirement) => requirement.companyJobVariant,
  )
  requirements: RequirementItem[];

  @OneToMany(() => JdVersion, (version) => version.companyJobVariant)
  jdVersions: JdVersion[];

  @OneToMany(() => Application, (application) => application.companyJobVariant)
  applications: Application[];
}
