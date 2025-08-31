import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsNumber,
  Min,
  Max,
  IsArray,
  IsString,
  ValidateNested,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Application } from './application.entity';
import { RequirementItem } from './requirement-item.entity';

export class RequirementMatch {
  @ValidateNested()
  @Type(() => RequirementItem)
  requirement: RequirementItem;

  @IsBoolean()
  matched: boolean;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsArray()
  @IsString({ each: true })
  evidence: string[];

  @IsString()
  explanation: string;
}

@Entity('match_explanations')
export class MatchExplanation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({ name: 'overall_score' })
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore: number;

  @Column({ name: 'must_have_score' })
  @IsNumber()
  @Min(0)
  @Max(100)
  mustHaveScore: number;

  @Column({ name: 'should_have_score' })
  @IsNumber()
  @Min(0)
  @Max(100)
  shouldHaveScore: number;

  @Column({ name: 'nice_to_have_score' })
  @IsNumber()
  @Min(0)
  @Max(100)
  niceToHaveScore: number;

  @Column('text', { array: true, nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[];

  @Column('text', { array: true, nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gaps?: string[];

  @Column('text', { array: true, nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendations?: string[];

  @Column('jsonb', { name: 'detailed_analysis', nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RequirementMatch)
  detailedAnalysis?: RequirementMatch[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToOne(() => Application, (application) => application.matchExplanation)
  @JoinColumn({ name: 'application_id' })
  application: Application;
}
