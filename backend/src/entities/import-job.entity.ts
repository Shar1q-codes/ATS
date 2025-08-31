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
  IsNumber,
  IsOptional,
  IsObject,
  IsNotEmpty,
} from 'class-validator';
import { Organization } from './organization.entity';

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ImportType {
  CANDIDATES = 'candidates',
  JOBS = 'jobs',
  APPLICATIONS = 'applications',
  COMPANIES = 'companies',
}

@Entity('import_jobs')
export class ImportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  filename: string;

  @Column({ name: 'file_url' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @Column({
    type: 'enum',
    enum: ImportType,
  })
  @IsEnum(ImportType)
  type: ImportType;

  @Column({
    type: 'enum',
    enum: ImportStatus,
    default: ImportStatus.PENDING,
  })
  @IsEnum(ImportStatus)
  status: ImportStatus;

  @Column({ name: 'total_records', default: 0 })
  @IsNumber()
  totalRecords: number;

  @Column({ name: 'processed_records', default: 0 })
  @IsNumber()
  processedRecords: number;

  @Column({ name: 'successful_records', default: 0 })
  @IsNumber()
  successfulRecords: number;

  @Column({ name: 'failed_records', default: 0 })
  @IsNumber()
  failedRecords: number;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  fieldMapping?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  errors?: Array<{
    row: number;
    field?: string;
    message: string;
    data?: any;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  preview?: Array<Record<string, any>>;

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

  // Relations
  @ManyToOne(() => Organization, (organization) => organization.importJobs)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
