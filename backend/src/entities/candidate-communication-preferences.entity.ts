import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Candidate } from './candidate.entity';

export enum CommunicationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PHONE = 'phone',
}

export enum CommunicationFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never',
}

@Entity('candidate_communication_preferences')
export class CandidateCommunicationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  candidateId: string;

  @OneToOne(() => Candidate)
  @JoinColumn({ name: 'candidateId' })
  candidate: Candidate;

  @Column({ type: 'boolean', default: true })
  emailEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  smsEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  phoneEnabled: boolean;

  @Column({
    type: 'enum',
    enum: CommunicationFrequency,
    default: CommunicationFrequency.IMMEDIATE,
  })
  applicationUpdatesFrequency: CommunicationFrequency;

  @Column({
    type: 'enum',
    enum: CommunicationFrequency,
    default: CommunicationFrequency.WEEKLY,
  })
  marketingFrequency: CommunicationFrequency;

  @Column({
    type: 'enum',
    enum: CommunicationFrequency,
    default: CommunicationFrequency.IMMEDIATE,
  })
  interviewRemindersFrequency: CommunicationFrequency;

  @Column({ type: 'boolean', default: false })
  optedOut: boolean;

  @Column({ type: 'timestamp', nullable: true })
  optedOutAt?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  optOutReason?: string;

  @Column({ type: 'simple-array', nullable: true })
  preferredTimes?: string[]; // e.g., ['09:00-12:00', '14:00-17:00']

  @Column({ type: 'varchar', length: 10, nullable: true })
  timezone?: string; // e.g., 'UTC', 'EST', 'PST'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
