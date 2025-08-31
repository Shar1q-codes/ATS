import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';
import { JobTemplate } from './job-template.entity';
import { RequirementItem } from './requirement-item.entity';
import { Organization } from './organization.entity';

@Entity('job_families')
export class JobFamily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  name: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Column('text', { name: 'skill_categories', array: true, nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillCategories?: string[];

  @Column({ name: 'organization_id' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, (organization) => organization.jobFamilies)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => JobTemplate, (template) => template.jobFamily)
  jobTemplates: JobTemplate[];

  @OneToMany(() => RequirementItem, (requirement) => requirement.jobFamily)
  baseRequirements: RequirementItem[];
}
