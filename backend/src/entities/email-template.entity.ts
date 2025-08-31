import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { CompanyProfile } from './company-profile.entity';

export enum EmailTemplateType {
  APPLICATION_RECEIVED = 'application_received',
  APPLICATION_UNDER_REVIEW = 'application_under_review',
  APPLICATION_SHORTLISTED = 'application_shortlisted',
  APPLICATION_REJECTED = 'application_rejected',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  INTERVIEW_REMINDER = 'interview_reminder',
  OFFER_EXTENDED = 'offer_extended',
  OFFER_ACCEPTED = 'offer_accepted',
  WELCOME = 'welcome',
  CUSTOM = 'custom',
}

export enum EmailTemplateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: EmailTemplateType })
  type: EmailTemplateType;

  @Column({ type: 'varchar', length: 500 })
  subject: string;

  @Column({ type: 'text' })
  htmlContent: string;

  @Column({ type: 'text', nullable: true })
  textContent?: string;

  @Column({
    type: 'enum',
    enum: EmailTemplateStatus,
    default: EmailTemplateStatus.DRAFT,
  })
  status: EmailTemplateStatus;

  @Column({ type: 'json', nullable: true })
  mergeFields?: string[];

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  companyProfileId?: string;

  @ManyToOne(() => CompanyProfile, { nullable: true })
  @JoinColumn({ name: 'companyProfileId' })
  companyProfile?: CompanyProfile;

  @Column({ type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater?: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
