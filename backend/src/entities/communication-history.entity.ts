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
import { Application } from './application.entity';

export enum CommunicationType {
  EMAIL = 'email',
  SMS = 'sms',
  PHONE = 'phone',
  IN_PERSON = 'in_person',
  VIDEO_CALL = 'video_call',
  SYSTEM_NOTIFICATION = 'system_notification',
}

export enum CommunicationDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

@Entity('communication_history')
export class CommunicationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: CommunicationType })
  type: CommunicationType;

  @Column({ type: 'enum', enum: CommunicationDirection })
  direction: CommunicationDirection;

  @Column({ type: 'varchar', length: 500 })
  subject: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fromAddress?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  toAddress?: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ type: 'uuid' })
  candidateId: string;

  @ManyToOne(() => Candidate)
  @JoinColumn({ name: 'candidateId' })
  candidate: Candidate;

  @Column({ type: 'uuid', nullable: true })
  applicationId?: string;

  @ManyToOne(() => Application, { nullable: true })
  @JoinColumn({ name: 'applicationId' })
  application?: Application;

  @Column({ type: 'uuid', nullable: true })
  initiatedBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'initiatedBy' })
  initiator?: User;

  @Column({ type: 'uuid', nullable: true })
  emailLogId?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
