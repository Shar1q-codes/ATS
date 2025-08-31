import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsString, IsBoolean, IsArray } from 'class-validator';
import { Application } from './application.entity';
import { User } from './user.entity';

@Entity('application_notes')
@Index(['applicationId', 'tenantId'])
export class ApplicationNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({ name: 'author_id' })
  authorId: string;

  @Column('text')
  @IsString()
  content: string;

  // Legacy field for backward compatibility
  @Column('text', { nullable: true })
  @IsString()
  note?: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ name: 'is_internal', default: true })
  @IsBoolean()
  isInternal: boolean;

  @Column('jsonb', { default: [] })
  @IsArray()
  mentions: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Application, (application) => application.notes)
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @ManyToOne(() => User, (user) => user.applicationNotes)
  @JoinColumn({ name: 'author_id' })
  author: User;

  // Legacy relation for backward compatibility
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
