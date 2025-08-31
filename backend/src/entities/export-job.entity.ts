import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsNotEmpty,
  IsArray,
} from 'class-validator';
import { Organization } from './organization.entity';

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ExportType {
  CANDIDATES = 'candidates',
  JOBS = 'jobs',
  APPLICATIONS = 'applications',
  COMPANIES = 'companies',
  FULL_BACKUP = 'full_backup',
}

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
  XML = 'xml',
}

@Entity('export_jobs')
export class ExportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Column({
    type: 'enum',
    enum: ExportType,
  })
  @IsEnum(ExportType)
  type: ExportType;

  @Column({
    type: 'enum',
    enum: ExportFormat,
  })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @Column({
    type: 'enum',
    enum: ExportStatus,
    default: ExportStatus.PENDING,
  })
  @IsEnum(ExportStatus)
  status: ExportStatus;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @Column('text', { array: true, nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedFields?: string[];

  @Column({ name: 'file_url', nullable: true })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @Column({ name: 'file_size', nullable: true })
  @IsOptional()
  fileSize?: number;

  @Column({ name: 'record_count', nullable: true })
  @IsOptional()
  recordCount?: number;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @Column({ name: 'created_by' })
  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @Column({ name: 'organization_id' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'started_at', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt?: Date;

  // Relations
  @ManyToOne(() => Organization, (organization) => organization.exportJobs)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
