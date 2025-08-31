import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../src/entities/user.entity';

export enum OrganizationType {
  STARTUP = 'startup',
  SMB = 'smb',
  AGENCY = 'agency',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

@Entity('organizations')
export class TestOrganization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  domain?: string;

  @Column({
    type: 'enum',
    enum: OrganizationType,
    default: OrganizationType.SMB,
  })
  type: OrganizationType;

  @Column({
    name: 'subscription_plan',
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  subscriptionPlan: SubscriptionPlan;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl?: string;

  @Column({ name: 'primary_color', nullable: true })
  primaryColor?: string;

  @Column({ name: 'secondary_color', nullable: true })
  secondaryColor?: string;

  @Column('simple-json', { nullable: true })
  settings?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Only include the User relationship for testing
  @OneToMany(() => User, (user) => user.organization)
  users: User[];
}
