import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Application } from './application.entity';
import { ApplicationNote } from './application-note.entity';

export enum NotificationType {
  APPLICATION_STAGE_CHANGE = 'application_stage_change',
  MENTION = 'mention',
  APPLICATION_NOTE = 'application_note',
  SYSTEM = 'system',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('notifications')
@Index(['recipientId', 'tenantId'])
@Index(['recipientId', 'isRead'])
@Index(['type', 'tenantId'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ name: 'sender_id', nullable: true })
  senderId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sender_id' })
  sender?: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column('jsonb', { nullable: true })
  data?: Record<string, any>;

  @Column({ name: 'application_id', nullable: true })
  applicationId?: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application?: Application;

  @Column({ name: 'application_note_id', nullable: true })
  applicationNoteId?: string;

  @ManyToOne(() => ApplicationNote, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_note_id' })
  applicationNote?: ApplicationNote;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', nullable: true })
  readAt?: Date;

  @Column({ name: 'email_sent', default: false })
  emailSent: boolean;

  @Column({ name: 'email_sent_at', nullable: true })
  emailSentAt?: Date;

  @Column({ name: 'action_url', nullable: true })
  actionUrl?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt?: Date;
}
