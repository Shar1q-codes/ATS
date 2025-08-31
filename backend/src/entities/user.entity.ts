import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import {
  IsEmail,
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
import { CompanyProfile } from './company-profile.entity';
import { Organization } from './organization.entity';
import { JdVersion } from './jd-version.entity';
import { ApplicationNote } from './application-note.entity';
import { StageHistoryEntry } from './stage-history-entry.entity';

export enum UserRole {
  ADMIN = 'admin',
  RECRUITER = 'recruiter',
  HIRING_MANAGER = 'hiring_manager',
}

@Entity('users')
@Index(['email', 'organizationId'], { unique: true }) // Composite unique index
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: false }) // Remove unique constraint for multi-tenant
  @IsEmail()
  email: string;

  @Column({ name: 'password_hash' })
  @IsString()
  @MinLength(8)
  passwordHash: string;

  @Column({ name: 'first_name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @Column({ name: 'last_name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.RECRUITER,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @Column({ name: 'company_id', nullable: true })
  @IsOptional()
  companyId?: string;

  @Column({ name: 'organization_id' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @Column({ name: 'is_active', default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, (organization) => organization.users)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => CompanyProfile, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: CompanyProfile;

  @OneToMany(() => JdVersion, (jdVersion) => jdVersion.createdBy)
  jdVersions: JdVersion[];

  @OneToMany(() => ApplicationNote, (note) => note.user)
  applicationNotes: ApplicationNote[];

  @OneToMany(() => StageHistoryEntry, (entry) => entry.changedBy)
  stageHistoryEntries: StageHistoryEntry[];
}
