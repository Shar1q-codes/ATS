import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { CompanyJobVariant } from './company-job-variant.entity';

export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise',
}

export enum WorkArrangement {
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  ONSITE = 'onsite',
}

export class CompanyPreferences {
  @IsArray()
  @IsString({ each: true })
  prioritySkills: string[];

  @IsArray()
  @IsString({ each: true })
  dealBreakers: string[];

  @IsArray()
  @IsString({ each: true })
  niceToHave: string[];
}

@Entity('company_profiles')
export class CompanyProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  industry?: string;

  @Column({
    type: 'enum',
    enum: CompanySize,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(CompanySize)
  size?: CompanySize;

  @Column('text', { array: true, nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  culture?: string[];

  @Column('text', { array: true, nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @Column({
    name: 'work_arrangement',
    type: 'enum',
    enum: WorkArrangement,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(WorkArrangement)
  workArrangement?: WorkArrangement;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  location?: string;

  @Column('jsonb', { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyPreferences)
  preferences?: CompanyPreferences;

  @Column({ name: 'organization_id' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, (organization) => organization.companies)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToMany(() => CompanyJobVariant, (variant) => variant.companyProfile)
  jobVariants: CompanyJobVariant[];
}
