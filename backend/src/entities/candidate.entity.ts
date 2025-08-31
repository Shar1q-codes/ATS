import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUrl,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { ParsedResumeData } from './parsed-resume-data.entity';
import { Application } from './application.entity';
import { Organization } from './organization.entity';

@Entity('candidates')
export class Candidate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column({ name: 'first_name' })
  @IsString()
  firstName: string;

  @Column({ name: 'last_name' })
  @IsString()
  lastName: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  location?: string;

  @Column({ name: 'linkedin_url', nullable: true })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @Column({ name: 'portfolio_url', nullable: true })
  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;

  @Column({ name: 'resume_url', nullable: true })
  @IsOptional()
  @IsUrl()
  resumeUrl?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  source?: string; // e.g., 'linkedin', 'indeed', 'referral', 'company_website'

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  gender?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  ethnicity?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsNumber()
  age?: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  education?: string;

  @Column('simple-array', { name: 'skill_embeddings', nullable: true })
  @IsOptional()
  skillEmbeddings?: number[];

  @Column({ name: 'total_experience', default: 0 })
  @IsNumber()
  @Min(0)
  totalExperience: number;

  @Column({ name: 'consent_given', default: false })
  @IsBoolean()
  consentGiven: boolean;

  @Column({ name: 'consent_date', nullable: true })
  @IsOptional()
  consentDate?: Date;

  @Column({ name: 'organization_id' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, (organization) => organization.candidates)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToOne(() => ParsedResumeData, (parsedData) => parsedData.candidate)
  parsedData: ParsedResumeData;

  @OneToMany(() => Application, (application) => application.candidate)
  applications: Application[];
}
