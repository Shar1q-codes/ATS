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
import { Organization } from './organization.entity';

export interface SearchFilters {
  skills?: string[];
  experience?: {
    min?: number;
    max?: number;
  };
  location?: string[];
  education?: string[];
  jobTypes?: string[];
  salaryRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

@Entity('saved_searches')
export class SavedSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  query: string;

  @Column({ type: 'jsonb' })
  filters: SearchFilters;

  @Column({ type: 'varchar', length: 50 })
  searchType: 'candidates' | 'jobs' | 'applications' | 'all';

  @Column({ default: false })
  isShared: boolean;

  @Column({ type: 'uuid', array: true, default: [] })
  sharedWith: string[];

  @Column({ default: 0 })
  usageCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  organization: Organization;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
