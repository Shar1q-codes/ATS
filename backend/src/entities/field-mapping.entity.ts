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
  IsBoolean,
} from 'class-validator';
import { Organization } from './organization.entity';

@Entity('field_mappings')
export class FieldMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Column()
  @IsString()
  type: string;

  @Column({ type: 'jsonb' })
  @IsObject()
  mapping: Record<string, string>; // source field -> target field

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  transformations?: Record<
    string,
    {
      type: 'date' | 'number' | 'boolean' | 'string' | 'array';
      format?: string;
      defaultValue?: any;
      required?: boolean;
    }
  >;

  @Column({ name: 'is_default', default: false })
  @IsBoolean()
  isDefault: boolean;

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

  // Relations
  @ManyToOne(() => Organization, (organization) => organization.fieldMappings)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
