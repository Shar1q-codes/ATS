import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsArray,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Candidate } from './candidate.entity';

export class Skill {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  proficiency?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;
}

export class WorkExperience {
  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];
}

export class Education {
  @IsString()
  @IsNotEmpty()
  institution: string;

  @IsString()
  @IsNotEmpty()
  degree: string;

  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;

  @IsOptional()
  @IsString()
  gpa?: string;
}

export class Certification {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  issuer: string;

  @IsOptional()
  issueDate?: Date;

  @IsOptional()
  expirationDate?: Date;

  @IsOptional()
  @IsString()
  credentialId?: string;

  @IsOptional()
  @IsString()
  credentialUrl?: string;
}

@Entity('parsed_resume_data')
export class ParsedResumeData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'candidate_id' })
  candidateId: string;

  @Column('jsonb', { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Skill)
  skills?: Skill[];

  @Column('jsonb', { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkExperience)
  experience?: WorkExperience[];

  @Column('jsonb', { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Education)
  education?: Education[];

  @Column('jsonb', { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Certification)
  certifications?: Certification[];

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  summary?: string;

  @Column({ name: 'raw_text', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  rawText?: string;

  @Column('decimal', {
    name: 'parsing_confidence',
    precision: 3,
    scale: 2,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  parsingConfidence?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToOne(() => Candidate, (candidate) => candidate.parsedData)
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;
}
