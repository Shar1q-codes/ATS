import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Application } from './application.entity';
import { User } from './user.entity';

@Entity('stage_history')
export class StageHistoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({
    name: 'from_stage',
    type: 'varchar',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  fromStage?: string;

  @Column({
    name: 'to_stage',
    type: 'varchar',
  })
  @IsString()
  toStage: string;

  @Column({ name: 'changed_by' })
  changedById: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Column({ default: false })
  @IsBoolean()
  automated: boolean;

  // Relations
  @ManyToOne(() => Application, (application) => application.stageHistory)
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @ManyToOne(() => User, (user) => user.stageHistoryEntries)
  @JoinColumn({ name: 'changed_by' })
  changedBy: User;
}
