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
import { Candidate } from './candidate.entity';
import { EmailTemplate } from './email-template.entity';
import { Application } from './application.entity';

export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed',
}

@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  to: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cc?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bcc?: string;

  @Column({ type: 'varchar', length: 500 })
  subject: string;

  @Column({ type: 'text' })
  htmlContent: string;

  @Column({ type: 'text', nullable: true })
  textContent?: string;

  @Column({ type: 'enum', enum: EmailStatus, default: EmailStatus.PENDING })
  status: EmailStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId?: string; // ID from email service provider

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  openedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  bouncedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  emailTemplateId?: string;

  @ManyToOne(() => EmailTemplate, { nullable: true })
  @JoinColumn({ name: 'emailTemplateId' })
  emailTemplate?: EmailTemplate;

  @Column({ type: 'uuid', nullable: true })
  candidateId?: string;

  @ManyToOne(() => Candidate, { nullable: true })
  @JoinColumn({ name: 'candidateId' })
  candidate?: Candidate;

  @Column({ type: 'uuid', nullable: true })
  applicationId?: string;

  @ManyToOne(() => Application, { nullable: true })
  @JoinColumn({ name: 'applicationId' })
  application?: Application;

  @Column({ type: 'uuid' })
  sentBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sentBy' })
  sender: User;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
